using HayatMobil.Api.Infrastructure;
using HayatMobil.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace HayatMobil.Api.Endpoints;

internal static class CivilianLookupEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/civilian-lookup", async (string? q, double? fromLat, double? fromLng, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsAfetzede)
                return Results.Json(new { error = "Yakın durumu sorgusu yalnızca afetzede hesapları içindir." }, statusCode: 403);

            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.Ok(Array.Empty<object>());

            try
            {
                var list = await CivilianLookupService.SearchAsync(auth.UserId, q, fromLat, fromLng);
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();
    }
}
