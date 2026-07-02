"use client";

// Assignment 3.4, Part 2 Step 4 — error boundary for the Employer dashboard.
// (This repo's employer area is /recruiter — the assignment calls it /dashboard.)
import RouteErrorScreen from "@/components/RouteErrorScreen";

export default function RecruiterError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorScreen
      {...props}
      resource="Dashboard"
      backHref="/jobs"
      backLabel="Back to jobs"
      forbiddenHeading="Employer Access Required"
      forbiddenMessage="The recruiter dashboard is for employer accounts. You're signed in as a job seeker — sign in with an employer account to manage listings."
      notFoundMessage="We couldn't load the recruiter dashboard."
    />
  );
}
