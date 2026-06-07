using CareerHub.Api.Data;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Repositories;

// The ONLY layer permitted to query the Skills table. All matching, creation and
// SaveChangesAsync for skills live here. The service hands it raw names and gets
// back ready-to-attach Skill entities — it never touches EF Core to do so.
public class SkillRepository(CareerHubDbContext db) : ISkillRepository
{
    public async Task<List<Skill>> GetOrCreateByNamesAsync(IEnumerable<string> names)
    {
        // Clean the input: trim, drop blanks, and collapse case-insensitive
        // duplicates so "C#", " c# " and "C#" resolve to exactly one skill.
        var requested = names
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n.Trim())
            .GroupBy(n => n.ToLower())
            .Select(g => g.First())
            .ToList();

        if (requested.Count == 0)
            return [];

        var requestedLower = requested.Select(n => n.ToLower()).ToList();

        // Existing skills, matched case-insensitively on Name.
        var existing = await db.Skills
            .Where(s => requestedLower.Contains(s.Name.ToLower()))
            .ToListAsync();

        var existingLower = existing
            .Select(s => s.Name.ToLower())
            .ToHashSet();

        // Anything not already present is created (using the original casing the
        // caller supplied) and persisted so the join rows can reference it.
        var toCreate = requested
            .Where(n => !existingLower.Contains(n.ToLower()))
            .Select(n => new Skill { Id = Guid.NewGuid(), Name = n })
            .ToList();

        if (toCreate.Count > 0)
        {
            db.Skills.AddRange(toCreate);
            await db.SaveChangesAsync();
        }

        return [.. existing, .. toCreate];
    }
}
