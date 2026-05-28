using System.ComponentModel.DataAnnotations;
using CareerHub.Api.Models;

namespace CareerHub.Api.DTOs;

public class UpdateJobRequest : IValidatableObject
{
    [Required]
    [StringLength(120, MinimumLength = 5, ErrorMessage = "Title must be between 5 and 120 characters.")]
    public string Title { get; set; } = "";

    [Required]
    [StringLength(80, MinimumLength = 2, ErrorMessage = "Company must be between 2 and 80 characters.")]
    public string Company { get; set; } = "";

    [Required(ErrorMessage = "Location is required.")]
    public string Location { get; set; } = "";

    [Required]
    [MinLength(20, ErrorMessage = "Description must be at least 20 characters.")]
    public string Description { get; set; } = "";

    [Required]
    [EnumDataType(typeof(JobType), ErrorMessage = "Type must be one of FullTime, PartTime, Contract, Internship.")]
    public JobType Type { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "SalaryMin must be greater than zero.")]
    public decimal? SalaryMin { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "SalaryMax must be greater than zero.")]
    public decimal? SalaryMax { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (SalaryMin.HasValue && SalaryMax.HasValue && SalaryMax <= SalaryMin)
        {
            yield return new ValidationResult(
                "SalaryMax must be greater than SalaryMin.",
                new[] { nameof(SalaryMax) });
        }
    }
}