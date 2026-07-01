using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationSkillsAndCv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CvContentType",
                table: "applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "CvData",
                table: "applications",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CvFileName",
                table: "applications",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "SelectedSkills",
                table: "applications",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CvContentType",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "CvData",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "CvFileName",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "SelectedSkills",
                table: "applications");
        }
    }
}
