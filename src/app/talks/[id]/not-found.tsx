import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function TalkNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Talk not found</h1>
      <p className="text-muted-foreground">
        We couldn&apos;t find that session. It may have been moved or removed.
      </p>
      <Button asChild>
        <Link href="/talks">Back to all talks</Link>
      </Button>
    </div>
  )
}
