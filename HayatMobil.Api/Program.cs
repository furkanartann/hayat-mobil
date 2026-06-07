using HayatMobil.Api.Data;
using HayatMobil.Api.Infrastructure;

Console.Title = "HAYAT-MOBIL | Web API";

try
{
    Console.WriteLine("HAYAT-MOBIL başlatılıyor...");

    await DatabaseInitializer.EnsureInitializedAsync();

    if (!await DbContext.TestConnectionAsync())
    {
        Console.WriteLine("[Hata] SQLite veritabanına bağlanılamadı. Dosya izinlerini kontrol edin.");
        return;
    }

    _ = Task.Run(async () =>
    {
        while (true)
        {
            await Task.Delay(30000);
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await SensorAnomalyMonitor.RunCheckAsync(conn);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SensorAnomaly Hata] {ex.Message}");
            }
        }
    });

    Console.WriteLine("HAYAT-MOBIL Web API: http://localhost:5000");
    WebApiHost.Start(args);
}
catch (Exception ex)
{
    Console.WriteLine($"[Kritik Hata] Web API başlatılamadı: {ex.Message}");
}
