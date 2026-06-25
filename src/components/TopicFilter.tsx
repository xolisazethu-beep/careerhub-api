"use client"

import { Button } from "@/components/ui/button"
import type { TalkTopic } from "@/types"

export type TopicFilterValue = TalkTopic | "All"

const TOPICS: TopicFilterValue[] = [
  "All",
  "Frontend",
  "Backend",
  "DevOps",
  "AI/ML",
  "Mobile",
]

interface TopicFilterProps {
  active: TopicFilterValue
  onChange: (value: TopicFilterValue) => void
}

export function TopicFilter({ active, onChange }: TopicFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map((topic) => (
        <Button
          key={topic}
          size="sm"
          variant={active === topic ? "default" : "outline"}
          onClick={() => onChange(topic)}
        >
          {topic}
        </Button>
      ))}
    </div>
  )
}
