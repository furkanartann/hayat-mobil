using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

public static class AssignmentLogWriter
{
    public static async Task InsertAsync(
        SqliteConnection conn,
        int dispatcherUserId,
        string crisisType,
        int crisisId,
        int staffId,
        string? note = null,
        SqliteTransaction? tx = null)
    {
        await using var c = conn.CreateCommand();
        if (tx != null)
            c.Transaction = tx;
        c.CommandText = @"
INSERT INTO AssignmentLog (DispatcherUserID, CrisisType, CrisisId, StaffID, Note)
VALUES ($d, $t, $c, $s, $n);";
        c.Parameters.AddWithValue("$d", dispatcherUserId);
        c.Parameters.AddWithValue("$t", crisisType);
        c.Parameters.AddWithValue("$c", crisisId);
        c.Parameters.AddWithValue("$s", staffId);
        c.Parameters.AddWithValue("$n", note ?? (object)DBNull.Value);
        await c.ExecuteNonQueryAsync();
    }
}
