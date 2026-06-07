namespace HayatMobil.Api.Infrastructure;

public static class AuthPolicies
{
    public const string Authenticated = "Authenticated";
    public const string Staff = "Staff";
    public const string Pm = "PM";
    public const string Medical = "Medical";
    public const string Logistics = "Logistics";
    public const string FieldOps = "FieldOps";

    public static readonly string[] StaffRoles =
    [
        "Doktor", "SaglikParamedik", "Muhendis", "Lojistik",
        "Guvenlik", "PM", "IT", "AramaKurtarma"
    ];

    public static readonly string[] MedicalRoles = ["Doktor", "SaglikParamedik", "PM"];
    public static readonly string[] LogisticsRoles = ["Lojistik", "PM"];
    public static readonly string[] FieldOpsRoles = ["Muhendis", "IT", "Guvenlik", "AramaKurtarma", "PM"];
}
