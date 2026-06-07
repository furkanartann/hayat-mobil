using HayatMobil.Api.Domain;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

/// <summary>Personel konumu → hedef için OSRM tabanli tahmini varış süresi.</summary>
public static class DispatchEtaService
{
    public sealed record GeoPoint(double Lat, double Lng, string Source);

    public sealed record EtaSnapshot(
        int EtaMinutes,
        double DistanceMeters,
        double DurationSeconds,
        bool Fallback,
        string OriginSource,
        string TargetSource);

    public static async Task<EtaSnapshot> ComputeFieldDutyEtaAsync(
        SqliteConnection conn,
        int staffId,
        string dutyType,
        int refId,
        CancellationToken ct = default)
    {
        var origin = await GetStaffOriginAsync(conn, staffId, ct);
        var target = await GetDutyTargetAsync(conn, dutyType, refId, ct);
        var profile = await GetStaffRoutingProfileAsync(conn, staffId, ct);
        var fallbackMinutes = OperationalEta.MinutesForFieldDuty(dutyType);
        return await ComputeRouteEtaAsync(origin, target, profile, fallbackMinutes, ct);
    }

    public static async Task<EtaSnapshot> ComputeTicketEtaAsync(
        SqliteConnection conn,
        int staffId,
        int ticketId,
        CancellationToken ct = default)
    {
        var origin = await GetStaffOriginAsync(conn, staffId, ct);
        var target = await GetTicketTargetAsync(conn, ticketId, ct);
        var profile = await GetStaffRoutingProfileAsync(conn, staffId, ct);
        var triage = await GetTicketTriageAsync(conn, ticketId, ct);
        var fallbackMinutes = OperationalEta.MinutesForTriage(triage);
        return await ComputeRouteEtaAsync(origin, target, profile, fallbackMinutes, ct);
    }

    private static async Task<EtaSnapshot> ComputeRouteEtaAsync(
        GeoPoint? origin,
        GeoPoint? target,
        string profile,
        int fallbackMinutes,
        CancellationToken ct)
    {
        if (origin is null || target is null)
        {
            return new EtaSnapshot(
                fallbackMinutes,
                0,
                fallbackMinutes * 60,
                Fallback: true,
                origin?.Source ?? "unknown",
                target?.Source ?? "unknown");
        }

        try
        {
            var route = await RoutingService.FetchRouteAsync(
                origin.Lat, origin.Lng, target.Lat, target.Lng, profile, ct);
            var minutes = Math.Max(1, (int)Math.Round(route.DurationSeconds / 60.0));
            return new EtaSnapshot(
                minutes,
                route.DistanceMeters,
                route.DurationSeconds,
                route.Fallback,
                origin.Source,
                target.Source);
        }
        catch
        {
            return new EtaSnapshot(
                fallbackMinutes,
                0,
                fallbackMinutes * 60,
                Fallback: true,
                origin.Source,
                target.Source);
        }
    }

    private static async Task<GeoPoint?> GetStaffOriginAsync(SqliteConnection conn, int staffId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT u.LastKnownLat, u.LastKnownLng, un.Latitude AS UnitLat, un.Longitude AS UnitLng
            FROM StaffProfiles sp
            JOIN Users u ON sp.UserID = u.UserID
            LEFT JOIN Units un ON sp.UnitID = un.UnitID
            WHERE sp.StaffID = @sid;";
        cmd.Parameters.AddWithValue("@sid", staffId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            return null;

        if (r["LastKnownLat"] != DBNull.Value && r["LastKnownLng"] != DBNull.Value)
        {
            return new GeoPoint(
                Convert.ToDouble(r["LastKnownLat"]),
                Convert.ToDouble(r["LastKnownLng"]),
                "staff_gps");
        }

        if (r["UnitLat"] != DBNull.Value && r["UnitLng"] != DBNull.Value)
        {
            return new GeoPoint(
                Convert.ToDouble(r["UnitLat"]),
                Convert.ToDouble(r["UnitLng"]),
                "staff_unit");
        }

        return null;
    }

    private static async Task<string> GetStaffRoutingProfileAsync(SqliteConnection conn, int staffId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT u.UserType FROM StaffProfiles sp
            JOIN Users u ON sp.UserID = u.UserID
            WHERE sp.StaffID = @sid;";
        cmd.Parameters.AddWithValue("@sid", staffId);
        var userType = (await cmd.ExecuteScalarAsync(ct))?.ToString();
        return userType == "AramaKurtarma" ? "foot" : "driving";
    }

    private static async Task<GeoPoint?> GetDutyTargetAsync(
        SqliteConnection conn, string dutyType, int refId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        switch (dutyType)
        {
            case "Unit":
                cmd.CommandText = "SELECT Latitude, Longitude FROM Units WHERE UnitID = @id;";
                break;
            case "Sensor":
                cmd.CommandText = @"
                    SELECT u.Latitude, u.Longitude FROM Sensors s
                    JOIN Units u ON s.UnitID = u.UnitID
                    WHERE s.SensorID = @id;";
                break;
            case "Missing":
                cmd.CommandText = @"
                    SELECT LastKnownLat, LastKnownLong FROM MissingPersons
                    WHERE ReportID = @id;";
                break;
            default:
                return null;
        }

        cmd.Parameters.AddWithValue("@id", refId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            return null;

        if (dutyType == "Missing")
        {
            if (r["LastKnownLat"] == DBNull.Value || r["LastKnownLong"] == DBNull.Value)
                return null;
            return new GeoPoint(
                Convert.ToDouble(r["LastKnownLat"]),
                Convert.ToDouble(r["LastKnownLong"]),
                "missing_last_known");
        }

        if (r["Latitude"] == DBNull.Value || r["Longitude"] == DBNull.Value)
            return null;
        return new GeoPoint(
            Convert.ToDouble(r["Latitude"]),
            Convert.ToDouble(r["Longitude"]),
            dutyType.ToLowerInvariant());
    }

    private static async Task<GeoPoint?> GetTicketTargetAsync(SqliteConnection conn, int ticketId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT ReporterLat, ReporterLng FROM AssistanceTickets WHERE TicketID = @id;";
        cmd.Parameters.AddWithValue("@id", ticketId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct) || r["ReporterLat"] == DBNull.Value || r["ReporterLng"] == DBNull.Value)
            return null;
        return new GeoPoint(
            Convert.ToDouble(r["ReporterLat"]),
            Convert.ToDouble(r["ReporterLng"]),
            "ticket_reporter");
    }

    private static async Task<string?> GetTicketTriageAsync(SqliteConnection conn, int ticketId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT TriageColor FROM AssistanceTickets WHERE TicketID = @id;";
        cmd.Parameters.AddWithValue("@id", ticketId);
        return (await cmd.ExecuteScalarAsync(ct))?.ToString();
    }
}
