"use server"

import { createRegistration } from "@/lib/mock-data"

export interface ActionState {
  ok: boolean
  message: string
  errors?: {
    attendeeName?: string
    attendeeEmail?: string
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function registerForTalk(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const attendeeName = String(formData.get("attendeeName") ?? "").trim()
  const attendeeEmail = String(formData.get("attendeeEmail") ?? "").trim()
  const talkId = Number(formData.get("talkId"))

  const errors: ActionState["errors"] = {}
  if (attendeeName.length < 2) {
    errors.attendeeName = "Name must be at least 2 characters."
  }
  if (!EMAIL_RE.test(attendeeEmail)) {
    errors.attendeeEmail = "Enter a valid email address."
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please fix the errors below.", errors }
  }

  try {
    await createRegistration({ talkId, attendeeName, attendeeEmail })
    return { ok: true, message: "You're registered. See you there!" }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong."
    return { ok: false, message }
  }
}
