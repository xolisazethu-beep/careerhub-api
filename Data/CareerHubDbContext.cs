using Microsoft.EntityFrameworkCore;
using CareerHub.Api.Models;

namespace CareerHub.Api.Data;

public class CareerHubDbContext(DbContextOptions<CareerHubDbContext> options)
    : DbContext(options)
{
    public DbSet<JobListing> JobListings => Set<JobListing>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<JobListing>(entity =>
        {
            entity.ToTable("job_listings");

            entity.HasKey(j => j.Id);
            entity.Property(j => j.Id).ValueGeneratedNever();

            entity.Property(j => j.Title).IsRequired().HasMaxLength(120);
            entity.Property(j => j.Company).IsRequired().HasMaxLength(80);
            entity.Property(j => j.Location).IsRequired().HasMaxLength(200);
            entity.Property(j => j.Description).IsRequired().HasMaxLength(2000);
            entity.Property(j => j.Type).IsRequired().HasConversion<string>();
            entity.Property(j => j.SalaryMin).HasColumnType("numeric(18,2)");
            entity.Property(j => j.SalaryMax).HasColumnType("numeric(18,2)");
            entity.Property(j => j.PostedAt).IsRequired();
            entity.Property(j => j.IsActive).IsRequired();

            entity.HasIndex(j => new { j.Title, j.Company }).IsUnique();
        });
    }
}