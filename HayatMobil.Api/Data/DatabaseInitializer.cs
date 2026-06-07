using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Data;

public static class DatabaseInitializer
{
    public static async Task EnsureInitializedAsync()
    {
        var path = DbContext.DatabaseFilePath;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var conn = new SqliteConnection(DbContext.ConnectionString);
        await conn.OpenAsync();

        await using (var pragma = conn.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;";
            await pragma.ExecuteNonQueryAsync();
        }

        await EnsureAppRuntimeStateAsync(conn);
        await EnsureScenarioDefinitionsAsync(conn);

        var hasUsersTable = await TableExistsAsync(conn, "Users");
        if (!hasUsersTable)
            await ExecuteSqlFileAsync(conn, "sqlite_schema.sql");

        await EnsureUsersNameAndIdentityUniqueConstraintAsync(conn);

        await EnsureStaffActiveFieldDutyTableAsync(conn);
        await EnsureAssignmentLogTableAsync(conn);
        await EnsureStaffApplicationsTableAsync(conn);
        await EnsureStaffRoleAlignmentAsync(conn);
        await EnsureMedicalWorkflowSchemaAsync(conn);
        await EnsureMapGeoSchemaAsync(conn);
        await EnsureAssemblyPointsTableAsync(conn);
        await EnsureDistributionsCourierSchemaAsync(conn);
        await TicketInProgressConstraintRepair.RepairDuplicateInProgressAssignmentsAsync(conn);
        await EnsureTicketInProgressStaffUniqueIndexAsync(conn);
        await StaleFieldDutyCleanup.RunAsync(conn);

        await using (var c = conn.CreateCommand())
        {
            c.CommandText = "SELECT COUNT(*) FROM Users;";
            var n = Convert.ToInt64(await c.ExecuteScalarAsync());
            if (n == 0)
                Console.WriteLine("[DB] Bos veritabani — ilk kayit Kriz Komuta Merkezi (PM) kurulumu olusturur.");
        }
    }

    /// <summary>AppRuntimeState — sabit baslangic; rastgele/mock hava verisi yok.</summary>
    private static async Task EnsureAppRuntimeStateAsync(SqliteConnection conn)
    {
        await using (var c = conn.CreateCommand())
        {
            c.CommandText = @"
CREATE TABLE IF NOT EXISTS AppRuntimeState (
    SingletonId       INTEGER PRIMARY KEY CHECK (SingletonId = 1),
    NetworkQuality    INTEGER NOT NULL DEFAULT 100,
    WeatherTemp       INTEGER NOT NULL DEFAULT 4,
    WeatherCondition  TEXT    NOT NULL DEFAULT 'Parcali Bulutlu',
    WeatherRisk       TEXT    NOT NULL DEFAULT 'Normal',
    UpdatedAt         TEXT    DEFAULT (datetime('now'))
);";
            await c.ExecuteNonQueryAsync();
        }

        await using (var c = conn.CreateCommand())
        {
            c.CommandText = @"
INSERT OR IGNORE INTO AppRuntimeState (SingletonId, NetworkQuality, WeatherTemp, WeatherCondition, WeatherRisk)
VALUES (1, 100, 22, 'Acik Hava', 'Normal');";
            await c.ExecuteNonQueryAsync();
        }
    }

    private static async Task EnsureScenarioDefinitionsAsync(SqliteConnection conn)
    {
        await using (var c = conn.CreateCommand())
        {
            c.CommandText = @"
CREATE TABLE IF NOT EXISTS ScenarioDefinitions (
    ScenarioType          INTEGER PRIMARY KEY CHECK (ScenarioType IN (1, 2, 3)),
    DisasterName          TEXT    NOT NULL,
    CriticalAlertMessage  TEXT    NOT NULL,
    AiDetectionType       TEXT    NOT NULL
);";
            await c.ExecuteNonQueryAsync();
        }

        await using (var c = conn.CreateCommand())
        {
            c.CommandText = "SELECT COUNT(*) FROM ScenarioDefinitions";
            var n = Convert.ToInt32(await c.ExecuteScalarAsync());
            if (n > 0)
                return;
        }

        await ExecuteSqlFileAsync(conn, "scenario_definitions.sql");
    }

