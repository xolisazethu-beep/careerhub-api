import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Clock, MapPin, Users } from "lucide-react"

import { RegisterForm } from "@/components/RegisterForm"
import { SimilarTalks } from "@/components/SimilarTalks"
import { TopicBadge } from "@/components/TopicBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchTalkById } from "@/lib/mock-data"

function formatSchedule(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function TalkPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const talk = await fetchTalkById(Number(id))

  if (!talk) notFound()

  return (
    <div className="flex flex-col gap-10">
      <article className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <TopicBadge topic={talk.topic} />
          <span className="text-sm text-muted-foreground">{talk.speaker}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">{talk.title}</h1>

        <p className="text-base text-foreground/80">{talk.description}</p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {talk.duration} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {talk.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" />
            {talk.registrationCount} / {talk.capacity} registered
          </span>
        </div>

        <p className="text-sm text-foreground/70">
          {formatSchedule(talk.scheduledAt)}
        </p>
      </article>

      <section className="max-w-md">
        <RegisterForm
          talkId={talk.id}
          registrationCount={talk.registrationCount}
          capacity={talk.capacity}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Similar Talks</h2>
        <Suspense
          fallback={
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          }
        >
          <SimilarTalks topic={talk.topic} excludeId={talk.id} />
        </Suspense>
      </section>
    </div>
  )
}
