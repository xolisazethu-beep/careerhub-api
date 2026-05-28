# CareerHub API – Assignment 1.2

## Overview

This assignment extends the CareerHub API from Assignment 1.1 by adding full CRUD functionality, DTO separation, validation, enum constraints, and global error handling using Problem Details.

---

# Assignment 1.2 README

## PostedAt in JobResponse but not CreateJobRequest

`PostedAt` belongs in the `JobResponse` because it is generated and controlled by the server when a job is created. The client should not decide when a job was posted because that could lead to incorrect or manipulated data. By keeping it out of `CreateJobRequest`, the API ensures that every job gets an accurate timestamp from the server.

---

## Salary Cross-Field Validation

I used `IValidatableObject` inside the request DTO to validate that `SalaryMax` is greater than `SalaryMin` when both values are provided.

This approach keeps the controller clean because all validation logic stays inside the DTO instead of adding manual checks in controller actions. It also works well with ASP.NET Core model validation and automatically returns a `400 Bad Request` response when validation fails.

### Example Validation Logic

```csharp
public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
{
    if (SalaryMin.HasValue && SalaryMax.HasValue)
    {
        if (SalaryMax <= SalaryMin)
        {
            yield return new ValidationResult(
                "SalaryMax must be greater than SalaryMin.",
                new[] { nameof(SalaryMax) }
            );
        }
    }
}
```

---

## PUT Status Code Choice

I chose to return `200 OK` with the updated `JobResponse`.

Returning the updated object immediately gives the client the latest version of the resource without requiring another GET request. This is useful because the client can instantly confirm the updated values, including computed fields like `SalaryDisplay`.

---

## DELETE Behaviour for Missing IDs

My API returns `404 Not Found` when a client tries to delete a job that does not exist.

A job board should clearly communicate when a requested resource cannot be found. Returning `404` helps the client understand that the job either never existed or was already deleted. This prevents silent failures and makes debugging easier for frontend developers.

---

# DTO Structure

## CreateJobRequest

Used when creating a new job listing.

### Validation Rules

* `Title` → required, 5–120 characters
* `Company` → required, 2–80 characters
* `Location` → required
* `Description` → required, minimum 20 characters
* `Type` → required (`FullTime`, `PartTime`, `Contract`, `Internship`)
* `SalaryMin` → optional, must be greater than 0 if provided
* `SalaryMax` → optional, must be greater than 0 if provided
* `SalaryMax` must be greater than `SalaryMin`

---

## UpdateJobRequest

Used when updating an existing job.

The validation rules are identical to `CreateJobRequest`. The ID is supplied from the route parameter instead of the request body.

---

## JobResponse

Returned to the client when job data is requested.

### Includes

* Job ID
* Title
* Company
* Location
* Description
* Job Type
* SalaryMin
* SalaryMax
* PostedAt
* IsActive
* SalaryDisplay

### SalaryDisplay Examples

```text
R25,000 – R40,000/month
From R25,000/month
Salary not specified
```

`SalaryDisplay` is generated during mapping and is not stored in the database.

---

# JobType Enum

The API uses a `JobType` enum to prevent invalid values from being stored.

## Valid Values

```csharp
public enum JobType
{
    FullTime,
    PartTime,
    Contract,
    Internship
}
```

The JSON serializer is configured to return enum values as readable strings instead of numbers.

### Example

```json
{
  "type": "FullTime"
}
```

This makes the API responses easier for frontend developers to understand.

---

# Global Error Handling

The API uses RFC 7807 Problem Details responses for all errors.

## Configuration

```csharp
builder.Services.AddProblemDetails();
// Registers RFC 7807 Problem Details support.

app.UseExceptionHandler();
// Handles unhandled exceptions globally.

app.UseStatusCodePages();
// Returns Problem Details for HTTP status codes like 404.
```

This ensures every error response follows a consistent structure.

---

# Duplicate Job Protection

Before creating a job, the API checks whether another job already exists with the same `Title` and `Company`.

The comparison is case-insensitive to avoid duplicate records such as:

```text
Software Developer
software developer
```

If a duplicate exists, the API returns:

```http
409 Conflict
```

using Problem Details.

---

# Scalar UI Testing

The following scenarios were tested using Scalar UI:

1. Validation failure with empty POST body
2. Salary validation failure where SalaryMax < SalaryMin
3. Successful POST request with correct PostedAt and SalaryDisplay
4. Duplicate POST request returning 409 Conflict
5. GET/PUT request for non-existing ID returning 404 Not Found
6. DELETE request followed by GET request

---

# Suggested Commit History

```text
Evolve JobListing model with PostedAt and IsActive
Add DTOs and SalaryDisplay mapping
Add JobType enum with JSON string serialization
Implement POST /jobs with duplicate guard
Implement PUT and DELETE endpoints
Configure global Problem Details pipeline
```

---

# Technologies Used

* ASP.NET Core Web API
* C#
* DTO Pattern
* Data Annotations Validation
* RFC 7807 Problem Details
* Scalar UI
* REST API Principles
