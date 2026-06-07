using CareerHub.Api.Models;

namespace CareerHub.Api.Repositories;

// The ONLY interface that exposes the Skills table. Like the other repositories it
// names a concrete use case rather than offering generic CRUD: the system never
// needs "get all skills" or "delete a skill" — it only needs to turn a set of
// skill NAMES from a job request into the matching Skill rows, creating any that
// are new. That single operation is all this interface offers.
public interface ISkillRepository
{
    // Resolve a set of skill names to Skill entities:
    //   - existing skills (matched case-insensitively on Name) are returned as-is
    //   - names with no match are created and persisted, then returned
    // Blank/whitespace names are ignored; duplicate names (e.g. "C#" twice, or
    // "c#" and "C#") collapse to a single Skill. The returned entities are tracked
    // by the shared DbContext, so the caller can attach them to a listing's
    // RequiredSkills navigation and have EF wire up the join rows on save.
    Task<List<Skill>> GetOrCreateByNamesAsync(IEnumerable<string> names);
}
