import Link from "next/link"

import { TopicBadge } from "@/components/TopicBadge"
import { fetchTalks } from "@/lib/mock-data"
import type { TalkTopic } from "@/types"

// Bonus B2 — its own async fetch so the parent can render the main talk
// immediately and stream this section in behind a <Suspense> boundary.
export async function SimilarTalks({
  topic,
  excludeId,
}: {
  topic: TalkTopic
  excludeId: number
}) {
  const talks = await fetchTalks()
  const similar = talks.filter(
    (t) => t.topic === topic && t.id !== excludeId
  )

  if (similar.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other {topic} talks right now.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {similar.map((talk) => (
        <li key={talk.id}>
          <Link
            href={`/talks/${talk.id}`}
            className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <span className="font-medium">{talk.title}</span>
            <TopicBadge topic={talk.topic} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
