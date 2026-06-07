using CareerHub.Api.Domain;
using CareerHub.Api.Models;
using Xunit;

namespace CareerHub.Api.Tests;

// These tests prove Part 6 requirement #2 directly: the transition rules can be
// validated with NO database — ApplicationStatusPolicy is a pure function. There
// is no DbContext, no web host, nothing async here.
public class ApplicationStatusPolicyTests
{
    [Theory]
    [InlineData(ApplicationStatus.Submitted,   ApplicationStatus.UnderReview)]
    [InlineData(ApplicationStatus.UnderReview, ApplicationStatus.Shortlisted)]
    [InlineData(ApplicationStatus.UnderReview, ApplicationStatus.Rejected)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Offered)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Rejected)]
    public void AllowsEveryTransitionInTheWorkflow(ApplicationStatus from, ApplicationStatus to) =>
        Assert.True(ApplicationStatusPolicy.IsValidTransition(from, to));

    [Theory]
    [InlineData(ApplicationStatus.Submitted,   ApplicationStatus.Offered)]      // cannot skip the workflow
    [InlineData(ApplicationStatus.Submitted,   ApplicationStatus.Shortlisted)]
    [InlineData(ApplicationStatus.Rejected,    ApplicationStatus.UnderReview)]  // cannot leave Rejected
    [InlineData(ApplicationStatus.Offered,     ApplicationStatus.Rejected)]     // cannot leave Offered
    [InlineData(ApplicationStatus.UnderReview, ApplicationStatus.Offered)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Submitted)]    // no going backwards
    public void RejectsEveryTransitionOutsideTheWorkflow(ApplicationStatus from, ApplicationStatus to) =>
        Assert.False(ApplicationStatusPolicy.IsValidTransition(from, to));

    [Fact]
    public void AStateNeverTransitionsToItself() =>
        Assert.False(ApplicationStatusPolicy.IsValidTransition(
            ApplicationStatus.UnderReview, ApplicationStatus.UnderReview));

    [Theory]
    [InlineData(ApplicationStatus.Offered)]
    [InlineData(ApplicationStatus.Rejected)]
    [InlineData(ApplicationStatus.Withdrawn)]
    public void TerminalStatesAreTerminal(ApplicationStatus status) =>
        Assert.True(ApplicationStatusPolicy.IsTerminal(status));

    [Theory]
    [InlineData(ApplicationStatus.Submitted)]
    [InlineData(ApplicationStatus.UnderReview)]
    [InlineData(ApplicationStatus.Shortlisted)]
    public void NonTerminalStatesAreNotTerminal(ApplicationStatus status) =>
        Assert.False(ApplicationStatusPolicy.IsTerminal(status));
}
