using System.ComponentModel.DataAnnotations;

namespace CareerHub.Api.Endpoints;

internal static class MinimalApiValidation
{
    internal static bool TryValidate(object model, out Dictionary<string, string[]> errors)
    {
        var results = new List<ValidationResult>();
        var context = new ValidationContext(model);
        bool isValid = Validator.TryValidateObject(model, context, results, validateAllProperties: true);

        errors = results
            .Where(r => r.MemberNames.Any())
            .GroupBy(r => r.MemberNames.First())
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => r.ErrorMessage ?? "Invalid value.").ToArray()
            );

        return isValid;
    }
}
