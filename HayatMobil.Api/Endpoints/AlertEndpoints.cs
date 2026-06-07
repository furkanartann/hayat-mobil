using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class AlertEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/ai-detections", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("SELECT DetectionID, UnitID, CameraID, DetectionType, PersonCount, ImmobilePersonCount, PersonFound, ConfidenceScore, Latitude, Longitude, DetectedAt FROM AiDetections ORDER BY DetectedAt DESC", conn);
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        detectionId = Convert.ToInt32(r["DetectionID"]),
                        unitId = Convert.ToInt32(r["UnitID"]),
                        cameraId = r["CameraID"].ToString(),
                        detectionType = r["DetectionType"].ToString(),
                        personCount = Convert.ToInt32(r["PersonCount"]),
                        immobilePersonCount = Convert.ToInt32(r["ImmobilePersonCount"]),
                        personFound = Convert.ToInt32(r["PersonFound"]),
                        confidenceScore = Convert.ToDouble(r["ConfidenceScore"]),
                        latitude = r["Latitude"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["Latitude"]),
                        longitude = r["Longitude"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["Longitude"]),
                        detectedAt = r["DetectedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/ai-detections", async (CreateAiDetectionRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanAccessFieldOps())
                return Results.Json(new { error = "AI tespiti oluşturmak için saha teknik veya PM yetkisi gerekli." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    INSERT INTO AiDetections (UnitID, CameraID, DetectionType, PersonCount, ImmobilePersonCount, PersonFound, ConfidenceScore, Latitude, Longitude)
                    VALUES (@uid, @cam, @type, @pCount, @iCount, @found, @conf, @lat, @lng)", conn);
                
                cmd.Parameters.AddWithValue("@uid", req.UnitID);
                cmd.Parameters.AddWithValue("@cam", req.CameraID ?? "CAM_01");
                cmd.Parameters.AddWithValue("@type", req.DetectionType);
                cmd.Parameters.AddWithValue("@pCount", req.PersonCount);
                cmd.Parameters.AddWithValue("@iCount", req.ImmobilePersonCount);
                cmd.Parameters.AddWithValue("@found", req.PersonFound);
                cmd.Parameters.AddWithValue("@conf", req.ConfidenceScore);
                cmd.Parameters.AddWithValue("@lat", req.Latitude ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@lng", req.Longitude ?? (object)DBNull.Value);

                await cmd.ExecuteNonQueryAsync();
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.FieldOps);

        // ---------------------------------------------------------
        //  ALERTS & DISASTER SCENARIOS ENDPOINTS
        // ---------------------------------------------------------
        app.MapGet("/api/alerts", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("SELECT AlertID, Title, Message, Severity, CreatedAt FROM Alerts ORDER BY CreatedAt DESC LIMIT 20", conn);
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        alertId = Convert.ToInt32(r["AlertID"]),
                        title = r["Title"].ToString(),
                        message = r["Message"].ToString(),
                        severity = r["Severity"].ToString(),
                        createdAt = r["CreatedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/alerts", async (CreateAlertRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Duyuru oluşturmak için PM yetkisi gerekli." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("INSERT INTO Alerts (Title, Message, Severity) VALUES (@title, @msg, @sev)", conn);
                cmd.Parameters.AddWithValue("@title", req.Title);
                cmd.Parameters.AddWithValue("@msg", req.Message);
                cmd.Parameters.AddWithValue("@sev", req.Severity);

                await cmd.ExecuteNonQueryAsync();
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

    }
}

