import { TalksBrowser } from "@/components/TalksBrowser"
import { fetchTalks } from "@/lib/mock-data"

export default async function TalksPage() {
  const talks = await fetchTalks()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">All Talks</h1>
        <p className="text-muted-foreground">
          {talks.length} sessions across the conference. Tap a card for details.
        </p>
      </header>

      <TalksBrowser talks={talks} />
    </div>
  )
}
