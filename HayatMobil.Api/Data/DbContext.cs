using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

public static class DbContext
{
    /// <summary>Uygulama dizinindeki yerel SQLite dosyasi (ZIP ile dagitim).</summary>
    public static string DatabaseFilePath =>
        Path.Combine(AppContext.BaseDirectory, "HayatMobil.db");

    /// <summary>Veya <c>HAYATMOBIL_CONNECTION</c> ile ozellestirin.</summary>
    public static string ConnectionString =>
        Environment.GetEnvironmentVariable("HAYATMOBIL_CONNECTION") ??
        $"Data Source={DatabaseFilePath};Cache=Shared";

    public static SqliteConnection GetConnection()
    {
        return new SqliteConnection(ConnectionString);
    }

    public static async Task<long> GetLastInsertRowIdAsync(SqliteConnection conn, SqliteTransaction? tx = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT last_insert_rowid();";
        if (tx != null)
        {
            cmd.Transaction = tx;
        }
        var o = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(o);
    }

    public static async Task<bool> TestConnectionAsync()
    {
        try
        {
            await using var conn = GetConnection();
            await conn.OpenAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
