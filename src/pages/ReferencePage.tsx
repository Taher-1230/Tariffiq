import { Info } from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface HeadingEntry {
  code: string
  label: string
}

const headings: HeadingEntry[] = [
  { code: "0901", label: "Coffee" },
  { code: "0902", label: "Tea" },
  { code: "0903", label: "Maté" },
  { code: "0904–0910", label: "Spices and related products" },
]

export default function ReferencePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="HS Reference"
        description="Explore the classification scope currently supported by TariffIQ."
      />

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="font-medium">Chapter 09</Badge>
            <span className="text-xs text-muted-foreground">
              Harmonized System, Section II
            </span>
          </div>
          <CardTitle className="text-lg">
            Coffee, tea, maté and spices
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          <Separator className="mb-2" />
          <ul className="flex flex-col">
            {headings.map((heading, index) => (
              <li key={heading.code}>
                <div className="flex items-start justify-between gap-4 py-3.5">
                  <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">
                    {heading.code}
                  </span>
                  <span className="flex-1 text-sm text-foreground">
                    {heading.label}
                  </span>
                </div>
                {index < headings.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Classification support is being added progressively.
        </p>
      </div>
    </div>
  )
}
