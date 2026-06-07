using HayatMobil.Api.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace HayatMobil.Api.Infrastructure;

public static class WebApiHost
{
    public static void Start(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        WebApiAuthSetup.ConfigureServices(builder.Services);
        var port = int.Parse(Environment.GetEnvironmentVariable("PORT") ?? "5000");
        builder.WebHost.ConfigureKestrel(options => options.ListenAnyIP(port));

        var app = builder.Build();

        app.UseCors();
        WebApiAuthSetup.UseAuth(app);

        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/sw.js"))
                context.Response.Headers.Append("Service-Worker-Allowed", "/");
            await next();
        });

        var staticContentTypes = new FileExtensionContentTypeProvider();
        staticContentTypes.Mappings[".webmanifest"] = "application/manifest+json";
        app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = staticContentTypes });

        AuthEndpoints.Map(app);
        DashboardEndpoints.Map(app);
        TicketEndpoints.Map(app);
        UnitSensorEndpoints.Map(app);
        InventoryEndpoints.Map(app);
        StaffEndpoints.Map(app);
        MissingPersonEndpoints.Map(app);
        CivilianLookupEndpoints.Map(app);
        MedicalEndpoints.Map(app);
        AlertEndpoints.Map(app);
        DisasterMapEndpoints.Map(app);
        AssemblyPointEndpoints.Map(app);

        app.MapFallbackToFile("index.html").AllowAnonymous();
        app.Run();
    }
}
