using HayatMobil.Api.Data;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

public static class MapGeoService
{
    public static async Task UpdateUserLocationAsync(int userId, double latitude, double longitude)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE Users SET
                LastKnownLat = @lat,
                LastKnownLng = @lng,
                LastLocationAt = datetime('now')
            WHERE UserID = @uid;";
        cmd.Parameters.AddWithValue("@lat", latitude);
        cmd.Parameters.AddWithValue("@lng", longitude);
        cmd.Parameters.AddWithValue("@uid", userId);
        await cmd.ExecuteNonQueryAsync();
    }

    public static async Task<object> GetZoneStatusAsync(int userId)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();

        double? lat = null;
        double? lng = null;
        await using (var userCmd = conn.CreateCommand())
        {
            userCmd.CommandText = "SELECT LastKnownLat, LastKnownLng FROM Users WHERE UserID = @uid;";
            userCmd.Parameters.AddWithValue("@uid", userId);
            await using var r = await userCmd.ExecuteReaderAsync();
            if (await r.ReadAsync())
            {
                if (r["LastKnownLat"] != DBNull.Value) lat = Convert.ToDouble(r["LastKnownLat"]);
                if (r["LastKnownLng"] != DBNull.Value) lng = Convert.ToDouble(r["LastKnownLng"]);
            }
        }

        if (!lat.HasValue || !lng.HasValue)
            return new { inDisasterZone = false, zoneId = (int?)null, zoneTitle = (string?)null };

        await using var zoneCmd = conn.CreateCommand();
        zoneCmd.CommandText = @"
            SELECT ZoneID, Title, CenterLat, CenterLng, RadiusKm
            FROM DisasterZones
            WHERE Active = 1
            ORDER BY DeclaredAt DESC;";
        await using var zr = await zoneCmd.ExecuteReaderAsync();
        while (await zr.ReadAsync())
        {
            var centerLat = Convert.ToDouble(zr["CenterLat"]);
            var centerLng = Convert.ToDouble(zr["CenterLng"]);
            var radiusKm = Convert.ToDouble(zr["RadiusKm"]);
            if (MapGeoHelper.IsInsideCircle(lat.Value, lng.Value, centerLat, centerLng, radiusKm))
            {
                return new
                {
                    inDisasterZone = true,
                    zoneId = Convert.ToInt32(zr["ZoneID"]),
                    zoneTitle = zr["Title"].ToString()
                };
            }
        }

        return new { inDisasterZone = false, zoneId = (int?)null, zoneTitle = (string?)null };
    }

    public static async Task<object> GetLayersAsync(AuthUser auth)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();

        object? me = null;
        await using (var meCmd = conn.CreateCommand())
        {
            meCmd.CommandText = "SELECT LastKnownLat, LastKnownLng, LastLocationAt FROM Users WHERE UserID = @uid;";
            meCmd.Parameters.AddWithValue("@uid", auth.UserId);
            await using var r = await meCmd.ExecuteReaderAsync();
            if (await r.ReadAsync() && r["LastKnownLat"] != DBNull.Value && r["LastKnownLng"] != DBNull.Value)
            {
                me = new
                {
                    lat = Convert.ToDouble(r["LastKnownLat"]),
                    lng = Convert.ToDouble(r["LastKnownLng"]),
                    updatedAt = r["LastLocationAt"] == DBNull.Value ? null : r["LastLocationAt"].ToString()
                };
            }
        }

        var units = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT UnitID, SerialNumber, Latitude, Longitude, Status, BatteryLevel
                FROM Units
                WHERE Latitude IS NOT NULL AND Longitude IS NOT NULL;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                units.Add(new
                {
                    unitId = Convert.ToInt32(r["UnitID"]),
                    serialNumber = r["SerialNumber"].ToString(),
                    latitude = Convert.ToDouble(r["Latitude"]),
                    longitude = Convert.ToDouble(r["Longitude"]),
                    status = r["Status"].ToString(),
                    batteryLevel = r["BatteryLevel"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["BatteryLevel"])
                });
            }
        }

        var tickets = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT
                    at.TicketID, at.RequestType, at.TriageColor, at.Status,
                    at.ReporterLat, at.ReporterLng,
                    u1.FullName AS RequestorName,
                    un.Latitude AS UnitLat, un.Longitude AS UnitLng
                FROM AssistanceTickets at
                JOIN Users u1 ON at.RequestorUserID = u1.UserID
                LEFT JOIN Units un ON at.UnitID = un.UnitID
                WHERE at.Status IN ('Open', 'In_Progress')"
                + (auth.IsAfetzede ? " AND at.RequestorUserID = @uid;" : ";");
            if (auth.IsAfetzede)
                cmd.Parameters.AddWithValue("@uid", auth.UserId);
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                double? lat = r["ReporterLat"] == DBNull.Value ? null : Convert.ToDouble(r["ReporterLat"]);
                double? lng = r["ReporterLng"] == DBNull.Value ? null : Convert.ToDouble(r["ReporterLng"]);
                if (!lat.HasValue && r["UnitLat"] != DBNull.Value) lat = Convert.ToDouble(r["UnitLat"]);
                if (!lng.HasValue && r["UnitLng"] != DBNull.Value) lng = Convert.ToDouble(r["UnitLng"]);
                if (!lat.HasValue || !lng.HasValue) continue;

                tickets.Add(new
                {
                    ticketId = Convert.ToInt32(r["TicketID"]),
                    requestType = r["RequestType"].ToString(),
                    triageColor = r["TriageColor"].ToString(),
                    status = r["Status"].ToString(),
                    requestorName = r["RequestorName"].ToString(),
                    latitude = lat.Value,
                    longitude = lng.Value
                });
            }
        }

        var aiDetections = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT DetectionID, DetectionType, ConfidenceScore, PersonCount, ImmobilePersonCount, Latitude, Longitude, CameraID
                FROM AiDetections
                WHERE Latitude IS NOT NULL AND Longitude IS NOT NULL
                ORDER BY DetectedAt DESC
                LIMIT 50;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                aiDetections.Add(new
                {
                    detectionId = Convert.ToInt32(r["DetectionID"]),
                    detectionType = r["DetectionType"].ToString(),
                    confidenceScore = r["ConfidenceScore"] == DBNull.Value ? 0.0 : Convert.ToDouble(r["ConfidenceScore"]),
                    personCount = r["PersonCount"] == DBNull.Value ? 0 : Convert.ToInt32(r["PersonCount"]),
                    immobilePersonCount = r["ImmobilePersonCount"] == DBNull.Value ? 0 : Convert.ToInt32(r["ImmobilePersonCount"]),
                    latitude = Convert.ToDouble(r["Latitude"]),
                    longitude = Convert.ToDouble(r["Longitude"]),
                    cameraId = r["CameraID"] == DBNull.Value ? null : r["CameraID"].ToString()
                });
            }
        }

        var missingPersons = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT ReportID, MissingPersonName, Status, LastKnownLat, LastKnownLong
                FROM MissingPersons
                WHERE Status = 'Missing'
                  AND LastKnownLat IS NOT NULL AND LastKnownLong IS NOT NULL;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                missingPersons.Add(new
                {
                    reportId = Convert.ToInt32(r["ReportID"]),
                    missingPersonName = r["MissingPersonName"].ToString(),
                    status = r["Status"].ToString(),
                    latitude = Convert.ToDouble(r["LastKnownLat"]),
                    longitude = Convert.ToDouble(r["LastKnownLong"])
                });
            }
        }

        var disasterZones = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT z.ZoneID, z.Title, z.CenterLat, z.CenterLng, z.RadiusKm, z.Active, z.DeclaredAt, z.AlertID,
                       a.Message, a.Severity, a.CreatedAt
                FROM DisasterZones z
                LEFT JOIN Alerts a ON z.AlertID = a.AlertID
                WHERE z.Active = 1
                ORDER BY z.DeclaredAt DESC;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                disasterZones.Add(new
                {
                    zoneId = Convert.ToInt32(r["ZoneID"]),
                    alertId = r["AlertID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["AlertID"]),
                    title = r["Title"].ToString(),
                    message = r["Message"] == DBNull.Value ? null : r["Message"].ToString(),
                    severity = r["Severity"] == DBNull.Value ? "Critical" : r["Severity"].ToString(),
                    centerLat = Convert.ToDouble(r["CenterLat"]),
                    centerLng = Convert.ToDouble(r["CenterLng"]),
                    radiusKm = Convert.ToDouble(r["RadiusKm"]),
                    active = Convert.ToInt32(r["Active"]) == 1,
                    declaredAt = r["DeclaredAt"].ToString(),
                    createdAt = r["CreatedAt"] == DBNull.Value ? r["DeclaredAt"].ToString() : r["CreatedAt"].ToString()
                });
            }
        }

        var sensors = new List<object>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT s.SensorID, s.UnitID, s.SensorType, s.CurrentValue, s.UnitOfMeasure, s.Status,
                       u.SerialNumber, u.Latitude, u.Longitude
                FROM Sensors s
                JOIN Units u ON s.UnitID = u.UnitID
                WHERE u.Latitude IS NOT NULL AND u.Longitude IS NOT NULL;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                sensors.Add(new
                {
                    sensorId = Convert.ToInt32(r["SensorID"]),
                    unitId = Convert.ToInt32(r["UnitID"]),
                    serialNumber = r["SerialNumber"].ToString(),
                    sensorType = r["SensorType"].ToString(),
                    currentValue = r["CurrentValue"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["CurrentValue"]),
                    unitOfMeasure = r["UnitOfMeasure"] == DBNull.Value ? null : r["UnitOfMeasure"].ToString(),
                    status = r["Status"].ToString(),
                    latitude = Convert.ToDouble(r["Latitude"]),
                    longitude = Convert.ToDouble(r["Longitude"])
                });
            }
        }

        var userLocations = new List<object>();
        if (auth.IsPm)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT UserID, FullName, UserType, SafetyStatus, LastKnownLat, LastKnownLng
                FROM Users
                WHERE LastKnownLat IS NOT NULL AND LastKnownLng IS NOT NULL
                  AND UserType = 'Afetzede';";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                userLocations.Add(new
                {
                    userId = Convert.ToInt32(r["UserID"]),
                    fullName = r["FullName"].ToString(),
                    userType = r["UserType"].ToString(),
                    safetyStatus = r["SafetyStatus"].ToString(),
                    latitude = Convert.ToDouble(r["LastKnownLat"]),
                    longitude = Convert.ToDouble(r["LastKnownLng"])
                });
            }
        }

        var assemblyPoints = await AssemblyPointService.ListForMapAsync(auth.IsPm);

        return new
        {
            me,
            units,
            sensors,
            tickets,
            aiDetections,
            missingPersons,
            disasterZones,
            userLocations,
            assemblyPoints
        };
    }
}
