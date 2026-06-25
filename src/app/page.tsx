"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { TalkCard } from "@/components/TalkCard"
import { RegisterForm } from "@/components/RegisterForm"
import { TopicFilter, type TopicFilterValue } from "@/components/TopicFilter"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchTalks } from "@/lib/mock-data"

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-6">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export default function Home() {
  const [filter, setFilter] = useState<TopicFilterValue>("All")

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["talks"],
    queryFn: fetchTalks,
  })

  const visibleTalks =
    data?.filter((talk) => filter === "All" || talk.topic === filter) ?? []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">TechTalks 2026</h1>
        <p className="text-muted-foreground">
          Browse the sessions and grab your spot before they fill up.
        </p>
      </header>

      <TopicFilter active={filter} onChange={setFilter} />

      {isError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&apos;t load talks: {error.message}
        </div>
      )}

      {isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTalks.map((talk) => (
            <TalkCard key={talk.id} talk={talk} />
          ))}
        </div>
      )}

      <section className="mx-auto w-full max-w-md">
        <RegisterForm talkId={1} />
      </section>
    </div>
  )
}
