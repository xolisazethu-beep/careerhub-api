namespace CareerHub.Api.Models;

public static class ApplicationStatusTransitions
{
    private static readonly Dictionary<ApplicationStatus, ApplicationStatus[]> Allowed = new()
    {
        [ApplicationStatus.Submitted] = [ApplicationStatus.UnderReview, ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
        [ApplicationStatus.UnderReview] = [ApplicationStatus.Interview, ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
        [ApplicationStatus.Interview] = [ApplicationStatus.Offer, ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
        [ApplicationStatus.Offer] = [ApplicationStatus.Accepted, ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
        [ApplicationStatus.Accepted] = [],
        [ApplicationStatus.Rejected] = [],
        [ApplicationStatus.Withdrawn] = []
    };

    public static bool IsValid(ApplicationStatus from, ApplicationStatus to) =>
        Allowed.TryGetValue(from, out var targets) && targets.Contains(to);

    public static IReadOnlyCollection<ApplicationStatus> AllowedFrom(ApplicationStatus from) =>
        Allowed.TryGetValue(from, out var targets) ? targets : [];
}
