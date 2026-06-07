using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

/// <summary>
/// Gercek sensor okumalarini izler; esik asildiginda AI tespiti ve uyari olusturur.
/// Otomatik personel atamasi yapmaz — PM panelden atar.
/// </summary>
public static class SensorAnomalyMonitor
{
    private static readonly TimeSpan Cooldown = TimeSpan.FromMinutes(15);

    public static async Task RunCheckAsync(SqliteConnection conn)
    {
        var anomalies = new List<(int unitId, string sensorType, double value, string detectionType, string alertTitle, string alertMsg)>();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT s.SensorID, s.UnitID, s.SensorType, s.CurrentValue, u.SerialNumber
                FROM Sensors s
                JOIN Units u ON u.UnitID = s.UnitID
                WHERE s.Status = 'Online' AND s.CurrentValue IS NOT NULL";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var sensorType = r["SensorType"].ToString() ?? "";
                var value = Convert.ToDouble(r["CurrentValue"]);
                var unitId = Convert.ToInt32(r["UnitID"]);
                var serial = r["SerialNumber"].ToString() ?? $"U{unitId}";

                (string detectionType, string alertTitle, string alertMsg)? hit = sensorType switch
                {
                    "Isi" when value >= 60 => ("Fire", "Yuksek Isi Algilandi", $"{serial}: sicaklik {value:F1} esigi asti."),
                    "Duman" when value >= 50 => ("Smoke", "Duman Algilandi", $"{serial}: duman seviyesi {value:F1}."),
                    "Gaz" when value >= 100 => ("Structural_Damage", "Tehlikeli Gaz Seviyesi", $"{serial}: gaz {value:F1} ppm."),
                    "Sismik" when value >= 5 => ("Structural_Damage", "Sismik Aktivite", $"{serial}: sismik deger {value:F1}."),
                    _ => null
                };
                if (hit is not null)
                    anomalies.Add((unitId, sensorType, value, hit.Value.detectionType, hit.Value.alertTitle, hit.Value.alertMsg));
            }
        }

        foreach (var a in anomalies)
        {
            if (await RecentlyAlertedAsync(conn, a.unitId, a.detectionType))
                continue;

            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                double? lat = null, lng = null;
                await using (var u = conn.CreateCommand())
                {
                    u.Transaction = (SqliteTransaction)tx;
                    u.CommandText = "SELECT Latitude, Longitude FROM Units WHERE UnitID = @id";
                    u.Parameters.AddWithValue("@id", a.unitId);
                    await using var ur = await u.ExecuteReaderAsync();
                    if (await ur.ReadAsync())
                    {
                        if (ur["Latitude"] != DBNull.Value) lat = Convert.ToDouble(ur["Latitude"]);
                        if (ur["Longitude"] != DBNull.Value) lng = Convert.ToDouble(ur["Longitude"]);
                    }
                }

                await using (var ins = conn.CreateCommand())
                {
                    ins.Transaction = (SqliteTransaction)tx;
                    ins.CommandText = @"
                        INSERT INTO AiDetections (UnitID, CameraID, DetectionType, PersonCount, ImmobilePersonCount,
                            PersonFound, ConfidenceScore, Latitude, Longitude)
                        VALUES (@uid, @cam, @type, 0, 0, 0, @conf, @lat, @lng)";
                    ins.Parameters.AddWithValue("@uid", a.unitId);
                    ins.Parameters.AddWithValue("@cam", $"SENSOR-{a.sensorType}");
                    ins.Parameters.AddWithValue("@type", a.detectionType);
                    ins.Parameters.AddWithValue("@conf", 0.85);
                    ins.Parameters.AddWithValue("@lat", lat ?? (object)DBNull.Value);
                    ins.Parameters.AddWithValue("@lng", lng ?? (object)DBNull.Value);
                    await ins.ExecuteNonQueryAsync();
                }

                await using (var alert = conn.CreateCommand())
                {
                    alert.Transaction = (SqliteTransaction)tx;
                    alert.CommandText = "INSERT INTO Alerts (Title, Message, Severity) VALUES (@t, @m, 'Critical')";
                    alert.Parameters.AddWithValue("@t", $"[AI] {a.alertTitle}");
                    alert.Parameters.AddWithValue("@m", a.alertMsg + " PM personel atamasi bekleniyor.");
                    await alert.ExecuteNonQueryAsync();
                }

                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
    }

    private static async Task<bool> RecentlyAlertedAsync(SqliteConnection conn, int unitId, string detectionType)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(*) FROM AiDetections
            WHERE UnitID = @uid AND DetectionType = @type
              AND datetime(DetectedAt) > datetime('now', '-15 minutes')";
        cmd.Parameters.AddWithValue("@uid", unitId);
        cmd.Parameters.AddWithValue("@type", detectionType);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }
}
