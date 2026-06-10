using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class RelaxSubmittedAtSkewTolerance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_applications_submitted_not_future",
                table: "applications");

            migrationBuilder.AddCheckConstraint(
                name: "ck_applications_submitted_not_future",
                table: "applications",
                sql: "\"SubmittedAt\" <= now() + interval '5 seconds'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_applications_submitted_not_future",
                table: "applications");

            migrationBuilder.AddCheckConstraint(
                name: "ck_applications_submitted_not_future",
                table: "applications",
                sql: "\"SubmittedAt\" <= now()");
        }
    }
}
