-- HAYAT-MOBIL SQLite şema (tek dosya, uygulama ile birlikte dağıtılır)
PRAGMA foreign_keys = ON;

CREATE TABLE Users (
    UserID       INTEGER PRIMARY KEY AUTOINCREMENT,
    FullName     TEXT    NOT NULL,
    UserType     TEXT    NOT NULL CHECK (UserType IN ('Afetzede','Doktor','Muhendis','Lojistik','Guvenlik','PM','IT','SaglikParamedik','AramaKurtarma')),
    IdentityNo   TEXT    UNIQUE,
    NfcTagId     TEXT,
    BloodType    TEXT,
    Phone        TEXT,
    PinHash      TEXT,
    SafetyStatus TEXT    DEFAULT 'Unknown' CHECK (SafetyStatus IN ('Unknown','Safe','In_Danger')),
    LastSafetyReport TEXT,
    LastKnownLat REAL,
    LastKnownLng REAL,
    LastLocationAt TEXT,
    CreatedAt    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE Units (
    UnitID          INTEGER PRIMARY KEY AUTOINCREMENT,
    SerialNumber    TEXT    NOT NULL UNIQUE,
    Latitude        REAL,
    Longitude       REAL,
    Status          TEXT    NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','Maintenance','Offline','Emergency')),
    BatteryLevel    INTEGER CHECK (BatteryLevel BETWEEN 0 AND 100),
    SolarProduction REAL,
    LastOtaVersion  TEXT    DEFAULT 'v1.0.0',
    DeployedAt      TEXT    DEFAULT (datetime('now')),
    LastHeartbeat   TEXT
);

CREATE TABLE Sensors (
    SensorID        INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitID          INTEGER NOT NULL REFERENCES Units(UnitID),
    SensorType      TEXT    NOT NULL CHECK (SensorType IN ('Isi','Duman','Gaz','GPS','Sismik','Nem','Basinc','Enerji')),
    CurrentValue    REAL,
    UnitOfMeasure   TEXT,
    QosLevel        INTEGER DEFAULT 1 CHECK (QosLevel IN (0,1,2)),
    Status          TEXT    DEFAULT 'Online' CHECK (Status IN ('Online','Offline','Error')),
    LastUpdate      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE NetworkTopology (
    LinkID          INTEGER PRIMARY KEY AUTOINCREMENT,
    SourceUnitID    INTEGER NOT NULL REFERENCES Units(UnitID),
    TargetUnitID    INTEGER NOT NULL REFERENCES Units(UnitID),
    SignalStrength  INTEGER,
    Protocol        TEXT    DEFAULT 'LoRa' CHECK (Protocol IN ('LoRa','Zigbee','NRF24L01','WiFi')),
    LinkStatus      TEXT    DEFAULT 'Stable' CHECK (LinkStatus IN ('Stable','Unstable','Down')),
    LastChecked     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE AiDetections (
    DetectionID         INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitID              INTEGER NOT NULL REFERENCES Units(UnitID),
    CameraID            TEXT,
    DetectionType       TEXT    CHECK (DetectionType IN ('Human_Trapped','Fire','Smoke','Structural_Damage','Clear')),
    PersonCount         INTEGER DEFAULT 0,
    ImmobilePersonCount INTEGER DEFAULT 0,
    PersonFound         INTEGER DEFAULT 0,
    ConfidenceScore     REAL CHECK (ConfidenceScore BETWEEN 0 AND 1),
    Latitude            REAL,
    Longitude           REAL,
    DetectedAt          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE Inventory (
    ItemID          INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitID          INTEGER NOT NULL REFERENCES Units(UnitID),
    ItemName        TEXT    NOT NULL,
    BarcodeData     TEXT    UNIQUE,
    Category        TEXT    CHECK (Category IN ('Medical','Food','Equipment','Water','Energy')),
    StockCount      INTEGER NOT NULL DEFAULT 0,
    ExpiryDate      TEXT,
    CreatedAt       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE Distributions (
    DistributionID      INTEGER PRIMARY KEY AUTOINCREMENT,
    ItemID              INTEGER NOT NULL REFERENCES Inventory(ItemID),
    QuantityDistributed INTEGER NOT NULL,
    ReceiverUserID      INTEGER REFERENCES Users(UserID),
    DistributedByStaff  INTEGER REFERENCES Users(UserID),
    CourierStaffID      INTEGER REFERENCES StaffProfiles(StaffID),
    TransportType       TEXT    CHECK (TransportType IN ('Manual','Drone','Vehicle','Helicopter')),
    DelayReason         TEXT,
    DistributionNote    TEXT,
    DistributedAt       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE StaffProfiles (
    StaffID         INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID          INTEGER NOT NULL UNIQUE REFERENCES Users(UserID),
    Specialization  TEXT    CHECK (Specialization IN ('Doktor','AramaKurtarma','SaglikParamedik','Lojistik','IT','Guvenlik','Muhendis')),
    CurrentStatus   TEXT    DEFAULT 'Available' CHECK (CurrentStatus IN ('Available','On_Duty','Off_Duty','Resting')),
    UnitID          INTEGER REFERENCES Units(UnitID)
);

-- PM atadigi saha gorevi (bilet disi: sensor / unite / kayip) — personel tek aktif gorev
CREATE TABLE StaffActiveFieldDuty (
    StaffID     INTEGER PRIMARY KEY REFERENCES StaffProfiles(StaffID),
    DutyType    TEXT NOT NULL CHECK (DutyType IN ('Sensor','Unit','Missing')),
    RefId       INTEGER NOT NULL,
    Summary     TEXT NOT NULL,
    StartedAt   TEXT NOT NULL DEFAULT (datetime('now')),
    EtaMinutes  INTEGER NOT NULL DEFAULT 25
);

CREATE TABLE AssignmentLog (
    LogID              INTEGER PRIMARY KEY AUTOINCREMENT,
    AssignedAt         TEXT NOT NULL DEFAULT (datetime('now')),
    DispatcherUserID   INTEGER NOT NULL REFERENCES Users(UserID),
    CrisisType         TEXT    NOT NULL,
    CrisisId           INTEGER NOT NULL,
    StaffID            INTEGER NOT NULL REFERENCES StaffProfiles(StaffID),
    Note               TEXT
);

CREATE TABLE AssistanceTickets (
    TicketID        INTEGER PRIMARY KEY AUTOINCREMENT,
    RequestorUserID INTEGER NOT NULL REFERENCES Users(UserID),
    RequestType     TEXT    CHECK (RequestType IN ('Medical','Rescue','Food','Water','Structural','Security')),
    TriageColor     TEXT    CHECK (TriageColor IN ('Red','Yellow','Green','Black')),
    Status          TEXT    DEFAULT 'Open' CHECK (Status IN ('Open','In_Progress','Resolved','Cancelled')),
    AssignedStaffID INTEGER REFERENCES StaffProfiles(StaffID),
    UnitID          INTEGER REFERENCES Units(UnitID),
    UpdateNote      TEXT,
    ReporterLat       REAL,
    ReporterLng       REAL,
    ReferredToDoctor  INTEGER NOT NULL DEFAULT 0,
    CreatedAt         TEXT    DEFAULT (datetime('now')),
    UpdatedAt         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_one_inprogress_staff
ON AssistanceTickets(AssignedStaffID)
WHERE Status = 'In_Progress' AND AssignedStaffID IS NOT NULL;

CREATE TABLE MissingPersons (
    ReportID            INTEGER PRIMARY KEY AUTOINCREMENT,
    ReporterUserID      INTEGER NOT NULL REFERENCES Users(UserID),
    MissingPersonName   TEXT    NOT NULL,
    Age                 INTEGER,
    PhysicalDescription TEXT,
    LastKnownLat        REAL,
    LastKnownLong       REAL,
    Status              TEXT    DEFAULT 'Missing' CHECK (Status IN ('Missing','Found','Deceased')),
    ReportedAt          TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE SyncQueue (
    SyncID      INTEGER PRIMARY KEY AUTOINCREMENT,
    TableName   TEXT    NOT NULL,
    Payload     TEXT,
    SyncStatus  TEXT    DEFAULT 'Waiting' CHECK (SyncStatus IN ('Waiting','Completed','Failed')),
    CreatedAt   TEXT    DEFAULT (datetime('now')),
    SyncedAt    TEXT
);

CREATE TABLE SecurityLogs (
    LogID       INTEGER PRIMARY KEY AUTOINCREMENT,
    EventType   TEXT    CHECK (EventType IN ('DDoS','UnauthorizedAccess','SensorTamper','DataBreach','OtaFailed')),
    Severity    TEXT    CHECK (Severity IN ('Low','Medium','High','Critical')),
    UnitID      INTEGER REFERENCES Units(UnitID),
    Description TEXT,
    LoggedAt    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE Alerts (
    AlertID   INTEGER PRIMARY KEY AUTOINCREMENT,
    Title     TEXT    NOT NULL,
    Message   TEXT    NOT NULL,
    Severity  TEXT    NOT NULL,
    CreatedAt TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE MedicalRecords (
    RecordID              INTEGER PRIMARY KEY AUTOINCREMENT,
    PatientUserID         INTEGER NOT NULL REFERENCES Users(UserID),
    DoctorStaffID         INTEGER NOT NULL REFERENCES Users(UserID),
    RecordType            TEXT    NOT NULL DEFAULT 'ClinicalExam' CHECK (RecordType IN ('FieldAssessment','ClinicalExam')),
    TicketID              INTEGER REFERENCES AssistanceTickets(TicketID),
    HeartRate             INTEGER,
    BloodOxygen           INTEGER,
    RespirationRate       INTEGER,
    BodyTemperature       REAL,
    Consciousness         TEXT,
    VisibleInjury         TEXT,
    TriageColor           TEXT,
    Disposition           TEXT,
    Diagnosis             TEXT,
    Treatment             TEXT,
    LinkedFieldRecordID   INTEGER REFERENCES MedicalRecords(RecordID),
    Notes                 TEXT,
    RecordedAt            TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE StaffApplications (
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
    ON StaffApplications(UserID) WHERE Status = 'Pending';

CREATE TABLE AssemblyPoints (
    PointID    INTEGER PRIMARY KEY AUTOINCREMENT,
    Name       TEXT    NOT NULL,
    Lat        REAL    NOT NULL,
    Lng        REAL    NOT NULL,
    Capacity   INTEGER,
    Notes      TEXT,
    Active     INTEGER NOT NULL DEFAULT 1,
    CreatedAt  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE DisasterZones (
    ZoneID           INTEGER PRIMARY KEY AUTOINCREMENT,
    Title            TEXT    NOT NULL,
    CenterLat        REAL    NOT NULL,
    CenterLng        REAL    NOT NULL,
    RadiusKm         REAL    NOT NULL DEFAULT 5,
    Active           INTEGER NOT NULL DEFAULT 1,
    DeclaredByUserID INTEGER REFERENCES Users(UserID),
    DeclaredAt       TEXT    DEFAULT (datetime('now')),
    AlertID          INTEGER REFERENCES Alerts(AlertID)
);

-- Afet senaryo metinleri ve AI turu (senaryo modulu DB'den okur; ID'ler runtime sorgu ile)
CREATE TABLE IF NOT EXISTS ScenarioDefinitions (
    ScenarioType          INTEGER PRIMARY KEY CHECK (ScenarioType IN (1, 2, 3)),
    DisasterName          TEXT    NOT NULL,
    CriticalAlertMessage  TEXT    NOT NULL,
    AiDetectionType       TEXT    NOT NULL
);
