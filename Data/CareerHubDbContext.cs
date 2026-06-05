using CareerHub.Api.Models;
using CareerHub.Api.Controllers;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Data;

public class CareerHubDbContext(DbContextOptions<CareerHubDbContext> options) : DbContext(options)
{
    public DbSet<JobListing> JobListings => Set<JobListing>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Applicant> Applicants => Set<Applicant>();
    public DbSet<Application> Applications => Set<Application>();

    // ── PART 5: N+1 DIAGNOSIS TOGGLE ────────────────────────────────────────
    // Uncomment the body below to print every SQL statement EF Core runs to the
    // terminal. Use it to PROVE the N+1 problem and then the single-query fix.
    // Comment it back out (or delete it) before committing, as the assignment asks.

    // protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    // protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    // {
    //optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information);
        //}
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── COMPANY ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");                       // lowercase, PostgreSQL convention
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever();  // app supplies the Guid

            entity.Property(c => c.Name).IsRequired().HasMaxLength(150);
            entity.Property(c => c.Website).HasMaxLength(300);
            entity.Property(c => c.Industry).HasMaxLength(100);
            entity.Property(c => c.Description).HasMaxLength(2000);
            entity.Property(c => c.LogoUrl).HasMaxLength(300);

            // Business rule: no two companies with the same name (stops the
            // "spelt differently" duplication that strings allowed in 2.1).
            entity.HasIndex(c => c.Name).IsUnique();
        });

        // ── APPLICANT ───────────────────────────────────────────────────────
        modelBuilder.Entity<Applicant>(entity =>
        {
            entity.ToTable("applicants");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedNever();

            entity.Property(a => a.FullName).IsRequired().HasMaxLength(150);
            entity.Property(a => a.Email).IsRequired().HasMaxLength(200);
            entity.Property(a => a.PasswordHash).IsRequired().HasMaxLength(500);
            entity.Property(a => a.Phone).HasMaxLength(30);
            entity.Property(a => a.Headline).HasMaxLength(200);
            entity.Property(a => a.ResumeUrl).HasMaxLength(300);

            // Business rule: one account per email address.
            entity.HasIndex(a => a.Email).IsUnique();
        });

        // ── JOB LISTING ─────────────────────────────────────────────────────
        modelBuilder.Entity<JobListing>(entity =>
        {
            entity.ToTable("job_listings");
            entity.HasKey(j => j.Id);
            entity.Property(j => j.Id).ValueGeneratedNever();

            entity.Property(j => j.Title).IsRequired().HasMaxLength(200);
            entity.Property(j => j.Description).IsRequired().HasMaxLength(4000);
            entity.Property(j => j.Location).IsRequired().HasMaxLength(200);
            entity.Property(j => j.Type).IsRequired().HasConversion<string>().HasMaxLength(20);
            entity.Property(j => j.SalaryMin).HasColumnType("numeric(18,2)");
            entity.Property(j => j.SalaryMax).HasColumnType("numeric(18,2)");
            entity.Property(j => j.PostedAt).IsRequired();
            entity.Property(j => j.IsActive).IsRequired();

            // New job requirements fields
            entity.Property(j => j.RequiredDegree).HasMaxLength(200);
            entity.Property(j => j.RequiredDiploma).HasMaxLength(200);
            entity.Property(j => j.MinimumYearsExperience).IsRequired();

            // One Company -> many JobListings.
            // Reads: "a JobListing HAS ONE Company; that Company has MANY JobListings".
            // Restrict: you cannot delete a Company while it still owns listings —
            // this stops one delete from silently destroying a company's whole
            // hiring history (and every application attached to it).
            entity.HasOne(j => j.Company)
                  .WithMany(c => c.JobListings)
                  .HasForeignKey(j => j.CompanyId)
                  .OnDelete(DeleteBehavior.Restrict);

            // No duplicate listing with the same title for the same company.
            entity.HasIndex(j => new { j.Title, j.CompanyId }).IsUnique();
        });

        // ── APPLICATION (explicit join entity) ──────────────────────────────
        modelBuilder.Entity<Application>(entity =>
        {
            entity.ToTable("applications");

            // Composite primary key = the natural identity of an application.
            // This is what makes "no duplicate application" a DATABASE guarantee.
            entity.HasKey(a => new { a.JobListingId, a.ApplicantId });

            entity.Property(a => a.SubmittedAt).IsRequired();
            entity.Property(a => a.Status)
                  .IsRequired()
                  .HasConversion<string>()   // store 'Submitted', 'Interview' ... not 0,1,2
                  .HasMaxLength(20);
            entity.Property(a => a.CoverNote).HasMaxLength(2000);

            // JobListing -> Applications : deleting a listing removes its applications.
            entity.HasOne(a => a.JobListing)
                  .WithMany(j => j.Applications)
                  .HasForeignKey(a => a.JobListingId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Applicant -> Applications : deleting an applicant removes their applications.
            entity.HasOne(a => a.Applicant)
                  .WithMany(ap => ap.Applications)
                  .HasForeignKey(a => a.ApplicantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
