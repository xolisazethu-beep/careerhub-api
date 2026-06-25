"use client"

import { useState } from "react"
import Link from "next/link"

import { TalkCard } from "@/components/TalkCard"
import { TopicFilter, type TopicFilterValue } from "@/components/TopicFilter"
import type { Talk } from "@/types"

export function TalksBrowser({ talks }: { talks: Talk[] }) {
  const [filter, setFilter] = useState<TopicFilterValue>("All")

  const visibleTalks = talks.filter(
    (talk) => filter === "All" || talk.topic === filter
  )

  return (
    <div className="flex flex-col gap-6">
      <TopicFilter active={filter} onChange={setFilter} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTalks.map((talk) => (
          <Link
            key={talk.id}
            href={`/talks/${talk.id}`}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <TalkCard talk={talk} />
          </Link>
        ))}
      </div>
    </div>
  )
}
