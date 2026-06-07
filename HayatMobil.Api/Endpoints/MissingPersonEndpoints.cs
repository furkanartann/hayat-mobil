using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class MissingPersonEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/missing-persons", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    SELECT mp.ReportID, mp.ReporterUserID, u.FullName AS ReporterName, 
                           mp.MissingPersonName, mp.Age, mp.PhysicalDescription, 
                           mp.LastKnownLat, mp.LastKnownLong, mp.Status, mp.ReportedAt 
                    FROM MissingPersons mp
                    JOIN Users u ON mp.ReporterUserID = u.UserID
                    ORDER BY mp.ReportedAt DESC", conn);

                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        reportId = Convert.ToInt32(r["ReportID"]),
                        reporterUserId = Convert.ToInt32(r["ReporterUserID"]),
                        reporterName = r["ReporterName"].ToString(),
                        missingPersonName = r["MissingPersonName"].ToString(),
                        age = r["Age"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["Age"]),
                        physicalDescription = r["PhysicalDescription"].ToString(),
                        lastKnownLat = r["LastKnownLat"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["LastKnownLat"]),
                        lastKnownLong = r["LastKnownLong"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["LastKnownLong"]),
                        status = r["Status"].ToString(),
                        reportedAt = r["ReportedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/missing-persons", async (CreateMissingReportRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (req.ReporterUserID != auth.UserId && !auth.IsPm)
                return Results.Json(new { error = "Yalnızca kendi adınıza kayıp bildirimi oluşturabilirsiniz." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    INSERT INTO MissingPersons (ReporterUserID, MissingPersonName, Age, PhysicalDescription, LastKnownLat, LastKnownLong, Status)
                    VALUES (@repId, @name, @age, @desc, @lat, @lng, 'Missing')", conn);
                
                cmd.Parameters.AddWithValue("@repId", req.ReporterUserID);
                cmd.Parameters.AddWithValue("@name", req.MissingPersonName);
                cmd.Parameters.AddWithValue("@age", req.Age ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@desc", req.PhysicalDescription ?? "");
                cmd.Parameters.AddWithValue("@lat", req.LastKnownLat ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@lng", req.LastKnownLong ?? (object)DBNull.Value);

                await cmd.ExecuteNonQueryAsync();
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPut("/api/missing-persons/{id}/status", async (int id, UpdateMissingStatusRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsStaff)
                return Results.Json(new { error = "Kayıp durumu güncellemesi için personel yetkisi gerekli." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("UPDATE MissingPersons SET Status = @status WHERE ReportID = @rid", conn);
                cmd.Parameters.AddWithValue("@status", req.Status);
                cmd.Parameters.AddWithValue("@rid", id);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return Results.NotFound(new { error = "Kayıp kişi bildirimi bulunamadı." });
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Staff);

        // ---------------------------------------------------------
        //  MEDICAL RECORDS ENDPOINTS
        // ---------------------------------------------------------
    }
}

