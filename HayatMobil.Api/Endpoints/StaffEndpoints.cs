using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class StaffEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/staff", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    SELECT sp.StaffID, sp.UserID, u.FullName, u.UserType, sp.Specialization, sp.CurrentStatus, sp.UnitID 
                    FROM StaffProfiles sp
                    JOIN Users u ON sp.UserID = u.UserID", conn);

                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        staffId = Convert.ToInt32(r["StaffID"]),
                        userId = Convert.ToInt32(r["UserID"]),
                        fullName = r["FullName"].ToString(),
                        userType = r["UserType"].ToString(),
                        specialization = r["Specialization"].ToString(),
                        currentStatus = r["CurrentStatus"].ToString(),
                        unitId = r["UnitID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["UnitID"])
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Logistics);

        app.MapGet("/api/staff/{staffId}/duty", async (int staffId, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm && auth.StaffId != staffId)
                return Results.Json(new { error = "Başka personelin görev bilgisine erişemezsiniz." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand("SELECT StaffID, DutyType, RefId, Summary, StartedAt, EtaMinutes FROM StaffActiveFieldDuty WHERE StaffID = @sid", conn);
                cmd.Parameters.AddWithValue("@sid", staffId);

                await using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    return Results.Ok(new
                    {
                        staffId = Convert.ToInt32(r["StaffID"]),
                        dutyType = r["DutyType"].ToString(),
                        refId = Convert.ToInt32(r["RefId"]),
                        summary = r["Summary"].ToString(),
                        startedAt = r["StartedAt"].ToString(),
                        etaMinutes = Convert.ToInt32(r["EtaMinutes"])
                    });
                }
                return Results.Json((object?)null);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/staff/dispatch-eta", async (int staffId, string dutyType, int refId, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanDispatch())
                return Results.Json(new { error = "Yalnızca PM tahmini varış süresini sorgulayabilir." }, statusCode: 403);

            if (staffId <= 0 || refId <= 0 || dutyType is not ("Unit" or "Sensor" or "Missing"))
                return Results.BadRequest(new { error = "Geçersiz görev parametreleri." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var snap = await DispatchEtaService.ComputeFieldDutyEtaAsync(conn, staffId, dutyType, refId);
                return Results.Ok(new
                {
                    etaMinutes = snap.EtaMinutes,
                    distanceMeters = snap.DistanceMeters,
                    durationSeconds = snap.DurationSeconds,
                    fallback = snap.Fallback,
                    originSource = snap.OriginSource,
                    targetSource = snap.TargetSource
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPost("/api/staff/assign-duty", async (AssignDutyRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanDispatch())
                return Results.Json(new { error = "Saha görevi ataması yalnızca PM tarafından yapılabilir." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var etaSnap = await DispatchEtaService.ComputeFieldDutyEtaAsync(
                    conn, req.StaffID, req.DutyType, req.RefId);
                var eta = etaSnap.EtaMinutes;

                await using var tx = await conn.BeginTransactionAsync();
                try
                {
                    var ticketCmd = new SqliteCommand(
                        "SELECT COUNT(*) FROM AssistanceTickets WHERE AssignedStaffID = @sid AND Status = 'In_Progress'",
                        conn, (SqliteTransaction)tx);
                    ticketCmd.Parameters.AddWithValue("@sid", req.StaffID);
                    if (Convert.ToInt32(await ticketCmd.ExecuteScalarAsync()) > 0)
                    {
                        await tx.RollbackAsync();
                        return Results.BadRequest(new { error = "Personel şu an aktif bir triyaj biletinde (In_Progress) görevli." });
                    }

                    var cmd = new SqliteCommand(@"
                        INSERT OR REPLACE INTO StaffActiveFieldDuty (StaffID, DutyType, RefId, Summary, StartedAt, EtaMinutes)
                        VALUES (@sid, @type, @refId, @summary, datetime('now'), @eta)", conn, (SqliteTransaction)tx);
                    cmd.Parameters.AddWithValue("@sid", req.StaffID);
                    cmd.Parameters.AddWithValue("@type", req.DutyType);
                    cmd.Parameters.AddWithValue("@refId", req.RefId);
                    cmd.Parameters.AddWithValue("@summary", req.Summary);
                    cmd.Parameters.AddWithValue("@eta", eta);
                    await cmd.ExecuteNonQueryAsync();

                    var statusCmd = new SqliteCommand(
                        "UPDATE StaffProfiles SET CurrentStatus = 'On_Duty' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                    statusCmd.Parameters.AddWithValue("@sid", req.StaffID);
                    await statusCmd.ExecuteNonQueryAsync();

                    await AssignmentLogWriter.InsertAsync(conn, auth.UserId, req.DutyType, req.RefId,
                        req.StaffID, req.Summary, (SqliteTransaction)tx);

                    await tx.CommitAsync();
                    return Results.Ok(new
                    {
                        success = true,
                        etaMinutes = eta,
                        distanceMeters = etaSnap.DistanceMeters,
                        durationSeconds = etaSnap.DurationSeconds,
                        fallback = etaSnap.Fallback
                    });
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapDelete("/api/staff/{staffId}/duty", async (int staffId, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm && auth.StaffId != staffId)
                return Results.Json(new { error = "Yalnızca kendi görevinizi tamamlayabilirsiniz." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                await using var tx = await conn.BeginTransactionAsync();
                try
                {
                    var cmd = new SqliteCommand("DELETE FROM StaffActiveFieldDuty WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                    cmd.Parameters.AddWithValue("@sid", staffId);
                    await cmd.ExecuteNonQueryAsync();

                    var statusCmd = new SqliteCommand("UPDATE StaffProfiles SET CurrentStatus = 'Available' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                    statusCmd.Parameters.AddWithValue("@sid", staffId);
                    await statusCmd.ExecuteNonQueryAsync();

                    await tx.CommitAsync();
                    return Results.Ok(new { success = true });
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        // ---------------------------------------------------------
        //  MISSING PERSONS ENDPOINTS
        // ---------------------------------------------------------
    }
}

