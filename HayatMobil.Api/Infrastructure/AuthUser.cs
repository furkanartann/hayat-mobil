using System.Security.Claims;

namespace HayatMobil.Api.Infrastructure;

public sealed record AuthUser(int UserId, string FullName, string UserType, int? StaffId)
{
    public bool IsPm => UserType == "PM";
    public bool IsAfetzede => UserType == "Afetzede";
    public bool IsStaff => !IsAfetzede;

    public static AuthUser? TryGet(HttpContext ctx)
    {
        if (ctx.User.Identity?.IsAuthenticated != true)
            return null;

        var uidStr = ctx.User.FindFirstValue(JwtTokenService.UserIdClaim)
            ?? ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(uidStr, out var userId))
            return null;

        var userType = ctx.User.FindFirstValue(ClaimTypes.Role) ?? "Afetzede";
        var fullName = ctx.User.FindFirstValue(ClaimTypes.Name) ?? "";
        int? staffId = null;
        var sidStr = ctx.User.FindFirstValue(JwtTokenService.StaffIdClaim);
        if (int.TryParse(sidStr, out var sid))
            staffId = sid;

        return new AuthUser(userId, fullName, userType, staffId);
    }

    public static AuthUser Require(HttpContext ctx)
        => TryGet(ctx) ?? throw new UnauthorizedAccessException("Oturum gerekli.");

    public bool CanManageTickets()
        => IsPm || UserType is "Doktor" or "SaglikParamedik" or "Muhendis" or "Lojistik"
            or "Guvenlik" or "IT" or "AramaKurtarma";

    public bool CanAccessMedical()
        => IsPm || UserType is "Doktor" or "SaglikParamedik";

    public bool CanAccessLogistics()
        => IsPm || UserType == "Lojistik";

    public bool CanAccessFieldOps()
        => IsPm || UserType is "Muhendis" or "IT" or "Guvenlik" or "AramaKurtarma";

    public bool CanDispatch()
        => IsPm;
}
