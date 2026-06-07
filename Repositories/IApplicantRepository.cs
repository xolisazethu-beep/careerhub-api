using CareerHub.Api.Models;

namespace CareerHub.Api.Repositories;

// Backs the auth feature. Only the operations registration/login actually need.
public interface IApplicantRepository
{
    Task<bool> EmailExistsAsync(string email);
    Task<Applicant?> GetByEmailAsync(string email);
    Task AddApplicantAsync(Applicant applicant);
}
