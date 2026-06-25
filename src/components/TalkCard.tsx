import { Clock, MapPin, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TopicBadge } from "@/components/TopicBadge"
import type { Talk } from "@/types"

interface TalkCardProps {
  talk: Talk
}

function formatSchedule(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TalkCard({ talk }: TalkCardProps) {
  const full = talk.registrationCount >= talk.capacity

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg leading-snug">{talk.title}</CardTitle>
          <TopicBadge topic={talk.topic} />
        </div>
        <CardDescription>by {talk.speaker}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p className="line-clamp-2 text-foreground/80">{talk.description}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {talk.duration} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {talk.location}
          </span>
        </div>

        <p className="text-foreground/70">{formatSchedule(talk.scheduledAt)}</p>
      </CardContent>

      <CardFooter className="justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" />
          {talk.registrationCount} / {talk.capacity} registered
        </span>
        {full && (
          <span className="text-xs font-semibold text-destructive">
            Fully booked
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
