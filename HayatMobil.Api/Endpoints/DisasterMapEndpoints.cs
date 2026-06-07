using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class DisasterMapEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/disaster-types", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();
                var cmd = new SqliteCommand(
                    "SELECT ScenarioType, DisasterName, CriticalAlertMessage FROM ScenarioDefinitions ORDER BY ScenarioType", conn);
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        typeId = Convert.ToInt32(r["ScenarioType"]),
                        name = r["DisasterName"].ToString(),
                        suggestedMessage = r["CriticalAlertMessage"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/disasters/history", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM afet geçmişini görüntüleyebilir." }, statusCode: 403);

            try
            {
                var list = await DisasterHistoryService.ListAsync();
                return Results.Ok(list.Select(z => new
                {
                    zoneId = z.ZoneId,
                    alertId = z.AlertId,
                    title = z.Title,
                    message = z.Message,
                    severity = z.Severity,
                    centerLat = z.CenterLat,
                    centerLng = z.CenterLng,
                    radiusKm = z.RadiusKm,
                    active = z.Active,
                    declaredAt = z.DeclaredAt
                }));
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPut("/api/disasters/zones/{zoneId:int}", async (int zoneId, UpdateDisasterZoneApiRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM afet bildirimini düzenleyebilir." }, statusCode: 403);

            try
            {
                await DisasterHistoryService.UpdateAsync(zoneId, new UpdateDisasterZoneRequest(
                    req.Title, req.Message, req.Severity ?? "Critical",
                    req.CenterLat, req.CenterLng, req.RadiusKm));
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapDelete("/api/disasters/zones/{zoneId:int}", async (int zoneId, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM afet bildirimini silebilir." }, statusCode: 403);

            try
            {
                await DisasterHistoryService.DeleteAsync(zoneId);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPatch("/api/disasters/zones/{zoneId:int}/active", async (int zoneId, SetDisasterActiveApiRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Yalnızca PM afet durumunu değiştirebilir." }, statusCode: 403);

            try
            {
                await DisasterHistoryService.SetActiveAsync(zoneId, req.Active);
                return Results.Ok(new { success = true, active = req.Active });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        app.MapPost("/api/disasters/declare", async (DisasterDeclareApiRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.IsPm)
                return Results.Json(new { error = "Afet bildirimi yalnızca PM tarafından yapılabilir." }, statusCode: 403);

            if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
                return Results.BadRequest(new { error = "Başlık ve mesaj zorunludur." });

            try
            {
                await DisasterDeclarationService.DeclareAsync(auth.UserId, new DisasterDeclareRequest(
                    req.Title, req.Message, req.Severity ?? "Critical",
                    req.WeatherCondition, req.WeatherRisk, req.WeatherTemp, req.NetworkQuality,
                    req.ZoneCenterLat, req.ZoneCenterLng, req.ZoneRadiusKm));
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Pm);

        // ---------------------------------------------------------
        //  MAP / GEO ENDPOINTS
        // ---------------------------------------------------------
        app.MapPut("/api/users/me/location", async (UpdateLocationRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (req.Latitude is < -90 or > 90 || req.Longitude is < -180 or > 180)
                return Results.BadRequest(new { error = "Geçersiz koordinat." });

            try
            {
                await MapGeoService.UpdateUserLocationAsync(auth.UserId, req.Latitude, req.Longitude);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/users/me/zone-status", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            try
            {
                var status = await MapGeoService.GetZoneStatusAsync(auth.UserId);
                return Results.Ok(status);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/map/layers", async (HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            try
            {
                var layers = await MapGeoService.GetLayersAsync(auth);
                return Results.Ok(layers);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapGet("/api/map/route", async (
            double? fromLat, double? fromLng, double? toLat, double? toLng, string? profile, HttpContext ctx) =>
        {
            AuthUser.Require(ctx);

            if (fromLat is null or < -90 or > 90 || toLat is null or < -90 or > 90 ||
                fromLng is null or < -180 or > 180 || toLng is null or < -180 or > 180)
                return Results.BadRequest(new { error = "Geçersiz koordinat." });

            try
            {
                var route = await RoutingService.FetchRouteAsync(
                    fromLat.Value, fromLng.Value, toLat.Value, toLng.Value, profile ?? "driving");

                return Results.Ok(new
                {
                    distanceMeters = route.DistanceMeters,
                    durationSeconds = route.DurationSeconds,
                    coordinates = route.Coordinates,
                    profile = route.Profile,
                    fallback = route.Fallback,
                    steps = route.Steps.Select(s => new
                    {
                        instruction = s.Instruction,
                        distanceMeters = s.DistanceMeters,
                        streetName = s.StreetName,
                        maneuverType = s.ManeuverType,
                        maneuverModifier = s.ManeuverModifier
                    })
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();
    }
}

