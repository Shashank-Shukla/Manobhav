using WebApi.Middleware;
using Application;
using Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// config & logging
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

// Add services (Application + Infrastructure registration extension methods)
builder.Services.AddApplicationServices();      // register MediatR, validators, etc.
builder.Services.AddInfrastructureServices(builder.Configuration); // DbContext, repos

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// global middleware (exception handling, logging)
app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
