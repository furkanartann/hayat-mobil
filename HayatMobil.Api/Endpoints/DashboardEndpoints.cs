using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class DashboardEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/dashboard", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    SELECT
                      (SELECT COUNT(*) FROM Units WHERE Status='Active')      AS ActiveUnits,
                      (SELECT COUNT(*) FROM Units WHERE Status='Emergency')   AS EmgUnits,
                      (SELECT COUNT(*) FROM Units WHERE Status='Offline')     AS OffUnits,
                      (SELECT COUNT(*) FROM AssistanceTickets WHERE Status IN ('Open','In_Progress') AND TriageColor='Red') AS CritTickets,
                      (SELECT COUNT(*) FROM AssistanceTickets WHERE Status IN ('Open','In_Progress') AND TriageColor='Yellow') AS YellowTickets,
                      (SELECT COUNT(*) FROM AssistanceTickets WHERE Status IN ('Open','In_Progress') AND TriageColor='Green') AS GreenTickets,
                      (SELECT COUNT(*) FROM AssistanceTickets WHERE Status IN ('Open','In_Progress')) AS OpenTicketsAll,
                      (SELECT COUNT(*) FROM Sensors WHERE Status='Error')     AS ErrSensors,
                      (SELECT COUNT(*) FROM Sensors WHERE Status='Offline')   AS OffSensors,
                      (SELECT COUNT(*) FROM MissingPersons WHERE Status='Missing') AS MissingPpl,
                      (SELECT COUNT(*) FROM SyncQueue WHERE SyncStatus='Waiting')  AS PendingSync,
                      (SELECT COUNT(*) FROM AiDetections WHERE DetectionType IN ('Human_Trapped','Fire') AND datetime(DetectedAt) > datetime('now', '-1 hour')) AS RecentAlerts,
                      (SELECT COUNT(*) FROM Users WHERE SafetyStatus='Safe')  AS SafeUsers,
                      (SELECT COUNT(*) FROM Users WHERE SafetyStatus='In_Danger')  AS DangerUsers,
                      (SELECT COUNT(*) FROM StaffProfiles WHERE CurrentStatus != 'Off_Duty') AS ActiveStaff,
                      (SELECT COUNT(*) FROM StaffProfiles WHERE CurrentStatus = 'Available') AS AvailableStaff
                    ", conn);

                await using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    return Results.Ok(new
                    {
                        activeUnits = Convert.ToInt32(r["ActiveUnits"]),
                        emgUnits = Convert.ToInt32(r["EmgUnits"]),
                        offUnits = Convert.ToInt32(r["OffUnits"]),
                        critTickets = Convert.ToInt32(r["CritTickets"]),
                        yellowTickets = Convert.ToInt32(r["YellowTickets"]),
                        greenTickets = Convert.ToInt32(r["GreenTickets"]),
                        openTicketsAll = Convert.ToInt32(r["OpenTicketsAll"]),
                        errSensors = Convert.ToInt32(r["ErrSensors"]),
                        offSensors = Convert.ToInt32(r["OffSensors"]),
                        missingPpl = Convert.ToInt32(r["MissingPpl"]),
                        pendingSync = Convert.ToInt32(r["PendingSync"]),
                        recentAlerts = Convert.ToInt32(r["RecentAlerts"]),
                        safeUsers = Convert.ToInt32(r["SafeUsers"]),
                        dangerUsers = Convert.ToInt32(r["DangerUsers"]),
                        activeStaff = Convert.ToInt32(r["ActiveStaff"]),
                        availableStaff = Convert.ToInt32(r["AvailableStaff"])
                    });
                }
                return Results.NotFound();
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/ping", () => Results.Ok(new { ok = true, ts = DateTime.UtcNow }))
            .RequireAuthorization();

        app.MapGet("/api/runtime-state", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var state = await AppRuntimeStateStore.LoadAsync(conn);
                return Results.Ok(new
                {
                    networkQuality = state.NetworkQuality,
                    weatherTemp = state.WeatherTemp,
                    weatherCondition = state.WeatherCondition,
                    weatherRisk = state.WeatherRisk
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/weather", async (double? lat, double? lng) =>
        {
            if (lat is null or < -90 or > 90 || lng is null or < -180 or > 180)
                return Results.BadRequest(new { error = "Geçerli enlem ve boylam gerekli." });

            try
            {
                var weatherTask = WeatherService.FetchCurrentAsync(lat.Value, lng.Value);
                var locationTask = GeocodingService.ReverseLabelAsync(lat.Value, lng.Value);
                await Task.WhenAll(weatherTask, locationTask);

                var weather = await weatherTask;
                if (weather is null)
                    return Results.Json(new { error = "Hava durumu servisine ulaşılamadı." }, statusCode: 502);

                return Results.Ok(new
                {
                    weatherTemp = weather.WeatherTemp,
                    weatherCondition = weather.WeatherCondition,
                    weatherRisk = weather.WeatherRisk,
                    locationLabel = await locationTask,
                    source = "open-meteo"
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPut("/api/users/{userId}/safety", async (int userId, SafetyStatusUpdateRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (auth.UserId != userId && !auth.IsPm)
                return Results.Json(new { error = "Bu kullanıcının güvenlik durumunu güncelleme yetkiniz yok." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var cmd = new SqliteCommand("UPDATE Users SET SafetyStatus = @status, LastSafetyReport = @note WHERE UserID = @uid", conn);
                cmd.Parameters.AddWithValue("@status", req.SafetyStatus);
                cmd.Parameters.AddWithValue("@note", req.Note ?? "");
                cmd.Parameters.AddWithValue("@uid", userId);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return Results.NotFound(new { error = "Kullanıcı bulunamadı." });
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/telemetry/summary", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                static async Task<int> CountOnlineAsync(SqliteConnection c, string sensorType)
                {
                    await using var cmd = c.CreateCommand();
                    cmd.CommandText = "SELECT COUNT(*) FROM Sensors WHERE SensorType = $t AND Status = 'Online';";
                    cmd.Parameters.AddWithValue("$t", sensorType);
                    return Convert.ToInt32(await cmd.ExecuteScalarAsync());
                }

                static async Task<double?> AvgOnlineAsync(SqliteConnection c, string sensorType)
                {
                    await using var cmd = c.CreateCommand();
                    cmd.CommandText = "SELECT AVG(CurrentValue) FROM Sensors WHERE SensorType = $t AND Status = 'Online';";
                    cmd.Parameters.AddWithValue("$t", sensorType);
                    var val = await cmd.ExecuteScalarAsync();
                    if (val == null || val == DBNull.Value) return null;
                    return Math.Clamp(Convert.ToDouble(val), 0, 100);
                }

                var nemOnline = await CountOnlineAsync(conn, "Nem");
                var enerjiOnline = await CountOnlineAsync(conn, "Enerji");
                var dumanOnline = await CountOnlineAsync(conn, "Duman");
                var gazOnline = await CountOnlineAsync(conn, "Gaz");

                var waterLevel = (await AvgOnlineAsync(conn, "Nem")) ?? 0;

                double energyLevel = 0;
                var enerjiAvg = await AvgOnlineAsync(conn, "Enerji");
                if (enerjiAvg.HasValue)
                    energyLevel = enerjiAvg.Value;
                else
                {
                    await using var batCmd = conn.CreateCommand();
                    batCmd.CommandText = "SELECT AVG(BatteryLevel) FROM Units WHERE Status IN ('Active','Emergency');";
                    var val = await batCmd.ExecuteScalarAsync();
                    if (val != null && val != DBNull.Value)
                        energyLevel = Math.Clamp(Convert.ToDouble(val), 0, 100);
                }

                double maxDuman = 0;
                double maxGaz = 0;
                await using (var airCmd = conn.CreateCommand())
                {
                    airCmd.CommandText = @"
                        SELECT SensorType, MAX(CurrentValue) FROM Sensors
                        WHERE SensorType IN ('Duman','Gaz') AND Status = 'Online'
                        GROUP BY SensorType;";
                    await using var r = await airCmd.ExecuteReaderAsync();
                    while (await r.ReadAsync())
                    {
                        var type = r.GetString(0);
                        var v = Convert.ToDouble(r.GetValue(1));
                        if (type == "Duman") maxDuman = v;
                        else maxGaz = v;
                    }
                }

                string airQuality = "NORMAL";
                if (dumanOnline > 0 || gazOnline > 0)
                {
                    if (maxDuman > 80 || maxGaz > 150)
                        airQuality = "KRITIK";
                    else if (maxDuman > 40 || maxGaz > 80)
                        airQuality = "UYARI";
                }

                int connectedPeople = 0;
                await using (var safeCmd = conn.CreateCommand())
                {
                    safeCmd.CommandText = "SELECT COUNT(*) FROM Users WHERE UserType = 'Afetzede' AND SafetyStatus = 'Safe';";
                    connectedPeople = Convert.ToInt32(await safeCmd.ExecuteScalarAsync());
                }

                var hasLiveSensors = nemOnline > 0 || enerjiOnline > 0 || dumanOnline > 0 || gazOnline > 0;

                return Results.Ok(new
                {
                    waterLevel = (int)Math.Round(waterLevel),
                    energyLevel = (int)Math.Round(energyLevel),
                    airQuality,
                    connectedPeople,
                    hasLiveSensors,
                    sensorOnline = new { nem = nemOnline, enerji = enerjiOnline, duman = dumanOnline, gaz = gazOnline },
                    updatedAt = DateTime.UtcNow.ToString("o"),
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        // ---------------------------------------------------------
        //  ASSISTANCE TICKETS ENDPOINTS
        // ---------------------------------------------------------
    }
}

