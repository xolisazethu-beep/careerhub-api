## Assignment 1.2 — Design Decisions

### Why PostedAt is in JobResponse but not CreateJobRequest

[YOU WRITE THIS — one paragraph in your own words.
Think: Who decides when a job was posted — the user filling in the form,
or the server receiving the submission? If the client could set this, what
could go wrong? Why does the frontend still need to display this value back?]

### Salary cross-field validation approach

I used `IValidatableObject` on the request DTO. Data Annotations alone
cannot compare two fields against each other, so I implemented the
`Validate()` method on both `CreateJobRequest` and `UpdateJobRequest`.
When both `SalaryMin` and `SalaryMax` are supplied, the method returns a
`ValidationResult` keyed to the `SalaryMax` member. This keeps the
cross-field rule next to the other validation rules on the same DTO, so a
developer reading the file sees every rule in one place, and the endpoint
code stays free of manual if-checks.

### PUT status code: 200 OK with body, or 204 No Content?

[YOU WRITE THIS — two or three sentences.
Your code returns 200 OK with the updated JobResponse in the body.
Defend it: what does the React frontend gain by receiving the updated
resource immediately, instead of having to make a second GET? When might
204 be the better call instead, and why didn't that apply here?]

### DELETE for a missing ID

[YOU WRITE THIS — two or three sentences.
Your code currently returns 404 when deleting a job that doesn't exist.
Defend that choice — for a job board specifically, why is visible
feedback better than silent success? Bonus angle: the counter-argument
is that DELETE is supposed to be idempotent, meaning repeating it should
be safe. Acknowledge that and explain why 404 still fits your context.]