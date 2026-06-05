# Controllers Setup Documentation

## Overview
This document describes the new controller structure added to the CareerHub API, including controllers for managing applications and jobs.

## New Folder Structure

```
CareerHub.Api/
├── Controllers/
│   ├── Application.cs          # Application model (moved from Models)
│   ├── ApplicationController.cs # Application management endpoints
│   └── JobController.cs         # Job search and details endpoints
├── Services/
│   ├── JobService.cs
│   ├── AuthService.cs
│   └── NotificationService.cs   # NEW: Notification service for rejections
├── Models/
│   ├── Applicant.cs
│   ├── Company.cs
│   └── JobListing.cs (updated with job requirements)
└── [other directories...]
```

---

## 1. Application Model (Controllers/Application.cs)

**Moved from:** Models/Application.cs
**Current Namespace:** CareerHub.Api.Controllers

### Properties:
- `JobListingId` (Guid) - Foreign key to JobListing
- `ApplicantId` (Guid) - Foreign key to Applicant  
- `SubmittedAt` (DateTime) - Application submission time
- `Status` (ApplicationStatus enum) - Current application status
- `CoverNote` (string) - Optional cover letter/pitch
- `StatusUpdatedAt` (DateTime?) - Last status update time
- Navigation properties for JobListing and Applicant

### ApplicationStatus Enum:
```csharp
public enum ApplicationStatus
{
    Submitted,
    UnderReview,
    Interview,
    Offer,
    Rejected,
    Withdrawn
}
```

---

## 2. ApplicationController

**Location:** Controllers/ApplicationController.cs
**Base Route:** `/api/application`

### Endpoints:

#### GET /api/application/{jobListingId}/{applicantId}
Retrieve a specific application by job listing ID and applicant ID.
- **Response:** ApplicationDto with full application details

#### GET /api/application/applicant/{applicantId}
Get all applications submitted by a specific applicant.
- **Response:** List of ApplicationDto objects

#### GET /api/application/status/{jobListingId}/{applicantId}
Get the current status of an application.
- **Response:** Object with status, submission date, and last update

#### DELETE /api/application/{jobListingId}/{applicantId}
Remove/withdraw an application from the system.
- **Response:** Success message

#### PUT /api/application/{jobListingId}/{applicantId}/status
Update the status of an application.
- **Request Body:**
  ```json
  {
    "status": "InterviewScheduled"  // or any ApplicationStatus value
  }
  ```
- **Response:** Updated ApplicationDto
- **Special:** Automatically triggers rejection notification if status changes to "Rejected"

### ApplicationDto:
```csharp
{
    "jobListingId": "guid",
    "applicantId": "guid",
    "jobTitle": "string",
    "applicantName": "string",
    "applicantEmail": "string",
    "status": "string",
    "submittedAt": "datetime",
    "statusUpdatedAt": "datetime?",
    "coverNote": "string"
}
```

---

## 3. JobController

**Location:** Controllers/JobController.cs
**Base Route:** `/api/job`

### Endpoints:

#### GET /api/job/{jobListingId}
Get complete job details including salary range and requirements.
- **Response:** JobDetailDto with full job information

#### GET /api/job/search
Search for jobs with optional filters.
- **Query Parameters:**
  - `title` (string, optional) - Job title search
  - `location` (string, optional) - Location filter
  - `minSalary` (decimal, optional) - Minimum salary
  - `maxSalary` (decimal, optional) - Maximum salary
  - `jobType` (string, optional) - Type: FullTime, PartTime, Contract, Internship
  - `activeOnly` (bool, default: true) - Only show active listings
- **Response:** List of JobListingDto objects

#### GET /api/job/company/{companyId}
Get all jobs posted by a specific company.
- **Response:** List of JobListingDto objects

#### GET /api/job/{jobListingId}/salary-info
Get detailed salary information for a specific job.
- **Response:** SalaryInfoDto with min, max, and range

#### GET /api/job/{jobListingId}/requirements
Get job requirements (degree, diploma, experience).
- **Response:** JobRequirementsDto with all requirements

### JobDetailDto:
```csharp
{
    "id": "guid",
    "title": "string",
    "description": "string",
    "location": "string",
    "type": "FullTime|PartTime|Contract|Internship",
    "salaryMin": decimal,
    "salaryMax": decimal,
    "salaryRange": "R50000 - R75000",
    "postedAt": "datetime",
    "companyName": "string",
    "requiredDegree": "Bachelor's Degree Computer Science or related",
    "requiredDiploma": "AWS Certification",
    "minimumYearsExperience": 3,
    "isActive": true
}
```

