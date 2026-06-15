using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Data;

public class CareerHubDbContext(DbContextOptions<CareerHubDbContext> options) : DbContext(options)
{
    public DbSet<JobListing> JobListings => Set<JobListing>();
    public DbSet<Application> Applications => Set<Application>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<JobListing>(entity =>
        {
            entity.HasKey(j => j.Id);
            entity.Property(j => j.Title).IsRequired().HasMaxLength(200);
            entity.Property(j => j.Company).IsRequired().HasMaxLength(200);
            entity.Property(j => j.Location).HasMaxLength(200);
            entity.Property(j => j.SalaryMin).HasColumnType("numeric(12,2)");
            entity.Property(j => j.SalaryMax).HasColumnType("numeric(12,2)");
            entity.HasIndex(j => j.IsActive);
            entity.HasIndex(j => j.ExpiresAt);
        });

        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.ApplicantName).IsRequired().HasMaxLength(200);
            entity.Property(a => a.ApplicantEmail).IsRequired().HasMaxLength(320);
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(40);

            entity.HasOne(a => a.JobListing)
                  .WithMany(j => j.Applications)
                  .HasForeignKey(a => a.JobListingId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
