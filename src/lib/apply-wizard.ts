// =============================================================
// src/lib/apply-wizard.ts
// Single source of truth for the 5-step Job Application Wizard:
//   • Zod schemas (one per step) + the inferred value type
//   • SA-specific option lists (provinces, qualifications, …)
//   • Document-requirement logic (which PDFs are needed for THIS application)
//
// The field names here are the wire contract the backend will implement
// (see docs/BACKEND-GAPS.md). Until those endpoints ship, the wizard persists
// drafts and the submitted record to localStorage — see apply-draft.ts.
// =============================================================

import { z } from "zod";

// ---- option lists ---------------------------------------------------------

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
  "Other (international)",
] as const;

export const GENDERS = ["Male", "Female", "Other", "PreferNotToSay"] as const;
export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  Male: "Male",
  Female: "Female",
  Other: "Other",
  PreferNotToSay: "Prefer not to say",
};

export const RACES = [
  "African",
  "Coloured",
  "Indian",
  "White",
  "Other",
  "Prefer not to say",
] as const;

export const EMPLOYMENT_STATUSES = [
  "Unemployed",
  "Employed",
  "Student",
  "SelfEmployed",
] as const;
export const EMPLOYMENT_STATUS_LABELS: Record<
  (typeof EMPLOYMENT_STATUSES)[number],
  string
> = {
  Unemployed: "Unemployed",
  Employed: "Employed",
  Student: "Student",
  SelfEmployed: "Self-employed",
};

/** Highest-qualification options. `tertiary: true` ones trigger the
 *  "Tertiary qualification" document requirement in the Documents step. */
export const QUALIFICATIONS = [
  { value: "None", label: "No formal qualification", tertiary: false },
  { value: "Matric", label: "Matric / National Senior Certificate", tertiary: false },
  { value: "HigherCertificate", label: "Higher Certificate", tertiary: true },
  { value: "Diploma", label: "Diploma", tertiary: true },
  { value: "Bachelors", label: "Bachelor's Degree", tertiary: true },
  { value: "Honours", label: "Honours Degree", tertiary: true },
  { value: "Masters", label: "Master's Degree", tertiary: true },
  { value: "Doctorate", label: "Doctorate", tertiary: true },
] as const;

export const NOTICE_PERIODS = [
  "Immediately",
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months or more",
] as const;

export function isTertiary(qualValue: string): boolean {
  return QUALIFICATIONS.find((q) => q.value === qualValue)?.tertiary ?? false;
}

// ---- schema ---------------------------------------------------------------

const PHONE_RE = /^\+?[\d\s\-()]{8,15}$/;
const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com\//i;
const URL_RE = /^https?:\/\/.+\..+/i;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const wizardSchema = z
  .object({
    // Step 1 — Personal
    fullNames: z.string().trim().min(2, "Please enter your full name(s)."),
    surname: z.string().trim().min(2, "Please enter your surname."),
    gender: z.enum(GENDERS, { message: "Please select an option." }),
    race: z.string().optional().or(z.literal("")),
    dateOfBirth: z.string().min(1, "Please enter your date of birth."),
    disabilityStatus: z.boolean(),
    disabilityDetails: optionalString,
    nationality: z.enum(["South African", "Other"], {
      message: "Please choose your nationality.",
    }),
    nationalityOther: optionalString,

    // Step 2 — Contact
    email: z.email("Enter a valid email address."),
    phone: z.string().regex(PHONE_RE, "Enter a valid phone number."),
    alternatePhone: z
      .string()
      .regex(PHONE_RE, "Enter a valid phone number.")
      .or(z.literal(""))
      .optional(),
    physicalAddress: z.string().trim().min(5, "Please enter your address."),
    city: z.string().trim().min(2, "Please enter your city."),
    province: z.enum(SA_PROVINCES, { message: "Please select a province." }),
    postalCode: z.string().trim().min(3, "Please enter a postal code."),

    // Step 3 — Qualifications & experience
    highestQualification: z
      .string()
      .min(1, "Please select your highest qualification."),
    institution: z.string().trim().min(2, "Please enter your institution."),
    yearCompleted: z
      .string()
      .optional()
      .or(z.literal("")),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES, {
      message: "Please select your employment status.",
    }),
    yearsOfExperience: z
      .string()
      .regex(/^\d{1,2}$/, "Enter your years of experience (0–60)."),
    linkedInUrl: z
      .string()
      .regex(LINKEDIN_RE, "Must be a https://linkedin.com/ URL.")
      .or(z.literal(""))
      .optional(),
    portfolioUrl: z
      .string()
      .regex(URL_RE, "Enter a valid URL (https://…).")
      .or(z.literal(""))
      .optional(),

    // Step 4 — Job-specific
    motivationText: z
      .string()
      .trim()
      .min(100, "Tell us a little more — at least 100 characters."),
    expectedSalary: z
      .string()
      .regex(/^\d+$/, "Enter a whole number in ZAR.")
      .or(z.literal(""))
      .optional(),
    noticePeriod: z.enum(NOTICE_PERIODS, { message: "Please select a notice period." }),
    availableStartDate: z.string().min(1, "Please choose an available start date."),
    willingToRelocate: z.boolean(),

    // Step 5 — Consent (documents are validated outside RHF, see the component)
    confirmedAccurate: z.boolean(),
    consentDataProcessing: z.boolean(),
    consentEmployerContact: z.boolean(),
  })
  // If a disability is declared, details become required.
  .refine((d) => !d.disabilityStatus || (d.disabilityDetails ?? "").trim().length > 0, {
    message: "Please describe the support you may need.",
    path: ["disabilityDetails"],
  })
  // "Other" nationality needs a country.
  .refine((d) => d.nationality !== "Other" || (d.nationalityOther ?? "").trim().length > 0, {
    message: "Please enter your nationality.",
    path: ["nationalityOther"],
  })
  // All three consents must be ticked before submitting.
  .refine((d) => d.confirmedAccurate, {
    message: "Please confirm your information is accurate.",
    path: ["confirmedAccurate"],
  })
  .refine((d) => d.consentDataProcessing, {
    message: "Please consent to data processing to continue.",
    path: ["consentDataProcessing"],
  })
  .refine((d) => d.consentEmployerContact, {
    message: "Please agree to be contacted by employers.",
    path: ["consentEmployerContact"],
  });

