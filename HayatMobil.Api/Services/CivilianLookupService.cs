using HayatMobil.Api.Data;
using HayatMobil.Api.Domain;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

internal static class CivilianLookupService
{
    private const int MaxResults = 10;

    internal static async Task<List<object>> SearchAsync(
        int searcherUserId,
        string query,
        double? fromLat,
        double? fromLng)
    {
        var term = query.Trim();
        if (term.Length < 2)
            return [];

        var like = $"%{term.ToLowerInvariant()}%";
        var results = new List<object>();
        var matchedReportIds = new HashSet<int>();

        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT UserID, FullName, SafetyStatus, LastSafetyReport,
                       LastKnownLat, LastKnownLng, LastLocationAt
                FROM Users
                WHERE UserType = 'Afetzede'
                  AND UserID != @me
                  AND LOWER(FullName) LIKE @q
                ORDER BY FullName
                LIMIT @lim;";
            cmd.Parameters.AddWithValue("@me", searcherUserId);
            cmd.Parameters.AddWithValue("@q", like);
            cmd.Parameters.AddWithValue("@lim", MaxResults);

            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var userId = Convert.ToInt32(r["UserID"]);
                var fullName = r["FullName"].ToString()!;
                double? lat = r["LastKnownLat"] == DBNull.Value ? null : Convert.ToDouble(r["LastKnownLat"]);
                double? lng = r["LastKnownLng"] == DBNull.Value ? null : Convert.ToDouble(r["LastKnownLng"]);

                var missing = await FindMissingForNameAsync(conn, fullName);
                if (missing != null)
                    matchedReportIds.Add(missing.ReportId);

                results.Add(new
                {
                    kind = "user",
                    userId,
                    fullName,
                    safetyStatus = r["SafetyStatus"].ToString(),
                    lastSafetyReport = r["LastSafetyReport"] == DBNull.Value ? null : r["LastSafetyReport"].ToString(),
                    latitude = lat,
                    longitude = lng,
                    lastLocationAt = r["LastLocationAt"] == DBNull.Value ? null : r["LastLocationAt"].ToString(),
                    distanceKm = DistanceKm(fromLat, fromLng, lat, lng),
                    missingReport = missing,
                    sos = await LoadSosSummaryAsync(conn, userId),
                    care = await LoadCareSummaryAsync(conn, userId),
                });
            }
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT mp.ReportID, mp.MissingPersonName, mp.Age, mp.PhysicalDescription,
                       mp.LastKnownLat, mp.LastKnownLong, mp.Status, mp.ReportedAt,
                       u.FullName AS ReporterName
                FROM MissingPersons mp
                JOIN Users u ON mp.ReporterUserID = u.UserID
                WHERE LOWER(mp.MissingPersonName) LIKE @q
                   OR LOWER(COALESCE(mp.PhysicalDescription, '')) LIKE @q
                ORDER BY mp.ReportedAt DESC
                LIMIT @lim;";
            cmd.Parameters.AddWithValue("@q", like);
            cmd.Parameters.AddWithValue("@lim", MaxResults);

            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var reportId = Convert.ToInt32(r["ReportID"]);
                if (matchedReportIds.Contains(reportId))
                    continue;

                double? lat = r["LastKnownLat"] == DBNull.Value ? null : Convert.ToDouble(r["LastKnownLat"]);
                double? lng = r["LastKnownLong"] == DBNull.Value ? null : Convert.ToDouble(r["LastKnownLong"]);

                results.Add(new
                {
                    kind = "missing",
                    reportId,
                    missingPersonName = r["MissingPersonName"].ToString(),
                    age = r["Age"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["Age"]),
                    physicalDescription = r["PhysicalDescription"] == DBNull.Value ? null : r["PhysicalDescription"].ToString(),
                    status = r["Status"].ToString(),
                    reportedAt = r["ReportedAt"].ToString(),
                    reporterName = r["ReporterName"].ToString(),
                    latitude = lat,
                    longitude = lng,
                    distanceKm = DistanceKm(fromLat, fromLng, lat, lng),
                    linkedUserId = (int?)null,
                });
            }
        }

        return results
            .OrderBy(r => GetDistanceKm(r) ?? double.MaxValue)
            .Take(MaxResults)
            .ToList();
    }

    private static double? GetDistanceKm(object row)
    {
        var prop = row.GetType().GetProperty("distanceKm");
        if (prop == null) return null;
        return prop.GetValue(row) as double?;
    }

    private static double? DistanceKm(double? fromLat, double? fromLng, double? lat, double? lng)
    {
        if (fromLat == null || fromLng == null || lat == null || lng == null)
            return null;
        return Math.Round(MapGeoHelper.HaversineKm(fromLat.Value, fromLng.Value, lat.Value, lng.Value), 2);
    }

    private sealed record MissingSnap(int ReportId, string Status, int? Age);

    private static async Task<MissingSnap?> FindMissingForNameAsync(SqliteConnection conn, string fullName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT ReportID, Status, Age
            FROM MissingPersons
            WHERE Status = 'Missing'
              AND LOWER(MissingPersonName) LIKE @name
            ORDER BY ReportedAt DESC
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@name", $"%{fullName.ToLowerInvariant()}%");

        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return null;

        return new MissingSnap(
            Convert.ToInt32(r["ReportID"]),
            r["Status"].ToString()!,
            r["Age"] == DBNull.Value ? null : Convert.ToInt32(r["Age"]));
    }

    private static async Task<object?> LoadSosSummaryAsync(SqliteConnection conn, int userId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT TicketID, RequestType, Status, TriageColor, UpdateNote, ReferredToDoctor
            FROM AssistanceTickets
            WHERE RequestorUserID = @uid
              AND Status IN ('Open', 'In_Progress')
            ORDER BY
              CASE Status WHEN 'In_Progress' THEN 0 ELSE 1 END,
              CreatedAt DESC
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@uid", userId);

        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return null;

        var status = r["Status"].ToString()!;
        var requestType = r["RequestType"].ToString()!;
        var referred = r["ReferredToDoctor"] != DBNull.Value && Convert.ToInt32(r["ReferredToDoctor"]) == 1;

        return new
        {
            hasActive = true,
            ticketId = Convert.ToInt32(r["TicketID"]),
            requestType,
            status,
            triageColor = r["TriageColor"] == DBNull.Value ? null : r["TriageColor"].ToString(),
            referredToDoctor = referred,
            updateNote = r["UpdateNote"] == DBNull.Value ? null : r["UpdateNote"].ToString(),
        };
    }

    private static async Task<object?> LoadCareSummaryAsync(SqliteConnection conn, int userId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT RecordType, Disposition, Treatment, RecordedAt
            FROM MedicalRecords
            WHERE PatientUserID = @uid
            ORDER BY RecordedAt DESC
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@uid", userId);

        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return null;

        var recordType = r["RecordType"]?.ToString() ?? "ClinicalExam";
        var disposition = r["Disposition"] == DBNull.Value ? null : r["Disposition"].ToString();
        var treatment = r["Treatment"] == DBNull.Value ? null : r["Treatment"].ToString();

        return new
        {
            hasIntervention = true,
            recordType,
            disposition,
            treatmentSummary = Truncate(treatment, 120),
            recordedAt = r["RecordedAt"].ToString(),
        };
    }

    private static string? Truncate(string? text, int max)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;
        text = text.Trim();
        return text.Length <= max ? text : text[..max] + "…";
    }
}
