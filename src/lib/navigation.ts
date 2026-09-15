import { ScanSearch, History, BookMarked } from "lucide-react"

import type { NavItem } from "@/types/navigation"

export const navItems: NavItem[] = [
  {
    label: "Classify",
    href: "/",
    icon: ScanSearch,
    description: "Start or continue a product classification",
  },
  {
    label: "History",
    href: "/history",
    icon: History,
    description: "Review past classifications",
  },
  {
    label: "Reference",
    href: "/reference",
    icon: BookMarked,
    description: "Browse the supported HS chapter",
  },
]