export type WizardValues = z.infer<typeof wizardSchema>;

export const WIZARD_EMPTY: WizardValues = {
  fullNames: "",
  surname: "",
  gender: "PreferNotToSay",
  race: "",
  dateOfBirth: "",
  disabilityStatus: false,
  disabilityDetails: "",
  nationality: "South African",
  nationalityOther: "",
  email: "",
  phone: "",
  alternatePhone: "",
  physicalAddress: "",
  city: "",
  province: "Gauteng",
  postalCode: "",
  highestQualification: "",
  institution: "",
  yearCompleted: "",
  employmentStatus: "Unemployed",
  yearsOfExperience: "0",
  linkedInUrl: "",
  portfolioUrl: "",
  motivationText: "",
  expectedSalary: "",
  noticePeriod: "1 month",
  availableStartDate: "",
  willingToRelocate: false,
  confirmedAccurate: false,
  consentDataProcessing: false,
  consentEmployerContact: false,
};

export const STEP_LABELS = [
  "Personal information",
  "Contact details",
  "Qualifications",
  "Job-specific questions",
  "Documents & consent",
] as const;

/** Fields validated by RHF `trigger()` at each step (Step 5 = consents). */
export const STEP_FIELDS: (keyof WizardValues)[][] = [
  [
    "fullNames",
    "surname",
    "gender",
    "dateOfBirth",
    "disabilityStatus",
    "disabilityDetails",
    "nationality",
    "nationalityOther",
  ],
  ["email", "phone", "alternatePhone", "physicalAddress", "city", "province", "postalCode"],
  [
    "highestQualification",
    "institution",
    "yearCompleted",
    "employmentStatus",
    "yearsOfExperience",
    "linkedInUrl",
    "portfolioUrl",
  ],
  ["motivationText", "expectedSalary", "noticePeriod", "availableStartDate", "willingToRelocate"],
  ["confirmedAccurate", "consentDataProcessing", "consentEmployerContact"],
];

// ---- documents ------------------------------------------------------------
// Mirrors the backend DocumentType enum (docs/BACKEND-GAPS.md §D).

export type DocumentType =
  | "IdDocument"
  | "Passport"
  | "MatricResults"
  | "TertiaryQualification"
  | "DriversLicence"
  | "MotivationLetter"
  | "Cv";

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  IdDocument: "ID Document (SA)",
  Passport: "Passport",
  MatricResults: "Matric Results",
  TertiaryQualification: "Tertiary Qualification",
  DriversLicence: "Driver's Licence",
  MotivationLetter: "Motivation Letter",
  Cv: "CV / Résumé",
};

export interface RequiredDoc {
  type: DocumentType;
  label: string;
  /** Short note shown under the label. */
  note?: string;
}

/**
 * Which documents this specific application needs, given the answers so far and
 * the job's `requiresDriversLicence` flag. The conditional rules:
 *   • SA nationality → ID Document; otherwise → Passport.
 *   • Tertiary qualification chosen → Tertiary Qualification certificate.
 *   • Job requires a licence → Driver's Licence.
 *   • Matric, Motivation Letter and CV are always required.
 */
export function requiredDocuments(args: {
  isSouthAfrican: boolean;
  hasTertiary: boolean;
  jobRequiresLicence: boolean;
}): RequiredDoc[] {
  const docs: RequiredDoc[] = [];
  if (args.isSouthAfrican) {
    docs.push({ type: "IdDocument", label: DOCUMENT_LABELS.IdDocument });
  } else {
    docs.push({ type: "Passport", label: DOCUMENT_LABELS.Passport });
  }
  docs.push({ type: "MatricResults", label: DOCUMENT_LABELS.MatricResults });
  if (args.hasTertiary) {
    docs.push({
      type: "TertiaryQualification",
      label: DOCUMENT_LABELS.TertiaryQualification,
      note: "Required because you selected a tertiary qualification.",
    });
  }
  if (args.jobRequiresLicence) {
    docs.push({
      type: "DriversLicence",
      label: DOCUMENT_LABELS.DriversLicence,
      note: "This role requires a valid driver's licence.",
    });
  }
  docs.push({ type: "MotivationLetter", label: DOCUMENT_LABELS.MotivationLetter });
  docs.push({ type: "Cv", label: DOCUMENT_LABELS.Cv });
  return docs;
}

/** Per-document PDF cap — 3 MB (matches the backend's documented limit). */
export const MAX_DOC_BYTES = 3 * 1024 * 1024;
