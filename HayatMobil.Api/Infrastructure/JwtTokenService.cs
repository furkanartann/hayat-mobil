using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace HayatMobil.Api.Infrastructure;

public static class JwtTokenService
{
    public const string Issuer = "HayatMobil";
    public const string Audience = "HayatMobil";
    public const string UserIdClaim = "uid";
    public const string StaffIdClaim = "sid";

    private static readonly TimeSpan DefaultLifetime = TimeSpan.FromHours(12);

    public static SymmetricSecurityKey GetSigningKey()
    {
        var secret = Environment.GetEnvironmentVariable("HAYATMOBIL_JWT_SECRET")
            ?? "HayatMobil-Demo-School-Project-Secret-Key-2026!";
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public static (string Token, DateTime ExpiresAt) CreateToken(
        int userId, string fullName, string userType, int? staffId, TimeSpan? lifetime = null)
    {
        var expires = DateTime.UtcNow.Add(lifetime ?? DefaultLifetime);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(UserIdClaim, userId.ToString()),
            new(ClaimTypes.Name, fullName),
            new(ClaimTypes.Role, userType)
        };
        if (staffId.HasValue)
            claims.Add(new Claim(StaffIdClaim, staffId.Value.ToString()));

        var creds = new SigningCredentials(GetSigningKey(), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(Issuer, Audience, claims, expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}
