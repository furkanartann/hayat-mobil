using HayatMobil.Api.Infrastructure;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace HayatMobil.Api.Endpoints;

internal static class AssemblyPointEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/assembly-points", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM toplanma alanlarını yönetebilir." }, statusCode: 403);

            try
            {
                var list = await AssemblyPointService.ListAllAsync();
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPost("/api/assembly-points", async (CreateAssemblyPointRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM toplanma alanı ekleyebilir." }, statusCode: 403);

            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.Json(new { error = "Alan adı zorunludur." }, statusCode: 400);

            try
            {
                var id = await AssemblyPointService.CreateAsync(req);
                return Results.Ok(new { pointId = id, success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPut("/api/assembly-points/{pointId:int}", async (int pointId, UpdateAssemblyPointRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM toplanma alanını düzenleyebilir." }, statusCode: 403);

            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.Json(new { error = "Alan adı zorunludur." }, statusCode: 400);

            try
            {
                var ok = await AssemblyPointService.UpdateAsync(pointId, req);
                if (!ok)
                    return Results.Json(new { error = "Toplanma alanı bulunamadı." }, statusCode: 404);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapDelete("/api/assembly-points/{pointId:int}", async (int pointId, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM toplanma alanını silebilir." }, statusCode: 403);

            try
            {
                var ok = await AssemblyPointService.DeleteAsync(pointId);
                if (!ok)
                    return Results.Json(new { error = "Toplanma alanı bulunamadı." }, statusCode: 404);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);
    }
}
