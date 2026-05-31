// Up where you register services:
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
// Down in the middleware pipeline (before app.MapControllers()):
app.UseExceptionHandler();