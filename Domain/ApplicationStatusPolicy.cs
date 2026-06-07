using CareerHub.Api.Models;

namespace CareerHub.Api.Domain;

// ── PART 6: THE STATUS TRANSITION CHALLENGE ──────────────────────────────────
//
// This is the ONE place the application workflow is encoded. The rules are data,
// not control flow: a set of allowed (from -> to) edges. Nothing else in the
// codebase contains a switch or if/else describing which status may follow which.
//
// Why this satisfies the requirements:
//   1. Single source of truth  — the edges live only in _allowed below.
//   2. No database needed       — it is a pure in-memory set; IsValidTransition
//                                 is a static method a unit test can call directly
//                                 (see CareerHub.Api.Tests).
//   3. One-line future change   — to allow, say, Offered -> Accepted, you add the
//                                 single line (Offered, Accepted) to _allowed and
//                                 the enum member. No service, controller, switch,
//                                 or if-chain is touched.
public static class ApplicationStatusPolicy
{
    // The complete set of legal forward transitions. ADD A LINE HERE to add a rule.
    private static readonly HashSet<(ApplicationStatus From, ApplicationStatus To)> _allowed = new()
    {
        (ApplicationStatus.Submitted,   ApplicationStatus.UnderReview),
        (ApplicationStatus.UnderReview, ApplicationStatus.Shortlisted),
        (ApplicationStatus.UnderReview, ApplicationStatus.Rejected),
        (ApplicationStatus.Shortlisted, ApplicationStatus.Offered),
        (ApplicationStatus.Shortlisted, ApplicationStatus.Rejected),
    };

    // Terminal states cannot be left. Derived from the rules: a state is terminal
    // when no allowed edge starts from it. Computed once, so it too has a single
    // source of truth — the _allowed set above.
    private static readonly HashSet<ApplicationStatus> _terminal =
        Enum.GetValues<ApplicationStatus>()
            .Where(s => s != ApplicationStatus.Withdrawn)
            .Where(s => _allowed.All(edge => edge.From != s))
            .ToHashSet();

    // The single decision method the service calls. Pure, deterministic, no I/O.
    public static bool IsValidTransition(ApplicationStatus from, ApplicationStatus to) =>
        _allowed.Contains((from, to));

    // Used by the withdraw rule: an application already in a terminal state
    // (Offered / Rejected) — or already Withdrawn — cannot be withdrawn.
    public static bool IsTerminal(ApplicationStatus status) =>
        status == ApplicationStatus.Withdrawn || _terminal.Contains(status);
}
