import { Badge } from "@/components/ui/badge"
import type { TalkTopic } from "@/types"

const TOPIC_STYLES: Record<TalkTopic, string> = {
  Frontend: "bg-blue-100 text-blue-800",
  Backend: "bg-green-100 text-green-800",
  DevOps: "bg-orange-100 text-orange-800",
  "AI/ML": "bg-purple-100 text-purple-800",
  Mobile: "bg-pink-100 text-pink-800",
}

export function TopicBadge({ topic }: { topic: TalkTopic }) {
  return (
    <Badge className={`border-transparent ${TOPIC_STYLES[topic]}`}>
      {topic}
    </Badge>
  )
}
