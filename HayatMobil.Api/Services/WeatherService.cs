using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace HayatMobil.Api.Services;

/// <summary>Open-Meteo ucretsiz hava durumu (API anahtari gerekmez).</summary>
public static class WeatherService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };
    private static readonly ConcurrentDictionary<string, (DateTime FetchedAt, WeatherSnapshot Data)> Cache = new();
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    public sealed record WeatherSnapshot(int WeatherTemp, string WeatherCondition, string WeatherRisk);

    public static async Task<WeatherSnapshot?> FetchCurrentAsync(double latitude, double longitude, CancellationToken ct = default)
    {
        latitude = Math.Round(latitude, 2);
        longitude = Math.Round(longitude, 2);
        var key = $"{latitude.ToString(CultureInfo.InvariantCulture)},{longitude.ToString(CultureInfo.InvariantCulture)}";

        if (Cache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.FetchedAt < CacheTtl)
            return cached.Data;

        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lng = longitude.ToString(CultureInfo.InvariantCulture);
        var url =
            $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}" +
            "&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=1";

        using var response = await Http.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
            return null;

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("current", out var current))
            return null;

        var temp = (int)Math.Round(current.GetProperty("temperature_2m").GetDouble());
        var code = current.GetProperty("weather_code").GetInt32();
        var windKmh = current.TryGetProperty("wind_speed_10m", out var windEl) ? windEl.GetDouble() : 0d;

        var snapshot = new WeatherSnapshot(temp, MapCondition(code), MapRisk(code, windKmh));
        Cache[key] = (DateTime.UtcNow, snapshot);
        return snapshot;
    }

    private static string MapCondition(int wmoCode) => wmoCode switch
    {
        0 => "Acik Hava",
        1 => "Az Bulutlu",
        2 => "Parcali Bulutlu",
        3 => "Kapali",
        45 or 48 => "Yogun Sis",
        51 or 53 or 55 => "Cisenti",
        56 or 57 => "Donan Cisenti",
        61 => "Hafif Yagmur",
        63 => "Yagmur",
        65 => "Siddetli Yagmur",
        66 or 67 => "Donan Yagmur",
        71 => "Hafif Kar",
        73 => "Kar Yagisi",
        75 => "Siddetli Kar",
        77 => "Kar Taneleri",
        80 => "Sagank Yagmur",
        81 => "Sagank Yagmur",
        82 => "Siddetli Sagank",
        85 => "Kar Saganagi",
        86 => "Siddetli Kar Saganagi",
        95 => "Firtina",
        96 or 99 => "Dolu Firtinasi",
        _ => "Parcali Bulutlu"
    };

    private static string MapRisk(int wmoCode, double windKmh)
    {
        if (wmoCode is 95 or 96 or 99 or 82 or 86 or 65 or 75)
            return "Yuksek";
        if (wmoCode is 63 or 73 or 81 or 85 or 48 or 45 or 67)
            return windKmh >= 50 ? "Yuksek" : "Dusuk";
        if (windKmh >= 60)
            return "Firtina Uyari";
        return "Normal";
    }
}
