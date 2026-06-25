"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registerForTalk } from "@/app/actions/registerForTalk"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Quick register"}
    </Button>
  )
}

// Bonus B3 — pairs with the registerForTalk Server Action via useActionState.
export function QuickRegisterForm({ talkId }: { talkId: number }) {
  const [state, formAction] = useActionState(registerForTalk, null)

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <h3 className="font-semibold">Quick register (Server Action)</h3>

      {state?.ok && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
        </div>
      )}
      {state && !state.ok && !state.errors && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <input type="hidden" name="talkId" value={talkId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qr-name">Full name</Label>
        <Input id="qr-name" name="attendeeName" placeholder="Xolisa Matsila" />
        {state?.errors?.attendeeName && (
          <p className="text-sm text-destructive">{state.errors.attendeeName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qr-email">Email</Label>
        <Input
          id="qr-email"
          name="attendeeEmail"
          type="email"
          placeholder="you@example.com"
        />
        {state?.errors?.attendeeEmail && (
          <p className="text-sm text-destructive">
            {state.errors.attendeeEmail}
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  )
}
