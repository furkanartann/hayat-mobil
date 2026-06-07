using HayatMobil.Api.Data;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

public sealed record DisasterHistoryItem(
    int ZoneId,
    int? AlertId,
    string Title,
    string Message,
    string Severity,
    double CenterLat,
    double CenterLng,
    double RadiusKm,
    bool Active,
    string? DeclaredAt);

public sealed record UpdateDisasterZoneRequest(
    string Title,
    string Message,
    string Severity,
    double CenterLat,
    double CenterLng,
    double RadiusKm);

public static class DisasterHistoryService
{
    public static async Task<List<DisasterHistoryItem>> ListAsync()
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();

        var list = new List<DisasterHistoryItem>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT ZoneID, Title, CenterLat, CenterLng, RadiusKm, Active, DeclaredAt, AlertID
            FROM DisasterZones
            ORDER BY DeclaredAt DESC, ZoneID DESC
            LIMIT 50;";
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            var zoneId = Convert.ToInt32(r["ZoneID"]);
            var title = r["Title"].ToString() ?? "";
            var alertId = r["AlertID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["AlertID"]);
            var (msg, sev, resolvedAlertId) = await ResolveAlertAsync(conn, alertId, title);
            list.Add(new DisasterHistoryItem(
                zoneId,
                resolvedAlertId,
                title,
                msg,
                sev,
                Convert.ToDouble(r["CenterLat"]),
                Convert.ToDouble(r["CenterLng"]),
                Convert.ToDouble(r["RadiusKm"]),
                Convert.ToInt32(r["Active"]) == 1,
                r["DeclaredAt"]?.ToString()));
        }

