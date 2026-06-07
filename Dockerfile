FROM node:22-alpine AS frontend
WORKDIR /app
COPY HayatMobil.Web/package.json HayatMobil.Web/package-lock.json ./HayatMobil.Web/
RUN cd HayatMobil.Web && npm ci
COPY HayatMobil.Web ./HayatMobil.Web
COPY HayatMobil.Api ./HayatMobil.Api
RUN cd HayatMobil.Web && npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS publish
WORKDIR /src
COPY HayatMobil.Api/HayatMobil.Api.csproj HayatMobil.Api/
RUN dotnet restore HayatMobil.Api/HayatMobil.Api.csproj
COPY HayatMobil.Api/ HayatMobil.Api/
COPY --from=frontend /app/HayatMobil.Api/wwwroot HayatMobil.Api/wwwroot/
RUN dotnet publish HayatMobil.Api/HayatMobil.Api.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=publish /out .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "HayatMobil.Api.dll"]
