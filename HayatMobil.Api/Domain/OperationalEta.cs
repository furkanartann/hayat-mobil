namespace HayatMobil.Api.Domain;

/// <summary>
/// Koordinat veya OSRM yokken kullanilan yedek sureler (dk). Normal akista DispatchEtaService hesaplar.
/// </summary>
public static class OperationalEta
{
    /// <summary>Bir saha kilidinin kac dakika sonra "takili kaldi" sayilip otomatik silinecegi.</summary>
    public const int StaleFieldDutyLockMinutes = 120;

    /// <summary>Acil yardim bileti triyaj renklerine gore tahmini saha donusu.</summary>
    public static int MinutesForTriage(string? triageColor) => triageColor switch
    {
        "Red" => 45,
        "Yellow" => 30,
        "Green" => 20,
        "Black" => 60,
        _ => 25
    };

    public static int MinutesForFieldDuty(string crisisType) => crisisType switch
    {
        "Sensor" => 20,
        "Unit" => 35,
        "Missing" => 50,
        _ => 30
    };
}
