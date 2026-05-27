using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

public interface IJobService
{
    IEnumerable<JobListing> GetAll();
    JobListing? GetById(int id);
    JobListing Add(JobListing job);
    JobListing? Update(int id, JobListing replacement);
    bool Delete(int id);
    bool ExistsByTitleAndCompany(string title, string company, int? excludeId = null);
}