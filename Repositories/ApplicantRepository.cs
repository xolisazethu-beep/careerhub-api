using CareerHub.Api.Data;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Repositories;

public class ApplicantRepository(CareerHubDbContext db) : IApplicantRepository
{
    public Task<bool> EmailExistsAsync(string email) =>
        db.Applicants.AnyAsync(a => a.Email == email);

    public Task<Applicant?> GetByEmailAsync(string email) =>
        db.Applicants.FirstOrDefaultAsync(a => a.Email == email);

    public async Task AddApplicantAsync(Applicant applicant)
    {
        db.Applicants.Add(applicant);
        await db.SaveChangesAsync();
    }
}
