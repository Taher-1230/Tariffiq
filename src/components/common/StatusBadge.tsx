import { Badge } from "@/components/ui/badge"

export type Status = "available" | "next" | "planned"

const statusConfig: Record<Status, { label: string; variant: "success" | "secondary" | "outline" }> = {
  available: { label: "Available", variant: "success" },
  next: { label: "Available", variant: "success" },
  planned: { label: "Planned", variant: "outline" },
}

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
