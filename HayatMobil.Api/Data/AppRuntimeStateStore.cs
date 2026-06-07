using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

/// <summary>Tek satirlik AppRuntimeState tablosu — sebeke/hava metrikleri DB uzerinden.</summary>
public static class AppRuntimeStateStore
{
    public sealed record State(int NetworkQuality, int WeatherTemp, string WeatherCondition, string WeatherRisk);

    public static async Task<State> LoadAsync(SqliteConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "SELECT NetworkQuality, WeatherTemp, WeatherCondition, WeatherRisk FROM AppRuntimeState WHERE SingletonId = 1";
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return new State(100, 4, "Parcali Bulutlu", "Normal");
        return new State(
            Convert.ToInt32(r["NetworkQuality"]),
            Convert.ToInt32(r["WeatherTemp"]),
            r["WeatherCondition"].ToString()!,
            r["WeatherRisk"].ToString()!);
    }
}
