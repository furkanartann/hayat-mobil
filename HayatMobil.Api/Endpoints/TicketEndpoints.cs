using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class TicketEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/tickets", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var sql = @"
                    SELECT 
                        at.TicketID, at.RequestorUserID, u1.FullName AS RequestorName, 
                        at.RequestType, at.TriageColor, at.Status, at.AssignedStaffID, 
                        u2.FullName AS AssignedStaffName, at.UnitID, at.UpdateNote,
                        at.ReporterLat, at.ReporterLng, at.ReferredToDoctor,
                        at.CreatedAt, at.UpdatedAt 
                    FROM AssistanceTickets at
                    JOIN Users u1 ON at.RequestorUserID = u1.UserID
                    LEFT JOIN StaffProfiles sp ON at.AssignedStaffID = sp.StaffID
                    LEFT JOIN Users u2 ON sp.UserID = u2.UserID";
                if (auth.IsAfetzede)
                    sql += " WHERE at.RequestorUserID = @uid";
                sql += " ORDER BY at.CreatedAt DESC";

                var cmd = new SqliteCommand(sql, conn);
                if (auth.IsAfetzede)
                    cmd.Parameters.AddWithValue("@uid", auth.UserId);

                var list = new List<object>();
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    list.Add(new
                    {
                        ticketId = Convert.ToInt32(reader["TicketID"]),
                        requestorUserId = Convert.ToInt32(reader["RequestorUserID"]),
                        requestorName = reader["RequestorName"].ToString(),
                        requestType = reader["RequestType"].ToString(),
                        triageColor = reader["TriageColor"].ToString(),
                        status = reader["Status"].ToString(),
                        assignedStaffId = reader["AssignedStaffID"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["AssignedStaffID"]),
                        assignedStaffName = reader["AssignedStaffName"] == DBNull.Value ? null : reader["AssignedStaffName"].ToString(),
                        unitId = reader["UnitID"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["UnitID"]),
                        updateNote = reader["UpdateNote"].ToString(),
                        reporterLat = reader["ReporterLat"] == DBNull.Value ? (double?)null : Convert.ToDouble(reader["ReporterLat"]),
                        reporterLng = reader["ReporterLng"] == DBNull.Value ? (double?)null : Convert.ToDouble(reader["ReporterLng"]),
                        referredToDoctor = reader["ReferredToDoctor"] != DBNull.Value && Convert.ToInt32(reader["ReferredToDoctor"]) == 1,
                        createdAt = reader["CreatedAt"].ToString(),
                        updatedAt = reader["UpdatedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/tickets", async (CreateTicketRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (auth.IsAfetzede && req.RequestorUserID != auth.UserId)
                return Results.Json(new { error = "Yalnızca kendi adınıza yardım talebi oluşturabilirsiniz." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    INSERT INTO AssistanceTickets (RequestorUserID, RequestType, TriageColor, UnitID, UpdateNote, ReporterLat, ReporterLng, Status)
                    VALUES (@reqId, @type, @triage, @unitId, @note, @lat, @lng, 'Open')", conn);
                
                cmd.Parameters.AddWithValue("@reqId", req.RequestorUserID);
                cmd.Parameters.AddWithValue("@type", req.RequestType);
                cmd.Parameters.AddWithValue("@triage", req.TriageColor);
                cmd.Parameters.AddWithValue("@unitId", req.UnitID ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@note", req.UpdateNote ?? "");
                cmd.Parameters.AddWithValue("@lat", req.ReporterLat ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@lng", req.ReporterLng ?? (object)DBNull.Value);

                await cmd.ExecuteNonQueryAsync();
                var ticketId = await DbContext.GetLastInsertRowIdAsync(conn);

                // Add sync queue log
                var syncCmd = new SqliteCommand(
                    "INSERT INTO SyncQueue (TableName, Payload, SyncStatus, SyncedAt) VALUES ('AssistanceTickets', @payload, 'Completed', datetime('now'))", conn);
                syncCmd.Parameters.AddWithValue("@payload", $"Create Ticket {ticketId}");
                await syncCmd.ExecuteNonQueryAsync();

                return Results.Ok(new { success = true, ticketId });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/tickets/{id}/dispatch-eta", async (int id, int staffId, HttpContext ctx) =>
        {
            AuthUser.Require(ctx);
            if (staffId <= 0)
                return Results.BadRequest(new { error = "Personel seçilmedi." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var snap = await DispatchEtaService.ComputeTicketEtaAsync(conn, staffId, id);
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
        }).RequireAuthorization(AuthPolicies.Staff);

        app.MapPut("/api/tickets/{id}", async (int id, UpdateTicketRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanManageTickets())
                return Results.Json(new { error = "Bilet yönetimi için personel veya PM yetkisi gerekli." }, statusCode: 403);

            if (!auth.IsPm && req.Status == "In_Progress" && req.AssignedStaffID.HasValue
                && auth.StaffId != req.AssignedStaffID.Value)
                return Results.Json(new { error = "Yalnızca kendi personel kaydınıza bilet alabilirsiniz." }, statusCode: 403);

            if (req.Status == "In_Progress" && !req.AssignedStaffID.HasValue)
                return Results.BadRequest(new { error = "Intikal için bir saha personeli seçilmelidir. PM kendi adına talep alamaz." });

            if (auth.IsPm && req.Status == "In_Progress" && req.AssignedStaffID.HasValue
                && auth.StaffId == req.AssignedStaffID.Value)
                return Results.BadRequest(new { error = "PM yalnızca saha personeline yönlendirme yapabilir." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                try
                {
                    string? currentStatus = null;
                    int? previousStaffId = null;
                    string? requestType = null;
                    string? triageColor = null;
                    var referredToDoctor = false;
                    await using (var loadCmd = new SqliteCommand(
                        "SELECT Status, AssignedStaffID, RequestType, TriageColor, ReferredToDoctor FROM AssistanceTickets WHERE TicketID = @tid",
                        conn, (SqliteTransaction)tx))
                    {
                        loadCmd.Parameters.AddWithValue("@tid", id);
                        await using var reader = await loadCmd.ExecuteReaderAsync();
                        if (!await reader.ReadAsync())
                        {
                            await tx.RollbackAsync();
                            return Results.NotFound(new { error = "Bilet bulunamadı." });
                        }
                        currentStatus = reader["Status"].ToString();
                        if (reader["AssignedStaffID"] != DBNull.Value)
                            previousStaffId = Convert.ToInt32(reader["AssignedStaffID"]);
                        requestType = reader["RequestType"].ToString();
                        triageColor = reader["TriageColor"] == DBNull.Value ? null : reader["TriageColor"].ToString();
                        referredToDoctor = reader["ReferredToDoctor"] != DBNull.Value
                            && Convert.ToInt32(reader["ReferredToDoctor"]) == 1;
                    }

                    if (req.Status == "In_Progress" && req.AssignedStaffID.HasValue)
                    {
                        string? assigneeRole = null;
                        await using (var roleCmd = new SqliteCommand(@"
                            SELECT u.UserType FROM StaffProfiles sp
                            JOIN Users u ON sp.UserID = u.UserID
                            WHERE sp.StaffID = @sid", conn, (SqliteTransaction)tx))
                        {
                            roleCmd.Parameters.AddWithValue("@sid", req.AssignedStaffID.Value);
                            assigneeRole = (await roleCmd.ExecuteScalarAsync())?.ToString();
                        }

                        if (assigneeRole is null)
                        {
                            await tx.RollbackAsync();
                            return Results.BadRequest(new { error = "Seçilen personel bulunamadı." });
                        }

                        if (!TicketDispatchRules.StaffMatchesTicket(
                                assigneeRole, requestType ?? "", triageColor, referredToDoctor, currentStatus ?? "Open"))
                        {
                            await tx.RollbackAsync();
                            return Results.BadRequest(new { error = "Bu personel bu talep türü için uygun değil. Örn. tıbbi talep → paramedik/doktor, lojistik talep → lojistik." });
                        }

                        await using var dutyCmd = new SqliteCommand(
                            "SELECT COUNT(*) FROM StaffActiveFieldDuty WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                        dutyCmd.Parameters.AddWithValue("@sid", req.AssignedStaffID.Value);
                        if (Convert.ToInt32(await dutyCmd.ExecuteScalarAsync()) > 0)
                        {
                            await tx.RollbackAsync();
                            return Results.BadRequest(new { error = "Personel şu an aktif bir saha görevinde." });
                        }

                        await using var busyCmd = new SqliteCommand(@"
                            SELECT COUNT(*) FROM AssistanceTickets
                            WHERE AssignedStaffID = @sid AND Status = 'In_Progress' AND TicketID != @tid", conn, (SqliteTransaction)tx);
                        busyCmd.Parameters.AddWithValue("@sid", req.AssignedStaffID.Value);
                        busyCmd.Parameters.AddWithValue("@tid", id);
                        if (Convert.ToInt32(await busyCmd.ExecuteScalarAsync()) > 0)
                        {
                            await tx.RollbackAsync();
                            return Results.BadRequest(new { error = "Seçilen personel zaten başka bir aktif görevde (In_Progress)." });
                        }
                    }

                    string updateSql = req.Status == "In_Progress" && currentStatus == "Open"
                        ? @"UPDATE AssistanceTickets
                            SET Status = @status, AssignedStaffID = @staffId, UpdateNote = @note, UpdatedAt = datetime('now')
                            WHERE TicketID = @tid AND Status = 'Open'"
                        : @"UPDATE AssistanceTickets
                            SET Status = @status, AssignedStaffID = @staffId, UpdateNote = @note, UpdatedAt = datetime('now')
                            WHERE TicketID = @tid";

                    await using var cmd = new SqliteCommand(updateSql, conn, (SqliteTransaction)tx);
                    cmd.Parameters.AddWithValue("@status", req.Status);
                    cmd.Parameters.AddWithValue("@staffId", req.AssignedStaffID ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@note", req.UpdateNote ?? "");
                    cmd.Parameters.AddWithValue("@tid", id);

                    var rows = await cmd.ExecuteNonQueryAsync();
                    if (rows == 0)
                    {
                        await tx.RollbackAsync();
                        return Results.Conflict(new { error = "Bilet başka bir personel tarafından alınmış veya güncellenemiyor." });
                    }

                    if (previousStaffId.HasValue &&
                        (req.Status is "Resolved" or "Cancelled" ||
                         (req.AssignedStaffID.HasValue && previousStaffId != req.AssignedStaffID)))
                    {
                        await using var freeCmd = new SqliteCommand(
                            "UPDATE StaffProfiles SET CurrentStatus = 'Available' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                        freeCmd.Parameters.AddWithValue("@sid", previousStaffId.Value);
                        await freeCmd.ExecuteNonQueryAsync();
                    }

                    if (req.AssignedStaffID.HasValue && req.Status == "In_Progress")
                    {
                        await using var staffCmd = new SqliteCommand(
                            "UPDATE StaffProfiles SET CurrentStatus = 'On_Duty' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                        staffCmd.Parameters.AddWithValue("@sid", req.AssignedStaffID.Value);
                        await staffCmd.ExecuteNonQueryAsync();
                    }

                    if (req.Status == "In_Progress" && req.AssignedStaffID.HasValue && currentStatus == "Open")
                    {
                        var dispatcherId = auth.IsPm ? (req.DispatcherUserID ?? auth.UserId) : auth.UserId;
                        await AssignmentLogWriter.InsertAsync(conn, dispatcherId, "Ticket", id, req.AssignedStaffID.Value,
                            req.UpdateNote ?? "Manuel bilet ataması", (SqliteTransaction)tx);
                    }

                    await tx.CommitAsync();
                    return Results.Ok(new { success = true });
                }
                catch (SqliteException sqlEx) when (sqlEx.Message.Contains("AssignedStaffID") && sqlEx.Message.Contains("UNIQUE"))
                {
                    await tx.RollbackAsync();
                    return Results.BadRequest(new { error = "Seçilen personel zaten başka bir aktif görevde (In_Progress)." });
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
        }).RequireAuthorization(AuthPolicies.Staff);

        // ---------------------------------------------------------
        //  UNITS & SENSORS ENDPOINTS
        // ---------------------------------------------------------
    }
}

