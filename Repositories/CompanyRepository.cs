using CareerHub.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Repositories;

// The ONLY layer permitted to import Microsoft.EntityFrameworkCore for companies.
public class CompanyRepository(CareerHubDbContext db) : ICompanyRepository
{
    public Task<bool> CompanyExistsAsync(Guid companyId) =>
        db.Companies.AnyAsync(c => c.Id == companyId);
}
