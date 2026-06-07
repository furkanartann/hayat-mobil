using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class AuthEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapPost("/api/auth/login", async (LoginRequest req) =>
        {
            if (string.IsNullOrWhiteSpace(req.IdentityNo) || string.IsNullOrWhiteSpace(req.Pin))
            {
                return Results.BadRequest(new { error = "T.C. Kimlik No ve şifre boş olamaz." });
            }

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(
                    "SELECT UserID, FullName, UserType, PinHash, SafetyStatus FROM Users WHERE IdentityNo = @id", conn);
                cmd.Parameters.AddWithValue("@id", req.IdentityNo.Trim());

                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var dbHash = reader["PinHash"] == DBNull.Value ? string.Empty : reader["PinHash"].ToString() ?? string.Empty;
                    var inputHash = ApiHashHelper.ComputeSha256Hash(req.Pin);

                    if (dbHash == inputHash)
                    {
                        var userId = Convert.ToInt32(reader["UserID"]);
                        var fullName = reader["FullName"].ToString()!;
                        var userType = reader["UserType"].ToString()!;
                        var safetyStatus = reader["SafetyStatus"].ToString()!;

                        // Check if user is staff and get StaffID
                        int? staffId = null;
                        var staffCmd = new SqliteCommand("SELECT StaffID FROM StaffProfiles WHERE UserID = @uid", conn);
                        staffCmd.Parameters.AddWithValue("@uid", userId);
                        var sIdObj = await staffCmd.ExecuteScalarAsync();
                        if (sIdObj != null && sIdObj != DBNull.Value)
                        {
                            staffId = Convert.ToInt32(sIdObj);
                        }

                        var (token, expiresAt) = JwtTokenService.CreateToken(userId, fullName, userType, staffId);
                        return Results.Ok(new
                        {
                            token,
                            expiresAt,
                            userId,
                            fullName,
                            userType,
                            safetyStatus,
                            staffId
                        });
                    }
                }
                return Results.Json(new { error = "T.C. Kimlik No veya şifre hatalı." }, statusCode: 401);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).AllowAnonymous();

        app.MapGet("/api/auth/setup-status", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT COUNT(*) FROM Users WHERE UserType = 'PM';";
                var pmCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                return Results.Ok(new { needsPmBootstrap = pmCount == 0 });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).AllowAnonymous();

        app.MapPost("/api/auth/register", async (RegisterRequest req) =>
        {
            if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.IdentityNo) || string.IsNullOrWhiteSpace(req.Pin))
            {
                return Results.BadRequest(new { error = "Ad Soyad, T.C. Kimlik No ve şifre alanları zorunludur." });
            }

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                // Start Transaction
                await using var tx = await conn.BeginTransactionAsync();

                try
                {
                    await using var checkPm = new SqliteCommand(
                        "SELECT COUNT(*) FROM Users WHERE UserType = 'PM'", conn, (SqliteTransaction)tx);
                    var pmCount = Convert.ToInt32(await checkPm.ExecuteScalarAsync());
                    var userType = pmCount == 0 ? "PM" : "Afetzede";

                    var cmd = new SqliteCommand(@"
                        INSERT INTO Users (FullName, UserType, IdentityNo, Phone, PinHash, SafetyStatus)
                        VALUES (@name, @type, @id, @phone, @hash, 'Safe')", conn, (SqliteTransaction)tx);
                
                    cmd.Parameters.AddWithValue("@name", req.FullName.Trim());
                    cmd.Parameters.AddWithValue("@type", userType);
                    cmd.Parameters.AddWithValue("@id", req.IdentityNo.Trim());
                    cmd.Parameters.AddWithValue("@phone", req.Phone?.Trim() ?? "");
                    cmd.Parameters.AddWithValue("@hash", ApiHashHelper.ComputeSha256Hash(req.Pin));

                    await cmd.ExecuteNonQueryAsync();

                    var userId = await DbContext.GetLastInsertRowIdAsync(conn, (SqliteTransaction)tx);

                    await tx.CommitAsync();
                    return Results.Ok(new { success = true, userId, userType });
                }
                catch (SqliteException ex)
                {
                    await tx.RollbackAsync();
                    if (ex.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) || ex.SqliteErrorCode == 19)
                    {
                        if (ex.Message.Contains("IdentityNo", StringComparison.OrdinalIgnoreCase))
                        {
                            return Results.BadRequest(new { error = "Bu TC Kimlik No ile kayıtlı bir kullanıcı zaten var." });
                        }
                        return Results.BadRequest(new { error = $"Kayıt sırasında kısıt ihlali oluştu: {ex.Message}" });
                    }
                    return Results.BadRequest(new { error = $"Veritabanı hatası: {ex.Message}" });
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return Results.Json(new { error = ex.Message }, statusCode: 500);
                }
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).AllowAnonymous();

        app.MapGet("/api/auth/me", async (HttpContext ctx) =>
        {
            var auth = AuthUser.TryGet(ctx);
            if (auth is null)
                return Results.Unauthorized();

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var cmd = new SqliteCommand(
                    "SELECT FullName, UserType, SafetyStatus FROM Users WHERE UserID = @uid", conn);
                cmd.Parameters.AddWithValue("@uid", auth.UserId);
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return Results.Unauthorized();

                int? staffId = auth.StaffId;
                if (!staffId.HasValue)
                {
                    var staffCmd = new SqliteCommand("SELECT StaffID FROM StaffProfiles WHERE UserID = @uid", conn);
                    staffCmd.Parameters.AddWithValue("@uid", auth.UserId);
                    var sIdObj = await staffCmd.ExecuteScalarAsync();
                    if (sIdObj != null && sIdObj != DBNull.Value)
                        staffId = Convert.ToInt32(sIdObj);
                }

                return Results.Ok(new
                {
                    userId = auth.UserId,
                    fullName = reader["FullName"].ToString(),
                    userType = reader["UserType"].ToString(),
                    safetyStatus = reader["SafetyStatus"].ToString(),
                    staffId
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/auth/refresh-session", async (HttpContext ctx) =>
        {
            var auth = AuthUser.TryGet(ctx);
            if (auth is null)
                return Results.Unauthorized();

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var cmd = new SqliteCommand(
                    "SELECT FullName, UserType, SafetyStatus FROM Users WHERE UserID = @uid", conn);
                cmd.Parameters.AddWithValue("@uid", auth.UserId);
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return Results.Unauthorized();

                var fullName = reader["FullName"].ToString()!;
                var userType = reader["UserType"].ToString()!;
                var safetyStatus = reader["SafetyStatus"].ToString()!;

                int? staffId = null;
                var staffCmd = new SqliteCommand("SELECT StaffID FROM StaffProfiles WHERE UserID = @uid", conn);
                staffCmd.Parameters.AddWithValue("@uid", auth.UserId);
                var sIdObj = await staffCmd.ExecuteScalarAsync();
                if (sIdObj != null && sIdObj != DBNull.Value)
                    staffId = Convert.ToInt32(sIdObj);

                var (token, expiresAt) = JwtTokenService.CreateToken(auth.UserId, fullName, userType, staffId);
                return Results.Ok(new
                {
                    token,
                    expiresAt,
                    userId = auth.UserId,
                    fullName,
                    userType,
                    safetyStatus,
                    staffId
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/staff-applications/mine", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT ApplicationID, RequestedRole, Institution, CredentialNote, ApplicationNote,
                           Status, ReviewNote, CreatedAt, ReviewedAt
                    FROM StaffApplications
                    WHERE UserID = @uid
                    ORDER BY ApplicationID DESC
                    LIMIT 1;";
                cmd.Parameters.AddWithValue("@uid", auth.UserId);
                await using var r = await cmd.ExecuteReaderAsync();
                if (!await r.ReadAsync())
                    return Results.Json((object?)null);

                return Results.Ok(new
                {
                    applicationId = Convert.ToInt32(r["ApplicationID"]),
                    requestedRole = r["RequestedRole"].ToString(),
                    institution = r["Institution"].ToString(),
                    credentialNote = r["CredentialNote"] == DBNull.Value ? null : r["CredentialNote"].ToString(),
                    applicationNote = r["ApplicationNote"] == DBNull.Value ? null : r["ApplicationNote"].ToString(),
                    status = r["Status"].ToString(),
                    reviewNote = r["ReviewNote"] == DBNull.Value ? null : r["ReviewNote"].ToString(),
                    createdAt = r["CreatedAt"].ToString(),
                    reviewedAt = r["ReviewedAt"] == DBNull.Value ? null : r["ReviewedAt"].ToString()
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/staff-applications", async (HttpContext ctx, StaffApplicationRequest req) =>
        {
            var auth = AuthUser.Require(ctx);
            if (auth.UserType != "Afetzede")
                return Results.Json(new { error = "Personel başvurusu yalnızca vatandaş hesaplarından yapılabilir." }, statusCode: 403);

            if (!StaffApplicationService.IsApplicableRole(req.RequestedRole))
                return Results.BadRequest(new { error = "Geçersiz personel rolü seçildi." });
            if (string.IsNullOrWhiteSpace(req.Institution))
                return Results.BadRequest(new { error = "Kurum / birim bilgisi zorunludur." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                await using (var pending = conn.CreateCommand())
                {
                    pending.CommandText = "SELECT COUNT(*) FROM StaffApplications WHERE UserID = @uid AND Status = 'Pending';";
                    pending.Parameters.AddWithValue("@uid", auth.UserId);
                    if (Convert.ToInt32(await pending.ExecuteScalarAsync()) > 0)
                        return Results.BadRequest(new { error = "Bekleyen bir başvurunuz zaten var." });
                }

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    INSERT INTO StaffApplications (UserID, RequestedRole, Institution, CredentialNote, ApplicationNote)
                    VALUES (@uid, @role, @inst, @cred, @note);";
                cmd.Parameters.AddWithValue("@uid", auth.UserId);
                cmd.Parameters.AddWithValue("@role", req.RequestedRole);
                cmd.Parameters.AddWithValue("@inst", req.Institution.Trim());
                cmd.Parameters.AddWithValue("@cred", req.CredentialNote?.Trim() ?? "");
                cmd.Parameters.AddWithValue("@note", req.ApplicationNote?.Trim() ?? "");
                await cmd.ExecuteNonQueryAsync();
                var id = await DbContext.GetLastInsertRowIdAsync(conn);
                return Results.Ok(new { success = true, applicationId = id });
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
            {
                return Results.BadRequest(new { error = "Bekleyen bir başvurunuz zaten var." });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/staff-applications", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Başvuruları yalnızca PM görüntüleyebilir." }, statusCode: 403);

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT a.ApplicationID, a.UserID, u.FullName, u.IdentityNo, u.Phone,
                           a.RequestedRole, a.Institution, a.CredentialNote, a.ApplicationNote,
                           a.Status, a.ReviewNote, a.CreatedAt, a.ReviewedAt
                    FROM StaffApplications a
                    JOIN Users u ON u.UserID = a.UserID
                    ORDER BY CASE a.Status WHEN 'Pending' THEN 0 ELSE 1 END, a.ApplicationID DESC;";
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        applicationId = Convert.ToInt32(r["ApplicationID"]),
                        userId = Convert.ToInt32(r["UserID"]),
                        fullName = r["FullName"].ToString(),
                        identityNo = r["IdentityNo"].ToString(),
                        phone = r["Phone"].ToString(),
                        requestedRole = r["RequestedRole"].ToString(),
                        institution = r["Institution"].ToString(),
                        credentialNote = r["CredentialNote"] == DBNull.Value ? null : r["CredentialNote"].ToString(),
                        applicationNote = r["ApplicationNote"] == DBNull.Value ? null : r["ApplicationNote"].ToString(),
                        status = r["Status"].ToString(),
                        reviewNote = r["ReviewNote"] == DBNull.Value ? null : r["ReviewNote"].ToString(),
                        createdAt = r["CreatedAt"].ToString(),
                        reviewedAt = r["ReviewedAt"] == DBNull.Value ? null : r["ReviewedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPut("/api/staff-applications/{id:int}/review", async (HttpContext ctx, int id, ReviewStaffApplicationRequest req) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Başvuruları yalnızca PM onaylayabilir." }, statusCode: 403);

            var action = req.Action?.Trim() ?? "";
            if (!action.Equals("Approve", StringComparison.OrdinalIgnoreCase)
                && !action.Equals("Reject", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Geçersiz işlem. Approve veya Reject gönderin." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                await using var tx = await conn.BeginTransactionAsync();

                var result = action.Equals("Approve", StringComparison.OrdinalIgnoreCase)
                    ? await StaffApplicationService.ApproveAsync(conn, (SqliteTransaction)tx, id, auth.UserId, req.ReviewNote)
                    : await StaffApplicationService.RejectAsync(conn, (SqliteTransaction)tx, id, auth.UserId, req.ReviewNote);

                if (!result.Ok)
                {
                    await tx.RollbackAsync();
                    return Results.BadRequest(new { error = result.Error });
                }

                await tx.CommitAsync();
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();
    }
}

