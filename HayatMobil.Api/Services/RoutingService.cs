using System.Globalization;
using System.Text.Json;

namespace HayatMobil.Api.Services;

/// <summary>OSRM ucretsiz yol rotasi (demo sunucu). Basarisiz olursa kus uçusu yedek.</summary>
public static class RoutingService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(12) };

    public sealed record RouteStep(
        string Instruction,
        double DistanceMeters,
        string? StreetName,
        string? ManeuverType = null,
        string? ManeuverModifier = null);

    public sealed record RouteSnapshot(
        double DistanceMeters,
        double DurationSeconds,
        List<double[]> Coordinates,
        string Profile,
        bool Fallback,
        List<RouteStep> Steps);

    public static async Task<RouteSnapshot> FetchRouteAsync(
        double fromLat, double fromLng, double toLat, double toLng,
        string profile = "driving",
        CancellationToken ct = default)
    {
        profile = profile is "driving" or "foot" or "bike" ? profile : "driving";

        var osrm = await TryOsrmAsync(fromLat, fromLng, toLat, toLng, profile, ct);
        if (osrm is not null)
            return osrm;

        return BuildStraightLineFallback(fromLat, fromLng, toLat, toLng, profile);
    }

    private static async Task<RouteSnapshot?> TryOsrmAsync(
        double fromLat, double fromLng, double toLat, double toLng,
        string profile, CancellationToken ct)
    {
        try
        {
            var fromLngStr = fromLng.ToString(CultureInfo.InvariantCulture);
            var fromLatStr = fromLat.ToString(CultureInfo.InvariantCulture);
            var toLngStr = toLng.ToString(CultureInfo.InvariantCulture);
            var toLatStr = toLat.ToString(CultureInfo.InvariantCulture);
            var coordPath = $"{fromLngStr},{fromLatStr};{toLngStr},{toLatStr}";
            var url =
                $"https://router.project-osrm.org/route/v1/{profile}/{coordPath}" +
                "?overview=full&geometries=geojson&alternatives=false&steps=true";

            using var response = await Http.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            if (!doc.RootElement.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
                return null;

            var route = routes[0];
            var distance = route.GetProperty("distance").GetDouble();
            var duration = route.GetProperty("duration").GetDouble();

            var coordinates = new List<double[]>();
            if (route.TryGetProperty("geometry", out var geometry) &&
                geometry.TryGetProperty("coordinates", out var coordsEl))
            {
                foreach (var point in coordsEl.EnumerateArray())
                {
                    var lng = point[0].GetDouble();
                    var lat = point[1].GetDouble();
                    coordinates.Add([lat, lng]);
                }
            }

            if (coordinates.Count < 2)
                return null;

            var steps = ParseSteps(route);

            return new RouteSnapshot(distance, duration, coordinates, profile, Fallback: false, steps);
        }
        catch
        {
            return null;
        }
    }

    private static List<RouteStep> ParseSteps(JsonElement route)
    {
        var raw = new List<RouteStep>();

        if (!route.TryGetProperty("legs", out var legs))
            return raw;

        foreach (var leg in legs.EnumerateArray())
        {
            if (!leg.TryGetProperty("steps", out var stepsEl))
                continue;

            foreach (var step in stepsEl.EnumerateArray())
            {
                var dist = step.TryGetProperty("distance", out var d) ? d.GetDouble() : 0;
                string? name = step.TryGetProperty("name", out var n) ? n.GetString() : null;
                if (string.IsNullOrWhiteSpace(name))
                    name = null;

                var instruction = "Devam et";
                string? maneuverType = null;
                string? maneuverModifier = null;
                if (step.TryGetProperty("maneuver", out var man))
                {
                    maneuverType = man.TryGetProperty("type", out var t) ? t.GetString() : null;
                    maneuverModifier = man.TryGetProperty("modifier", out var m) ? m.GetString() : null;
                    instruction = BuildInstruction(maneuverType ?? "", maneuverModifier);
                }

                if (instruction == "Varış")
                    continue;

                raw.Add(new RouteStep(instruction, dist, name, maneuverType, maneuverModifier));
            }
        }

        if (raw.Count == 0)
            return raw;

        if (raw[0].Instruction == "Yola çık" || raw[0].Instruction == "Devam et")
            raw[0] = raw[0] with { Instruction = "Yola çık" };

        return raw.Take(14).ToList();
    }

    private static string BuildInstruction(string type, string? modifier)
    {
        if (type == "arrive")
            return "Varış";

        if (type == "depart")
            return "Yola çık";

        if (type is "roundabout" or "rotary")
            return "Dönel kavşaktan devam et";

        if (type == "merge")
            return "Yola birleş";

        if (type == "fork")
            return modifier switch
            {
                "left" => "Çatalda sola",
                "right" => "Çatalda sağa",
                _ => "Çatalda devam et"
            };

        if (type is "turn" or "end of road" or "continue")
        {
            return modifier switch
            {
                "right" => "Sağa dön",
                "slight right" => "Hafif sağa",
                "sharp right" => "Keskin sağa",
                "left" => "Sola dön",
                "slight left" => "Hafif sola",
                "sharp left" => "Keskin sola",
                "straight" or "uturn" => "Düz devam et",
                _ => "Devam et"
            };
        }

        if (type == "new name")
            return "Yola devam et";

        return "Devam et";
    }

    private static RouteSnapshot BuildStraightLineFallback(
        double fromLat, double fromLng, double toLat, double toLng, string profile)
    {
        var distance = HaversineMeters(fromLat, fromLng, toLat, toLng);
        var speedKmh = profile == "foot" ? 4.5 : 28;
        var duration = distance / (speedKmh * 1000 / 3600);

        return new RouteSnapshot(
            distance,
            duration,
            [[fromLat, fromLng], [toLat, toLng]],
            profile,
            Fallback: true,
            [new RouteStep("Hedefe doğru ilerle", distance, null, "depart", null)]);
    }

    private static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371000;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
