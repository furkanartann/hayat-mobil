using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

/// <summary>
/// Ayni personel icin birden fazla In_Progress bilet (eski/hafta verisi) kismi tekil indeksi engeller.
/// En dusuk TicketID disinda digerlerini Open + atanmamis yapar.
/// </summary>
public static class TicketInProgressConstraintRepair
{
    public static async Task RepairDuplicateInProgressAssignmentsAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "AssistanceTickets"))
            return;

        var dupStaff = new List<int>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
SELECT AssignedStaffID FROM AssistanceTickets
WHERE Status = 'In_Progress' AND AssignedStaffID IS NOT NULL
GROUP BY AssignedStaffID
HAVING COUNT(*) > 1;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
                dupStaff.Add(Convert.ToInt32(r[0]));
        }

        foreach (var staffId in dupStaff)
        {
            var ticketIds = new List<int>();
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT TicketID FROM AssistanceTickets
WHERE Status = 'In_Progress' AND AssignedStaffID = $s
ORDER BY TicketID ASC;";
                cmd.Parameters.AddWithValue("$s", staffId);
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    ticketIds.Add(Convert.ToInt32(r[0]));
            }

            if (ticketIds.Count <= 1)
                continue;

            var keepId = ticketIds[0];
            for (var i = 1; i < ticketIds.Count; i++)
            {
                var tid = ticketIds[i];
                await using var u = conn.CreateCommand();
                u.CommandText = @"
UPDATE AssistanceTickets
SET Status = 'Open',
    AssignedStaffID = NULL,
    UpdateNote =
        CASE
            WHEN UpdateNote IS NULL OR TRIM(UpdateNote) = '' THEN
                '[sistem] Tek In_Progress kurali: cift kayit onarildi, yeniden atama bekleniyor.'
            ELSE
                UpdateNote || ' [sistem] Tek In_Progress onarildi — yeniden atama.'
        END,
    UpdatedAt = datetime('now')
WHERE TicketID = $tid;";
                u.Parameters.AddWithValue("$tid", tid);
                await u.ExecuteNonQueryAsync();
            }
        }
    }

    private static async Task<bool> TableExistsAsync(SqliteConnection conn, string name)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=$n;";
        cmd.Parameters.AddWithValue("$n", name);
        var c = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return c > 0;
    }
}
