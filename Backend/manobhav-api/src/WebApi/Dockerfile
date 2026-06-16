# Build from Backend/manobhav-api:
# docker build -f src/WebApi/Dockerfile -t manobhav-api .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ManobhavAPI.slnx ./
COPY src/Domain/Domain.csproj src/Domain/
COPY src/Application/Application.csproj src/Application/
COPY src/Infrastructure/Infrastructure.csproj src/Infrastructure/
COPY src/WebApi/WebApi.csproj src/WebApi/
COPY tests/UnitTests/UnitTests.csproj tests/UnitTests/
RUN dotnet restore ManobhavAPI.slnx

COPY . .
RUN dotnet publish src/WebApi/WebApi.csproj --configuration Release --output /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WebApi.dll"]
