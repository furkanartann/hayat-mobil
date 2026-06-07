using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Services;

internal static class AssemblyPointService
{
    public static async Task<List<object>> ListAllAsync()
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        return await ReadListAsync(conn, activeOnly: false);
    }

    /// <summary>Harita katmanı: PM her zaman görür; diğer roller yalnızca aktif afet varken.</summary>
    public static async Task<List<object>> ListForMapAsync(bool isPm)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();

        if (!isPm)
        {
            await using var c = conn.CreateCommand();
            c.CommandText = "SELECT COUNT(*) FROM DisasterZones WHERE Active = 1;";
            if (Convert.ToInt32(await c.ExecuteScalarAsync()) == 0)
                return [];
        }

        return await ReadListAsync(conn, activeOnly: true);
    }

    public static async Task<int> CreateAsync(CreateAssemblyPointRequest req)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO AssemblyPoints (Name, Lat, Lng, Capacity, Notes, Active)
            VALUES (@name, @lat, @lng, @cap, @notes, @active);
            SELECT last_insert_rowid();";
        cmd.Parameters.AddWithValue("@name", req.Name.Trim());
        cmd.Parameters.AddWithValue("@lat", req.Lat);
        cmd.Parameters.AddWithValue("@lng", req.Lng);
        cmd.Parameters.AddWithValue("@cap", req.Capacity.HasValue ? req.Capacity.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(req.Notes) ? DBNull.Value : req.Notes.Trim());
        cmd.Parameters.AddWithValue("@active", req.Active ? 1 : 0);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public static async Task<bool> UpdateAsync(int pointId, UpdateAssemblyPointRequest req)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE AssemblyPoints
            SET Name = @name, Lat = @lat, Lng = @lng, Capacity = @cap, Notes = @notes, Active = @active
            WHERE PointID = @id;";
        cmd.Parameters.AddWithValue("@id", pointId);
        cmd.Parameters.AddWithValue("@name", req.Name.Trim());
        cmd.Parameters.AddWithValue("@lat", req.Lat);
        cmd.Parameters.AddWithValue("@lng", req.Lng);
        cmd.Parameters.AddWithValue("@cap", req.Capacity.HasValue ? req.Capacity.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(req.Notes) ? DBNull.Value : req.Notes.Trim());
        cmd.Parameters.AddWithValue("@active", req.Active ? 1 : 0);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public static async Task<bool> DeleteAsync(int pointId)
    {
        await using var conn = DbContext.GetConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM AssemblyPoints WHERE PointID = @id;";
        cmd.Parameters.AddWithValue("@id", pointId);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    private static async Task<List<object>> ReadListAsync(SqliteConnection conn, bool activeOnly)
    {
        var list = new List<object>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT PointID, Name, Lat, Lng, Capacity, Notes, Active, CreatedAt
            FROM AssemblyPoints"
            + (activeOnly ? " WHERE Active = 1" : "")
            + " ORDER BY Name;";
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new
            {
                pointId = Convert.ToInt32(r["PointID"]),
                name = r["Name"].ToString(),
                lat = Convert.ToDouble(r["Lat"]),
                lng = Convert.ToDouble(r["Lng"]),
                latitude = Convert.ToDouble(r["Lat"]),
                longitude = Convert.ToDouble(r["Lng"]),
                capacity = r["Capacity"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["Capacity"]),
                notes = r["Notes"] == DBNull.Value ? null : r["Notes"].ToString(),
                active = Convert.ToInt32(r["Active"]) == 1,
                createdAt = r["CreatedAt"].ToString()
            });
        }
        return list;
    }
}
