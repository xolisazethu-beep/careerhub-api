import type { Talk, Registration } from "@/types"

/**
 * Simulated network latency helper.
 * Exported so bonus tasks (e.g. loading.tsx) can crank the delay up for testing.
 */
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

const talks: Talk[] = [
  {
    id: 1,
    title: "React 19 Deep Dive: The Compiler & Auto-Memoisation",
    speaker: "Xolisa Matsila",
    topic: "Frontend",
    duration: 45,
    capacity: 60,
    registrationCount: 47,
    scheduledAt: "2026-07-14T09:00:00+02:00",
    location: "Bitcube Hall A, Bloemfontein",
    description:
      "A hands-on look at what the React 19 compiler actually does, why it removes the need for useMemo/useCallback in most cases, and how to verify it is working.",
  },
  {
    id: 2,
    title: "React 19 Deep Dive: The Compiler & Auto-Memoisation",
    speaker: "Sipho Dlamini",
    topic: "Backend",
    duration: 50,
    capacity: 50,
    registrationCount: 50,
    scheduledAt: "2026-07-14T11:00:00+02:00",
    location: "Bitcube Hall B, Bloemfontein",
    description:
      "Real patterns for taming noImplicitAny, strictNullChecks, and discriminated unions in a production codebase.",
  },
  {
    id: 3,
    title: "Next.js App Router: Server vs Client — Drawing the Line",
    speaker: "Skye Senatla",
    topic: "Frontend",
    duration: 45,
    capacity: 60,
    registrationCount: 52,
    scheduledAt: "2026-07-14T13:30:00+02:00",
    location: "Main Stage",
    description:
      "When to reach for 'use client', why Server Components cannot read cookies or call hooks, and how Suspense boundaries let you stream partial UI",
  },
  {
    id: 4,
    title: "Practical Prompting for Retrieval-Augmented Apps",
    speaker: "Skye Senatla",
    topic: "AI/ML",
    duration: 55,
    capacity: 70,
    registrationCount: 64,
    scheduledAt: "2026-07-15T09:30:00+02:00",
    location: "Bitcube Hall A, Bloemfontein",
    description:
      "Why z.infer replaces hand-written TypeScript types, how to use .refine for cross-field validation, and a tour of what changed in v4.",
  },
  {
    id: 5,
    title: "Flutter Layouts That Survive Contact With Designers",
    speaker: "Karabo Nel",
    topic: "Mobile",
    duration: 45,
    capacity: 45,
    registrationCount: 19,
    scheduledAt: "2026-07-15T11:30:00+02:00",
    location: "Lab 1, Bloemfontein",
    description:
      "From dockerfile to health checks: packaging a .NET 10 minimal API and shipping it to Azure Container Apps with a managed identity.",
  },
  {
    id: 6,
    title: "TanStack Query: Caching You Can Reason About",
    speaker: "Ayanda Petersen",
    topic: "Frontend",
    duration: 40,
    capacity: 55,
    registrationCount: 31,
    scheduledAt: "2026-07-15T14:00:00+02:00",
    location: "Bitcube Hall B, Bloemfontein",
    description:
      "Building a hybrid semantic + keyword search pipeline using Semantic Kernel, pgvector, and a .NET 10 background service.",
  },
]


const registrations: Registration[] = []
let nextRegistrationId = 1

export async function fetchTalks(): Promise<Talk[]> {
  await delay(700)
  return talks.map((t) => ({ ...t }))
}
export async function fetchTalkById(id: number): Promise<Talk | null> {
  await delay(400)
  const talk = talks.find((t) => t.id === id)
  return talk ? { ...talk } : null
}

export interface CreateRegistrationInput {
  talkId: number
  attendeeName: string
  attendeeEmail: string
}

export async function createRegistration(
  data: CreateRegistrationInput
): Promise<Registration> {
  await delay(900)

  const duplicate = registrations.some(
    (r) =>
      r.talkId === data.talkId &&
      r.attendeeEmail.toLowerCase() === data.attendeeEmail.toLowerCase()
  )
  if (duplicate) {
    throw new Error("You are already registered for this talk.")
  }

  const talk = talks.find((t) => t.id === data.talkId)
  if (!talk) {
    throw new Error("That talk no longer exists.")
  }
  if (talk.registrationCount >= talk.capacity) {
    throw new Error("This talk is fully booked.")
  }

  const registration: Registration = {
    id: nextRegistrationId++,
    talkId: data.talkId,
    attendeeName: data.attendeeName,
    attendeeEmail: data.attendeeEmail,
    registeredAt: new Date().toISOString(),
  }
  registrations.push(registration)
  talk.registrationCount += 1

  return registration
}

export { talks }
