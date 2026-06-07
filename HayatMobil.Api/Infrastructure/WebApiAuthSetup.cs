using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace HayatMobil.Api.Infrastructure;

public static class WebApiAuthSetup
{
    public static void ConfigureServices(IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = JwtTokenService.Issuer,
                    ValidateAudience = true,
                    ValidAudience = JwtTokenService.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = JwtTokenService.GetSigningKey(),
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                    ClockSkew = TimeSpan.FromMinutes(2)
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AuthPolicies.Authenticated, p => p.RequireAuthenticatedUser());
            options.AddPolicy(AuthPolicies.Staff, p => p.RequireRole(AuthPolicies.StaffRoles));
            options.AddPolicy(AuthPolicies.Pm, p => p.RequireRole("PM"));
            options.AddPolicy(AuthPolicies.Medical, p => p.RequireRole(AuthPolicies.MedicalRoles));
            options.AddPolicy(AuthPolicies.Logistics, p => p.RequireRole(AuthPolicies.LogisticsRoles));
            options.AddPolicy(AuthPolicies.FieldOps, p => p.RequireRole(AuthPolicies.FieldOpsRoles));
        });
    }

    public static void UseAuth(WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
    }
}
