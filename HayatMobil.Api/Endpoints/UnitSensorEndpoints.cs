using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class UnitSensorEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/units", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("SELECT UnitID, SerialNumber, Latitude, Longitude, Status, BatteryLevel, SolarProduction, LastOtaVersion, DeployedAt, LastHeartbeat FROM Units", conn);
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        unitId = Convert.ToInt32(r["UnitID"]),
                        serialNumber = r["SerialNumber"].ToString(),
                        latitude = r["Latitude"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["Latitude"]),
                        longitude = r["Longitude"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["Longitude"]),
                        status = r["Status"].ToString(),
                        batteryLevel = r["BatteryLevel"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["BatteryLevel"]),
                        solarProduction = r["SolarProduction"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["SolarProduction"]),
                        lastOtaVersion = r["LastOtaVersion"].ToString(),
                        deployedAt = r["DeployedAt"].ToString(),
                        lastHeartbeat = r["LastHeartbeat"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/units", async (CreateUnitRequest req) =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    INSERT INTO Units (SerialNumber, Latitude, Longitude, Status, BatteryLevel, SolarProduction)
                    VALUES (@sn, @lat, @lng, @status, 100, 0.0)", conn);
                cmd.Parameters.AddWithValue("@sn", req.SerialNumber);
                cmd.Parameters.AddWithValue("@lat", req.Latitude);
                cmd.Parameters.AddWithValue("@lng", req.Longitude);
                cmd.Parameters.AddWithValue("@status", req.Status ?? "Active");

                await cmd.ExecuteNonQueryAsync();
                var unitId = await DbContext.GetLastInsertRowIdAsync(conn);

                string[] defaultSensors = ["Isi", "Duman", "Gaz", "Nem"];
                foreach (var st in defaultSensors)
                {
                    await using var sCmd = new SqliteCommand(
                        "INSERT INTO Sensors (UnitID, SensorType, CurrentValue, UnitOfMeasure, Status) VALUES (@uid, @st, NULL, '', 'Online')", conn);
                    sCmd.Parameters.AddWithValue("@uid", unitId);
                    sCmd.Parameters.AddWithValue("@st", st);
                    await sCmd.ExecuteNonQueryAsync();
                }

                return Results.Ok(new { success = true, unitId });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.FieldOps);

        app.MapGet("/api/sensors", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("SELECT SensorID, UnitID, SensorType, CurrentValue, UnitOfMeasure, QosLevel, Status, LastUpdate FROM Sensors", conn);
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        sensorId = Convert.ToInt32(r["SensorID"]),
                        unitId = Convert.ToInt32(r["UnitID"]),
                        sensorType = r["SensorType"].ToString(),
                        currentValue = r["CurrentValue"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["CurrentValue"]),
                        unitOfMeasure = r["UnitOfMeasure"] == DBNull.Value ? null : r["UnitOfMeasure"].ToString(),
                        qosLevel = r["QosLevel"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["QosLevel"]),
                        status = r["Status"].ToString(),
                        lastUpdate = r["LastUpdate"] == DBNull.Value ? null : r["LastUpdate"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/sensors/reading", async (AddSensorReadingRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Sensör verisi girişi yalnızca PM tarafından yapılabilir." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                // Check if sensor type exists for unit
                var checkCmd = new SqliteCommand("SELECT SensorID FROM Sensors WHERE UnitID = @uid AND SensorType = @type", conn);
                checkCmd.Parameters.AddWithValue("@uid", req.UnitID);
                checkCmd.Parameters.AddWithValue("@type", req.SensorType);
                var sensorIdObj = await checkCmd.ExecuteScalarAsync();

                if (sensorIdObj != null)
                {
                    var updCmd = new SqliteCommand("UPDATE Sensors SET CurrentValue = @val, LastUpdate = datetime('now'), Status = 'Online' WHERE SensorID = @sid", conn);
                    updCmd.Parameters.AddWithValue("@val", req.CurrentValue);
                    updCmd.Parameters.AddWithValue("@sid", Convert.ToInt32(sensorIdObj));
                    await updCmd.ExecuteNonQueryAsync();
                }
                else
                {
                    var insCmd = new SqliteCommand(@"
                        INSERT INTO Sensors (UnitID, SensorType, CurrentValue, UnitOfMeasure, QosLevel, Status)
                        VALUES (@uid, @type, @val, @uom, 1, 'Online')", conn);
                    insCmd.Parameters.AddWithValue("@uid", req.UnitID);
                    insCmd.Parameters.AddWithValue("@type", req.SensorType);
                    insCmd.Parameters.AddWithValue("@val", req.CurrentValue);
                    insCmd.Parameters.AddWithValue("@uom", req.UnitOfMeasure ?? "");
                    await insCmd.ExecuteNonQueryAsync();
                }

                // Update unit battery / heartbeat
                var unitCmd = new SqliteCommand("UPDATE Units SET LastHeartbeat = datetime('now'), BatteryLevel = MAX(0, BatteryLevel - 1) WHERE UnitID = @uid", conn);
                unitCmd.Parameters.AddWithValue("@uid", req.UnitID);
                await unitCmd.ExecuteNonQueryAsync();

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        // ---------------------------------------------------------
        //  INVENTORY ENDPOINTS
        // ---------------------------------------------------------
    }
}

