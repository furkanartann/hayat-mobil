using HayatMobil.Api.Data;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

/// <summary>PM tarafindan gercek afet bildirimi — sahte senaryo enjeksiyonu yok.</summary>
public static class DisasterDeclarationService
{
    public static async Task DeclareAsync(int pmUserId, DisasterDeclareRequest req)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            long alertId;
            await using (var alertCmd = new SqliteCommand(
                "INSERT INTO Alerts (Title, Message, Severity) VALUES (@title, @msg, @sev)", conn, (SqliteTransaction)tx))
            {
                alertCmd.Parameters.AddWithValue("@title", req.Title.Trim());
                alertCmd.Parameters.AddWithValue("@msg", req.Message.Trim());
                alertCmd.Parameters.AddWithValue("@sev", req.Severity);
                await alertCmd.ExecuteNonQueryAsync();
                alertId = (long)(await new SqliteCommand("SELECT last_insert_rowid()", conn, (SqliteTransaction)tx).ExecuteScalarAsync() ?? 0L);
            }

            if (!string.IsNullOrWhiteSpace(req.WeatherCondition) ||
                !string.IsNullOrWhiteSpace(req.WeatherRisk) ||
                req.WeatherTemp.HasValue ||
                req.NetworkQuality.HasValue)
            {
                await using var stateCmd = new SqliteCommand(@"
                    UPDATE AppRuntimeState SET
                        WeatherCondition = COALESCE(@wc, WeatherCondition),
                        WeatherRisk = COALESCE(@wr, WeatherRisk),
                        WeatherTemp = COALESCE(@wt, WeatherTemp),
                        NetworkQuality = COALESCE(@nq, NetworkQuality),
                        UpdatedAt = datetime('now')
                    WHERE SingletonId = 1", conn, (SqliteTransaction)tx);
                stateCmd.Parameters.AddWithValue("@wc", string.IsNullOrWhiteSpace(req.WeatherCondition) ? DBNull.Value : req.WeatherCondition.Trim());
                stateCmd.Parameters.AddWithValue("@wr", string.IsNullOrWhiteSpace(req.WeatherRisk) ? DBNull.Value : req.WeatherRisk.Trim());
                stateCmd.Parameters.AddWithValue("@wt", req.WeatherTemp ?? (object)DBNull.Value);
                stateCmd.Parameters.AddWithValue("@nq", req.NetworkQuality ?? (object)DBNull.Value);
                await stateCmd.ExecuteNonQueryAsync();
            }

            if (req.ZoneCenterLat.HasValue && req.ZoneCenterLng.HasValue && req.ZoneRadiusKm.HasValue && req.ZoneRadiusKm.Value > 0)
            {
                await using (var deactivateCmd = new SqliteCommand(
                    "UPDATE DisasterZones SET Active = 0 WHERE Active = 1", conn, (SqliteTransaction)tx))
                {
                    await deactivateCmd.ExecuteNonQueryAsync();
                }

                await using var zoneCmd = new SqliteCommand(@"
                    INSERT INTO DisasterZones (Title, CenterLat, CenterLng, RadiusKm, Active, DeclaredByUserID, AlertID)
                    VALUES (@title, @lat, @lng, @radius, 1, @uid, @aid)", conn, (SqliteTransaction)tx);
                zoneCmd.Parameters.AddWithValue("@title", req.Title.Trim());
                zoneCmd.Parameters.AddWithValue("@lat", req.ZoneCenterLat.Value);
                zoneCmd.Parameters.AddWithValue("@lng", req.ZoneCenterLng.Value);
                zoneCmd.Parameters.AddWithValue("@radius", req.ZoneRadiusKm.Value);
                zoneCmd.Parameters.AddWithValue("@uid", pmUserId);
                zoneCmd.Parameters.AddWithValue("@aid", alertId);
                await zoneCmd.ExecuteNonQueryAsync();
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

public sealed record DisasterDeclareRequest(
    string Title,
    string Message,
    string Severity,
    string? WeatherCondition,
    string? WeatherRisk,
    int? WeatherTemp,
    int? NetworkQuality,
    double? ZoneCenterLat = null,
    double? ZoneCenterLng = null,
    double? ZoneRadiusKm = null);
