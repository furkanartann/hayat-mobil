using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace HayatMobil.Api.Services;

/// <summary>OpenStreetMap Nominatim ile ters geokodlama (semt/mahalle adi).</summary>
public static class GeocodingService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(8) };
    private static readonly ConcurrentDictionary<string, (DateTime FetchedAt, string? Label)> Cache = new();
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    static GeocodingService()
    {
        Http.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "HayatMobil-Api/2.0 (school-project)");
    }

    public static async Task<string?> ReverseLabelAsync(double latitude, double longitude, CancellationToken ct = default)
    {
        latitude = Math.Round(latitude, 3);
        longitude = Math.Round(longitude, 3);
        var key = $"{latitude.ToString(CultureInfo.InvariantCulture)},{longitude.ToString(CultureInfo.InvariantCulture)}";

        if (Cache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.FetchedAt < CacheTtl)
            return cached.Label;

        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lng = longitude.ToString(CultureInfo.InvariantCulture);
        var url =
            $"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=14&accept-language=tr";

        string? label = null;
        try
        {
            using var response = await Http.GetAsync(url, ct);
            if (response.IsSuccessStatusCode)
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                if (doc.RootElement.TryGetProperty("address", out var address))
                    label = PickLocalityLabel(address);
            }
        }
        catch
        {
            // sessiz — hava durumu konumsuz da gosterilebilir
        }

        Cache[key] = (DateTime.UtcNow, label);
        return label;
    }

    private static string? PickLocalityLabel(JsonElement address)
    {
        ReadOnlySpan<string> keys =
        [
            "suburb", "neighbourhood", "quarter", "city_district",
            "town", "village", "municipality", "county", "state"
        ];

        foreach (var key in keys)
        {
            if (address.TryGetProperty(key, out var el))
            {
                var text = el.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(text))
                    return text;
            }
        }

        return null;
    }
}
