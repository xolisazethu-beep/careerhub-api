namespace CareerHub.Api.Repositories;

// Companies are referenced by listings but, in the use cases this system actually
// has, the only thing the domain ever asks about a company is "does it exist?"
// (so a listing cannot be created for a phantom company). That single yes/no
// question is all this interface exposes — no GetAll, no generic CRUD.
public interface ICompanyRepository
{
    // A named boolean check, not a "fetch the company and let the caller test for
    // null" method. The intent ("does this company exist") lives in the name.
    Task<bool> CompanyExistsAsync(Guid companyId);
}