### JobListingDto:
```csharp
{
    "id": "guid",
    "title": "string",
    "location": "string",
    "type": "string",
    "salaryMin": decimal,
    "salaryMax": decimal,
    "salaryRange": "string",
    "companyName": "string",
    "postedAt": "datetime"
}
```

### SalaryInfoDto:
```csharp
{
    "jobTitle": "string",
    "salaryMin": decimal,
    "salaryMax": decimal,
    "salaryRange": "R50000 - R75000",
    "currency": "ZAR"
}
```

### JobRequirementsDto:
```csharp
{
    "jobTitle": "string",
    "requiredDegree": "Bachelor's Degree",
    "requiredDiploma": "AWS Certification",
    "minimumYearsExperience": 3,
    "description": "string"
}
```

---

## 4. Updated JobListing Model

**Location:** Models/JobListing.cs

### New Fields Added:
- `RequiredDegree` (string) - e.g., "Bachelor's Degree", "Diploma"
- `RequiredDiploma` (string) - e.g., "AWS Certification", "PMP"
- `MinimumYearsExperience` (int) - Minimum years required (default: 0)

### Database Configuration:
- `RequiredDegree`: MaxLength 200
- `RequiredDiploma`: MaxLength 200
- `MinimumYearsExperience`: Required field with default 0

---

## 5. NotificationService

**Location:** Services/NotificationService.cs
**Interface:** INotificationService

### Methods:

#### SendApplicationRejectionAsync(jobListingId, applicantId, reason)
Sends a rejection notification to the applicant.
- **Parameters:**
  - `jobListingId` (Guid) - The job listing ID
  - `applicantId` (Guid) - The applicant ID
  - `reason` (string, optional) - Reason for rejection
- **Behavior:** Currently logs to console; can be extended to send emails

#### SendApplicationApprovedAsync(jobListingId, applicantId)
Sends an approval notification to the applicant.
- **Parameters:**
  - `jobListingId` (Guid)
  - `applicantId` (Guid)

#### SendInterviewInvitationAsync(jobListingId, applicantId, interviewDate)
Sends an interview invitation to the applicant.
- **Parameters:**
  - `jobListingId` (Guid)
  - `applicantId` (Guid)
  - `interviewDate` (DateTime)

### Usage:
The NotificationService is automatically triggered when an application status is changed to "Rejected" through the ApplicationController.

---

## 6. Database Migration

**Migration Name:** AddJobRequirements
**Created:** 2026-06-04

This migration adds three new columns to the job_listings table:
- `required_degree` (varchar(200), nullable)
- `required_diploma` (varchar(200), nullable)
- `minimum_years_experience` (int, not null, default 0)

---

## 7. Updated Configuration

### Program.cs Changes:
- Registered `INotificationService` as scoped service
- Added `app.MapControllers()` to discover and map the new controllers

### File Import Updates:
The following files were updated to import Application from the Controllers namespace:
- `Data/CareerHubDbContext.cs`
- `Data/SeedData.cs`
- `DTOs/Dtos.cs`
- `Services/JobService.cs`
- `Models/Applicant.cs`
- `Models/JobListing.cs`

---

## 8. Example API Usage

### Search for Jobs
```bash
GET /api/job/search?title=Backend&location=Cape%20Town&minSalary=600000
```

### Get Job Details with Requirements
```bash
GET /api/job/{jobListingId}/requirements
```

### Check Application Status
```bash
GET /api/application/status/{jobListingId}/{applicantId}
```

### Update Application Status (with auto-rejection notification)
```bash
PUT /api/application/{jobListingId}/{applicantId}/status
Content-Type: application/json

{
  "status": "Rejected"
}
```

### Remove Application
```bash
DELETE /api/application/{jobListingId}/{applicantId}
```

---

## 9. Key Features Implemented

✅ **Application Management**
- Search applications by ID
- View application status with timestamps
- Remove/withdraw applications
- Update application status with automatic notifications

✅ **Job Search & Filtering**
- Search by title, location, salary range, job type
- Get detailed job information
- View specific salary ranges
- View job requirements (degree, diploma, experience)

✅ **Job Requirements**
- Store degree requirements
- Store diploma/certification requirements
- Store minimum years of experience
- Query job requirements independently

✅ **Rejection Notifications**
- Automatic notification when application is rejected
- Support for custom rejection reasons
- Extensible notification system for future email/SMS integration

---

## 10. Future Enhancements

Potential areas for expansion:
- Email notification implementation
- In-app notification system (database-backed)
- Job recommendation based on qualifications
- Applicant profile management endpoints
- Job analytics and reporting
- Advanced search with complex filtering
- Export applications to PDF