        return list;
    }

    public static async Task SetActiveAsync(int zoneId, bool active)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            if (active)
            {
                await using var off = new SqliteCommand(
                    "UPDATE DisasterZones SET Active = 0 WHERE Active = 1", conn, (SqliteTransaction)tx);
                await off.ExecuteNonQueryAsync();
            }

            await using var upd = new SqliteCommand(
                "UPDATE DisasterZones SET Active = @a WHERE ZoneID = @id", conn, (SqliteTransaction)tx);
            upd.Parameters.AddWithValue("@a", active ? 1 : 0);
            upd.Parameters.AddWithValue("@id", zoneId);
            var n = await upd.ExecuteNonQueryAsync();
            if (n == 0)
                throw new InvalidOperationException("Afet bölgesi bulunamadı.");

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public static async Task DeleteAsync(int zoneId)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            int? alertId = null;
            await using (var find = new SqliteCommand(
                "SELECT AlertID FROM DisasterZones WHERE ZoneID = @id", conn, (SqliteTransaction)tx))
            {
                find.Parameters.AddWithValue("@id", zoneId);
                await using var r = await find.ExecuteReaderAsync();
                if (!await r.ReadAsync())
                    throw new InvalidOperationException("Afet bölgesi bulunamadı.");
                if (r["AlertID"] != DBNull.Value)
                    alertId = Convert.ToInt32(r["AlertID"]);
            }

            await using (var delZone = new SqliteCommand(
                "DELETE FROM DisasterZones WHERE ZoneID = @id", conn, (SqliteTransaction)tx))
            {
                delZone.Parameters.AddWithValue("@id", zoneId);
                await delZone.ExecuteNonQueryAsync();
            }

            if (alertId.HasValue)
            {
                await using var delAlert = new SqliteCommand(
                    "DELETE FROM Alerts WHERE AlertID = @aid", conn, (SqliteTransaction)tx);
                delAlert.Parameters.AddWithValue("@aid", alertId.Value);
                await delAlert.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public static async Task UpdateAsync(int zoneId, UpdateDisasterZoneRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
            throw new InvalidOperationException("Başlık ve mesaj zorunludur.");
        if (req.CenterLat is < -90 or > 90 || req.CenterLng is < -180 or > 180)
            throw new InvalidOperationException("Geçersiz koordinat.");
        if (req.RadiusKm <= 0)
            throw new InvalidOperationException("Yarıçap pozitif olmalıdır.");

        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            int? alertId = null;
            await using (var find = new SqliteCommand(
                "SELECT AlertID FROM DisasterZones WHERE ZoneID = @id", conn, (SqliteTransaction)tx))
            {
                find.Parameters.AddWithValue("@id", zoneId);
                var raw = await find.ExecuteScalarAsync();
                if (raw == null || raw == DBNull.Value)
                    throw new InvalidOperationException("Afet bölgesi bulunamadı.");
                if (raw != DBNull.Value)
                    alertId = Convert.ToInt32(raw);
            }

            await using (var zoneUpd = new SqliteCommand(@"
                UPDATE DisasterZones
                SET Title = @title, CenterLat = @lat, CenterLng = @lng, RadiusKm = @radius
                WHERE ZoneID = @id", conn, (SqliteTransaction)tx))
            {
                zoneUpd.Parameters.AddWithValue("@title", req.Title.Trim());
                zoneUpd.Parameters.AddWithValue("@lat", req.CenterLat);
                zoneUpd.Parameters.AddWithValue("@lng", req.CenterLng);
                zoneUpd.Parameters.AddWithValue("@radius", req.RadiusKm);
                zoneUpd.Parameters.AddWithValue("@id", zoneId);
                await zoneUpd.ExecuteNonQueryAsync();
            }

            if (alertId.HasValue)
            {
                await using var alertUpd = new SqliteCommand(@"
                    UPDATE Alerts SET Title = @title, Message = @msg, Severity = @sev
                    WHERE AlertID = @aid", conn, (SqliteTransaction)tx);
                alertUpd.Parameters.AddWithValue("@title", req.Title.Trim());
                alertUpd.Parameters.AddWithValue("@msg", req.Message.Trim());
                alertUpd.Parameters.AddWithValue("@sev", string.IsNullOrWhiteSpace(req.Severity) ? "Critical" : req.Severity.Trim());
                alertUpd.Parameters.AddWithValue("@aid", alertId.Value);
                await alertUpd.ExecuteNonQueryAsync();
            }
            else
            {
                await using var ins = new SqliteCommand(
                    "INSERT INTO Alerts (Title, Message, Severity) VALUES (@title, @msg, @sev)", conn, (SqliteTransaction)tx);
                ins.Parameters.AddWithValue("@title", req.Title.Trim());
                ins.Parameters.AddWithValue("@msg", req.Message.Trim());
                ins.Parameters.AddWithValue("@sev", string.IsNullOrWhiteSpace(req.Severity) ? "Critical" : req.Severity.Trim());
                await ins.ExecuteNonQueryAsync();
                var newAlertId = (int)(await new SqliteCommand("SELECT last_insert_rowid()", conn, (SqliteTransaction)tx).ExecuteScalarAsync() ?? 0);
                await using var link = new SqliteCommand(
                    "UPDATE DisasterZones SET AlertID = @aid WHERE ZoneID = @id", conn, (SqliteTransaction)tx);
                link.Parameters.AddWithValue("@aid", newAlertId);
                link.Parameters.AddWithValue("@id", zoneId);
                await link.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static async Task<(string Message, string Severity, int? AlertId)> ResolveAlertAsync(
        SqliteConnection conn, int? alertId, string zoneTitle)
    {
        if (alertId.HasValue)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT AlertID, Message, Severity FROM Alerts WHERE AlertID = @id";
            cmd.Parameters.AddWithValue("@id", alertId.Value);
            await using var r = await cmd.ExecuteReaderAsync();
            if (await r.ReadAsync())
                return (r["Message"].ToString() ?? "", r["Severity"].ToString() ?? "Critical", alertId);
        }

        await using var byTitle = conn.CreateCommand();
        byTitle.CommandText = @"
            SELECT AlertID, Message, Severity FROM Alerts
            WHERE Title = @title AND Severity = 'Critical' AND Title NOT LIKE '[AI]%'
            ORDER BY CreatedAt DESC LIMIT 1;";
        byTitle.Parameters.AddWithValue("@title", zoneTitle);
        await using var tr = await byTitle.ExecuteReaderAsync();
        if (await tr.ReadAsync())
            return (tr["Message"].ToString() ?? "", tr["Severity"].ToString() ?? "Critical", Convert.ToInt32(tr["AlertID"]));

        return ("", "Critical", null);
    }
}
