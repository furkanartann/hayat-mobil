using HayatMobil.Api.Domain;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

/// <summary>
/// Uygulama cokerse StaffActiveFieldDuty satiri kalabilir; baslangicta eski kilitleri temizler.
/// </summary>
public static class StaleFieldDutyCleanup
{
    public static async Task RunAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "StaffActiveFieldDuty"))
            return;

        var minutes = OperationalEta.StaleFieldDutyLockMinutes;
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $@"
DELETE FROM StaffActiveFieldDuty
WHERE datetime(StartedAt) < datetime('now', '-{minutes} minutes');";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<bool> TableExistsAsync(SqliteConnection conn, string name)
    {
        await using var c = conn.CreateCommand();
        c.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=$n;";
        c.Parameters.AddWithValue("$n", name);
        var n = Convert.ToInt32(await c.ExecuteScalarAsync());
        return n > 0;
    }
}