    private static async Task<bool> TableExistsAsync(SqliteConnection conn, string name)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=$n;";
        cmd.Parameters.AddWithValue("$n", name);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return count > 0;
    }

    /// <summary>
    /// TC (IdentityNo) tekil kalir; ayrica (Ad Soyad + TC) cifti tekrarlanamaz (cift indeks).
    /// Eski DB'lerde yalnizca ayni ad ve ayni TC ile birden fazla satir varsa birlestirilir; farkli TC'li ayni isimler kalir.
    /// </summary>
    private static async Task EnsureUsersNameAndIdentityUniqueConstraintAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "Users"))
            return;

        await using (var dropOld = conn.CreateCommand())
        {
            dropOld.CommandText = "DROP INDEX IF EXISTS ux_users_fullname;";
            await dropOld.ExecuteNonQueryAsync();
        }

        await DeduplicateUsersByNameAndIdentityAsync(conn);

        await using var c = conn.CreateCommand();
        c.CommandText =
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_fullname_identityno ON Users(FullName, IdentityNo);";
        try
        {
            await c.ExecuteNonQueryAsync();
        }
        catch (SqliteException)
        {
            await DeduplicateUsersByNameAndIdentityAsync(conn);
            await c.ExecuteNonQueryAsync();
        }
    }

    /// <summary>Bilet disi saha gorevi (sensor/unite/kayip) icin tekil personel kilidi.</summary>
    private static async Task EnsureStaffActiveFieldDutyTableAsync(SqliteConnection conn)
    {
        await using var c = conn.CreateCommand();
        c.CommandText = @"
CREATE TABLE IF NOT EXISTS StaffActiveFieldDuty (
    StaffID     INTEGER PRIMARY KEY REFERENCES StaffProfiles(StaffID),
    DutyType    TEXT NOT NULL CHECK (DutyType IN ('Sensor','Unit','Missing')),
    RefId       INTEGER NOT NULL,
    Summary     TEXT NOT NULL,
    StartedAt   TEXT NOT NULL DEFAULT (datetime('now')),
    EtaMinutes  INTEGER NOT NULL DEFAULT 25
);";
        await c.ExecuteNonQueryAsync();
    }

    private static async Task EnsureStaffApplicationsTableAsync(SqliteConnection conn)
    {
        await using var c = conn.CreateCommand();
        c.CommandText = @"
CREATE TABLE IF NOT EXISTS StaffApplications (
    ApplicationID     INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID            INTEGER NOT NULL REFERENCES Users(UserID),
    RequestedRole     TEXT    NOT NULL CHECK (RequestedRole IN ('Doktor','SaglikParamedik','AramaKurtarma','Muhendis','Lojistik','Guvenlik','IT')),
    Institution       TEXT    NOT NULL,
    CredentialNote    TEXT,
    ApplicationNote   TEXT,
    Status            TEXT    NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending','Approved','Rejected')),
    ReviewedByUserID  INTEGER REFERENCES Users(UserID),
    ReviewNote        TEXT,
    CreatedAt         TEXT    DEFAULT (datetime('now')),
    ReviewedAt        TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_applications_pending_user
    ON StaffApplications(UserID) WHERE Status = 'Pending';";
        await c.ExecuteNonQueryAsync();
    }

    /// <summary>StaffProfiles.Specialization ile Users.UserType uyumunu saglar (or. Doktor -> SaglikParamedik hatasi).</summary>
    private static async Task EnsureStaffRoleAlignmentAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "StaffProfiles") || !await TableExistsAsync(conn, "Users"))
            return;

        await using (var pragma = conn.CreateCommand())
        {
            pragma.CommandText = "PRAGMA ignore_check_constraints = ON;";
            await pragma.ExecuteNonQueryAsync();
        }

        try
        {
            await using var fix = conn.CreateCommand();
            fix.CommandText = @"
                UPDATE StaffProfiles
                SET Specialization = (
                    SELECT u.UserType FROM Users u WHERE u.UserID = StaffProfiles.UserID
                )
                WHERE EXISTS (
                    SELECT 1 FROM Users u
                    WHERE u.UserID = StaffProfiles.UserID
                      AND u.UserType IN ('Doktor','SaglikParamedik','AramaKurtarma','Muhendis','Lojistik','Guvenlik','IT')
                      AND IFNULL(StaffProfiles.Specialization, '') != u.UserType
                );";
            await fix.ExecuteNonQueryAsync();
        }
        finally
        {
            await using var pragmaOff = conn.CreateCommand();
            pragmaOff.CommandText = "PRAGMA ignore_check_constraints = OFF;";
            await pragmaOff.ExecuteNonQueryAsync();
        }
    }

    private static async Task EnsureMedicalWorkflowSchemaAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "AssistanceTickets"))
            return;

        await EnsureColumnAsync(conn, "AssistanceTickets", "ReferredToDoctor", "INTEGER NOT NULL DEFAULT 0");

        if (!await TableExistsAsync(conn, "MedicalRecords"))
            return;

        await EnsureColumnAsync(conn, "MedicalRecords", "RecordType", "TEXT NOT NULL DEFAULT 'ClinicalExam'");
        await EnsureColumnAsync(conn, "MedicalRecords", "TicketID", "INTEGER REFERENCES AssistanceTickets(TicketID)");
        await EnsureColumnAsync(conn, "MedicalRecords", "Consciousness", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "VisibleInjury", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "TriageColor", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "Disposition", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "Diagnosis", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "Treatment", "TEXT");
        await EnsureColumnAsync(conn, "MedicalRecords", "LinkedFieldRecordID", "INTEGER REFERENCES MedicalRecords(RecordID)");
    }

    private static async Task EnsureMapGeoSchemaAsync(SqliteConnection conn)
    {
        await EnsureColumnAsync(conn, "Users", "LastKnownLat", "REAL");
        await EnsureColumnAsync(conn, "Users", "LastKnownLng", "REAL");
        await EnsureColumnAsync(conn, "Users", "LastLocationAt", "TEXT");
        await EnsureColumnAsync(conn, "AssistanceTickets", "ReporterLat", "REAL");
        await EnsureColumnAsync(conn, "AssistanceTickets", "ReporterLng", "REAL");

        await using var c = conn.CreateCommand();
        c.CommandText = @"
CREATE TABLE IF NOT EXISTS DisasterZones (
    ZoneID           INTEGER PRIMARY KEY AUTOINCREMENT,
    Title            TEXT    NOT NULL,
    CenterLat        REAL    NOT NULL,
    CenterLng        REAL    NOT NULL,
    RadiusKm         REAL    NOT NULL DEFAULT 5,
    Active           INTEGER NOT NULL DEFAULT 1,
    DeclaredByUserID INTEGER REFERENCES Users(UserID),
    DeclaredAt       TEXT    DEFAULT (datetime('now'))
);";
        await c.ExecuteNonQueryAsync();
        await EnsureColumnAsync(conn, "DisasterZones", "AlertID", "INTEGER REFERENCES Alerts(AlertID)");
    }

    private static async Task EnsureAssemblyPointsTableAsync(SqliteConnection conn)
    {
        await using (var c = conn.CreateCommand())
        {
            c.CommandText = @"
CREATE TABLE IF NOT EXISTS AssemblyPoints (
    PointID    INTEGER PRIMARY KEY AUTOINCREMENT,
    Name       TEXT    NOT NULL,
    Lat        REAL    NOT NULL,
    Lng        REAL    NOT NULL,
    Capacity   INTEGER,
    Notes      TEXT,
    Active     INTEGER NOT NULL DEFAULT 1,
    CreatedAt  TEXT    DEFAULT (datetime('now'))
);";
            await c.ExecuteNonQueryAsync();
        }

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = "SELECT COUNT(*) FROM AssemblyPoints;";
        var n = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
        if (n > 0)
            return;

        var seeds = new (string Name, double Lat, double Lng, int? Capacity, string? Notes)[]
        {
            ("Kadıköy Meydan Toplanma", 40.9900, 29.0250, 5000, "Metro çıkışı yanı açık alan"),
            ("Üsküdar İskele Alanı", 41.0214, 29.0158, 3000, "Sahil bandı güvenli bölge"),
            ("Beşiktaş Parkı", 41.0422, 29.0089, 2500, "Park içi toplanma noktası"),
            ("Maltepe Sahil", 40.9350, 29.1300, 4000, "Sahil yolu üstü düz alan"),
        };

        foreach (var s in seeds)
        {
            await using var ins = conn.CreateCommand();
            ins.CommandText = @"
INSERT INTO AssemblyPoints (Name, Lat, Lng, Capacity, Notes, Active)
VALUES (@name, @lat, @lng, @cap, @notes, 1);";
            ins.Parameters.AddWithValue("@name", s.Name);
            ins.Parameters.AddWithValue("@lat", s.Lat);
            ins.Parameters.AddWithValue("@lng", s.Lng);
            ins.Parameters.AddWithValue("@cap", s.Capacity.HasValue ? s.Capacity.Value : DBNull.Value);
            ins.Parameters.AddWithValue("@notes", s.Notes ?? (object)DBNull.Value);
            await ins.ExecuteNonQueryAsync();
        }
    }

    private static async Task EnsureDistributionsCourierSchemaAsync(SqliteConnection conn)
    {
        await EnsureColumnAsync(conn, "Distributions", "CourierStaffID", "INTEGER REFERENCES StaffProfiles(StaffID)");
    }

    private static async Task EnsureColumnAsync(SqliteConnection conn, string table, string column, string definition)
    {
        await using var check = conn.CreateCommand();
        check.CommandText = $"PRAGMA table_info({table});";
        await using var reader = await check.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
                return;
        }

        await using var add = conn.CreateCommand();
        add.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {definition};";
        await add.ExecuteNonQueryAsync();
    }

    private static async Task EnsureAssignmentLogTableAsync(SqliteConnection conn)
    {
        await using var c = conn.CreateCommand();
        c.CommandText = @"
CREATE TABLE IF NOT EXISTS AssignmentLog (
    LogID INTEGER PRIMARY KEY AUTOINCREMENT,
    AssignedAt TEXT NOT NULL DEFAULT (datetime('now')),
    DispatcherUserID INTEGER NOT NULL REFERENCES Users(UserID),
    CrisisType TEXT NOT NULL,
    CrisisId INTEGER NOT NULL,
    StaffID INTEGER NOT NULL REFERENCES StaffProfiles(StaffID),
    Note TEXT
);";
        await c.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// Ayni personelin iki farkli 'In_Progress' bilette olmasini engeller (SQLite ksmi tekil indeks).
    /// </summary>
    private static async Task EnsureTicketInProgressStaffUniqueIndexAsync(SqliteConnection conn)
    {
        if (!await TableExistsAsync(conn, "AssistanceTickets"))
            return;

        await using var c = conn.CreateCommand();
        c.CommandText = @"
CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_one_inprogress_staff
ON AssistanceTickets(AssignedStaffID)
WHERE Status = 'In_Progress' AND AssignedStaffID IS NOT NULL;";
        try
        {
            await c.ExecuteNonQueryAsync();
        }
        catch (SqliteException)
        {
            // Gecmis bozuk veri ayni personelde iki acik In_Progress iceriyorsa indeks kurulamaz.
        }
    }

    private static async Task DeduplicateUsersByNameAndIdentityAsync(SqliteConnection conn)
    {
        var pairs = new List<(string FullName, string IdentityNo)>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
SELECT FullName, IdentityNo FROM Users
WHERE IdentityNo IS NOT NULL AND TRIM(IdentityNo) <> ''
GROUP BY FullName, IdentityNo
HAVING COUNT(*) > 1;";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
                pairs.Add((r.GetString(0), r.GetString(1)));
        }

        foreach (var (fullName, identityNo) in pairs)
            await MergeUsersSharingNameAndIdentityAsync(conn, fullName, identityNo);
    }

    /// <summary>En dusuk UserID ana kayit; digerleri FK'lar bu kayda tasinar ve silinir.</summary>
    private static async Task MergeUsersSharingNameAndIdentityAsync(SqliteConnection conn, string fullName, string identityNo)
    {
        var ids = new List<int>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
SELECT UserID FROM Users
WHERE FullName = $name AND IdentityNo = $id
ORDER BY UserID;";
            cmd.Parameters.AddWithValue("$name", fullName);
            cmd.Parameters.AddWithValue("$id", identityNo);
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
                ids.Add(r.GetInt32(0));
        }

        if (ids.Count < 2)
            return;

        var master = ids[0];
        await using var tx = await conn.BeginTransactionAsync();
        var stx = (SqliteTransaction)tx;
        try
        {
            for (var i = 1; i < ids.Count; i++)
            {
                var uid = ids[i];
                await ReassignUserForeignKeysAsync(conn, stx, uid, master);
                await ResolveStaffProfilesForUserMergeAsync(conn, stx, uid, master);
                await using var del = conn.CreateCommand();
                del.Transaction = stx;
                del.CommandText = "DELETE FROM Users WHERE UserID = $u;";
                del.Parameters.AddWithValue("$u", uid);
                await del.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static async Task ReassignUserForeignKeysAsync(SqliteConnection conn, SqliteTransaction tx, int fromUserId, int toUserId)
    {
        string[] sqls =
        [
            "UPDATE AssistanceTickets SET RequestorUserID = $to WHERE RequestorUserID = $from;",
            "UPDATE Distributions SET ReceiverUserID = $to WHERE ReceiverUserID = $from;",
            "UPDATE Distributions SET DistributedByStaff = $to WHERE DistributedByStaff = $from;",
            "UPDATE MissingPersons SET ReporterUserID = $to WHERE ReporterUserID = $from;",
            "UPDATE MedicalRecords SET PatientUserID = $to WHERE PatientUserID = $from;",
            "UPDATE MedicalRecords SET DoctorStaffID = $to WHERE DoctorStaffID = $from;"
        ];

        foreach (var sql in sqls)
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = sql;
            cmd.Parameters.AddWithValue("$from", fromUserId);
            cmd.Parameters.AddWithValue("$to", toUserId);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task<long?> GetStaffIdForUserAsync(SqliteConnection conn, SqliteTransaction tx, int userId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT StaffID FROM StaffProfiles WHERE UserID = $u LIMIT 1;";
        cmd.Parameters.AddWithValue("$u", userId);
        var o = await cmd.ExecuteScalarAsync();
        if (o == null || o == DBNull.Value) return null;
        return Convert.ToInt64(o);
    }

    private static async Task ResolveStaffProfilesForUserMergeAsync(SqliteConnection conn, SqliteTransaction tx, int fromUserId, int toUserId)
    {
        var staffFrom = await GetStaffIdForUserAsync(conn, tx, fromUserId);
        if (staffFrom == null)
            return;

        var staffTo = await GetStaffIdForUserAsync(conn, tx, toUserId);

        if (staffTo != null)
        {
            await using var u = conn.CreateCommand();
            u.Transaction = tx;
            u.CommandText = "UPDATE AssistanceTickets SET AssignedStaffID = $st WHERE AssignedStaffID = $sf;";
            u.Parameters.AddWithValue("$st", staffTo.Value);
            u.Parameters.AddWithValue("$sf", staffFrom.Value);
            await u.ExecuteNonQueryAsync();

            await using var d = conn.CreateCommand();
            d.Transaction = tx;
            d.CommandText = "DELETE FROM StaffProfiles WHERE StaffID = $sf;";
            d.Parameters.AddWithValue("$sf", staffFrom.Value);
            await d.ExecuteNonQueryAsync();
        }
        else
        {
            await using var u = conn.CreateCommand();
            u.Transaction = tx;
            u.CommandText = "UPDATE StaffProfiles SET UserID = $to WHERE UserID = $from;";
            u.Parameters.AddWithValue("$to", toUserId);
            u.Parameters.AddWithValue("$from", fromUserId);
            await u.ExecuteNonQueryAsync();
        }
    }

    private static async Task ExecuteSqlFileAsync(SqliteConnection conn, string fileName)
    {
        var baseDir = AppContext.BaseDirectory;
        var path = Path.Combine(baseDir, "Data", fileName);
        if (!File.Exists(path))
            path = Path.Combine(baseDir, fileName);

        if (!File.Exists(path))
            throw new FileNotFoundException("SQLite script not found: " + fileName, path);

        var sql = await File.ReadAllTextAsync(path);

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var stmt in SplitStatements(sql))
            {
                if (string.IsNullOrWhiteSpace(stmt)) continue;
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = stmt;
                cmd.Transaction = (SqliteTransaction)tx;
                await cmd.ExecuteNonQueryAsync();
            }
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Basit ayristirma: noktalivirgul + satir sonu; string literallerinde ';' yok.
    /// </summary>
    private static IEnumerable<string> SplitStatements(string sql)
    {
        var lines = sql.Replace("\r\n", "\n").Split('\n');
        var block = new System.Text.StringBuilder();
        foreach (var line in lines)
        {
            var trim = line.Trim();
            if (trim.Length == 0) continue;
            if (trim.StartsWith("--", StringComparison.Ordinal)) continue;

            block.AppendLine(line);
            if (trim.EndsWith(";", StringComparison.Ordinal))
            {
                var s = block.ToString().Trim();
                block.Clear();
                if (s.Length > 0)
                    yield return s;
            }
        }
        var tail = block.ToString().Trim();
        if (tail.Length > 0)
            yield return tail;
    }
}
