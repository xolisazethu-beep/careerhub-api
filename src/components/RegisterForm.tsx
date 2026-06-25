"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRegistration } from "@/lib/mock-data"

const registrationSchema = z.object({
  attendeeName: z.string().min(2, "Name must be at least 2 characters."),
  attendeeEmail: z.string().email("Enter a valid email address."),
  talkId: z.number(),
})

type RegistrationValues = z.infer<typeof registrationSchema>

interface RegisterFormProps {
  talkId: number
  registrationCount?: number
  capacity?: number
}

export function RegisterForm({
  talkId,
  registrationCount,
  capacity,
}: RegisterFormProps) {
  const queryClient = useQueryClient()

  const isFull =
    registrationCount !== undefined &&
    capacity !== undefined &&
    registrationCount >= capacity

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { attendeeName: "", attendeeEmail: "", talkId },
  })

  const mutation = useMutation({
    mutationFn: createRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talks"] })
      reset({ attendeeName: "", attendeeEmail: "", talkId })
    },
  })

  if (isFull) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
        This talk is fully booked. Check back in case a spot opens up.
      </div>
    )
  }

  const onSubmit = (values: RegistrationValues) => {
    mutation.mutate(values)
  }

  const pending = isSubmitting || mutation.isPending

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <h3 className="font-semibold">Register for this talk</h3>

      {mutation.isSuccess && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          You&apos;re registered. See you there!
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {mutation.error.message}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="attendeeName">Full name</Label>
        <Input
          id="attendeeName"
          placeholder="Xolisa Matsila"
          aria-invalid={!!errors.attendeeName}
          {...register("attendeeName")}
        />
        {errors.attendeeName && (
          <p className="text-sm text-destructive">
            {errors.attendeeName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="attendeeEmail">Email</Label>
        <Input
          id="attendeeEmail"
          type="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.attendeeEmail}
          {...register("attendeeEmail")}
        />
        {errors.attendeeEmail && (
          <p className="text-sm text-destructive">
            {errors.attendeeEmail.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Registering…" : "Register"}
      </Button>
    </form>
  )
}
