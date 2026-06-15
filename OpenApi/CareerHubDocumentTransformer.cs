using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace CareerHub.Api.OpenApi;

public sealed class CareerHubDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Info = new OpenApiInfo
        {
            Title = "CareerHub API",
            Version = "v1",
            Description = "Job listings and applications for the CareerHub platform.",
            Contact = new OpenApiContact
            {
                Name = "CareerHub Team",
                Email = "api@careerhub.example",
                Url = new Uri("https://careerhub.example")
            }
        };

        return Task.CompletedTask;
    }
}
