using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

public static class StaffApplicationService
{
    public static readonly string[] ApplicableRoles =
    [
        "Doktor", "SaglikParamedik", "AramaKurtarma", "Muhendis", "Lojistik", "Guvenlik", "IT"
    ];

    public static bool IsApplicableRole(string? role)
        => !string.IsNullOrWhiteSpace(role) && ApplicableRoles.Contains(role);

    public static async Task<(bool Ok, string? Error)> ApproveAsync(
        SqliteConnection conn, SqliteTransaction tx, int applicationId, int reviewerUserId, string? reviewNote)
    {
        await using var load = conn.CreateCommand();
        load.Transaction = tx;
        load.CommandText = @"
            SELECT ApplicationID, UserID, RequestedRole, Status
            FROM StaffApplications WHERE ApplicationID = @id;";
        load.Parameters.AddWithValue("@id", applicationId);
        await using var r = await load.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            return (false, "Başvuru bulunamadı.");

        var status = r["Status"].ToString() ?? "";
        if (status != "Pending")
            return (false, "Bu başvuru zaten işlenmiş.");

        var userId = Convert.ToInt32(r["UserID"]);
        var requestedRole = r["RequestedRole"].ToString() ?? "";
        if (!IsApplicableRole(requestedRole))
            return (false, "Geçersiz personel rolü.");

        await r.CloseAsync();

        await using (var userCheck = conn.CreateCommand())
        {
            userCheck.Transaction = tx;
            userCheck.CommandText = "SELECT UserType FROM Users WHERE UserID = @uid;";
            userCheck.Parameters.AddWithValue("@uid", userId);
            var ut = (await userCheck.ExecuteScalarAsync())?.ToString();
            if (ut != "Afetzede")
                return (false, "Yalnızca vatandaş hesapları personel başvurusu ile yükseltilebilir.");
        }

        await using (var updUser = conn.CreateCommand())
        {
            updUser.Transaction = tx;
            updUser.CommandText = "UPDATE Users SET UserType = @role WHERE UserID = @uid;";
            updUser.Parameters.AddWithValue("@role", requestedRole);
            updUser.Parameters.AddWithValue("@uid", userId);
            await updUser.ExecuteNonQueryAsync();
        }

        var spec = requestedRole;
        await using (var staff = conn.CreateCommand())
        {
            staff.Transaction = tx;
            staff.CommandText = @"
                INSERT INTO StaffProfiles (UserID, Specialization, CurrentStatus)
                SELECT @uid, @spec, 'Available'
                WHERE NOT EXISTS (SELECT 1 FROM StaffProfiles WHERE UserID = @uid);";
            staff.Parameters.AddWithValue("@uid", userId);
            staff.Parameters.AddWithValue("@spec", spec);
            await staff.ExecuteNonQueryAsync();
        }

        await using (var app = conn.CreateCommand())
        {
            app.Transaction = tx;
            app.CommandText = @"
                UPDATE StaffApplications
                SET Status = 'Approved', ReviewedByUserID = @rev, ReviewNote = @note, ReviewedAt = datetime('now')
                WHERE ApplicationID = @id;";
            app.Parameters.AddWithValue("@id", applicationId);
            app.Parameters.AddWithValue("@rev", reviewerUserId);
            app.Parameters.AddWithValue("@note", reviewNote ?? "");
            await app.ExecuteNonQueryAsync();
        }

        return (true, null);
    }

    public static async Task<(bool Ok, string? Error)> RejectAsync(
        SqliteConnection conn, SqliteTransaction tx, int applicationId, int reviewerUserId, string? reviewNote)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
            UPDATE StaffApplications
            SET Status = 'Rejected', ReviewedByUserID = @rev, ReviewNote = @note, ReviewedAt = datetime('now')
            WHERE ApplicationID = @id AND Status = 'Pending';";
        cmd.Parameters.AddWithValue("@id", applicationId);
        cmd.Parameters.AddWithValue("@rev", reviewerUserId);
        cmd.Parameters.AddWithValue("@note", reviewNote ?? "");
        var n = await cmd.ExecuteNonQueryAsync();
        return n > 0 ? (true, null) : (false, "Başvuru bulunamadı veya zaten işlenmiş.");
    }
}
