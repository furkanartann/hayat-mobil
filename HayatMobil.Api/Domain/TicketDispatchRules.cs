namespace HayatMobil.Api.Domain;

/// <summary>SOS talebi ↔ saha personeli rol eşleşmesi (PM ataması ve intikal).</summary>
public static class TicketDispatchRules
{
    public static bool IsOpenMedical(string requestType, string status) =>
        requestType == "Medical" && status is "Open" or "In_Progress";

    public static bool StaffMatchesTicket(
        string? userType,
        string requestType,
        string? triageColor,
        bool referredToDoctor,
        string status)
    {
        if (string.IsNullOrWhiteSpace(userType) || userType == "PM")
            return false;

        if (userType == "SaglikParamedik")
            return IsOpenMedical(requestType, status) && !referredToDoctor;

        if (userType == "Doktor")
            return IsOpenMedical(requestType, status) && referredToDoctor;

        if (userType == "AramaKurtarma")
            return requestType is "Rescue" or "Structural" or "Security"
                || (triageColor == "Red" && requestType != "Medical");

        if (userType == "Lojistik")
            return requestType is "Food" or "Water" or "Structural";

        if (userType == "Guvenlik")
            return requestType == "Security";

        return false;
    }
}
