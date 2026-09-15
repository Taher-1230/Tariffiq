// ============================================================
// ClassifyPage — Phase 1
// Replaces the Phase 0 placeholder with ClassificationWizard.
// The outer shell (PageHeader, scope badge) is preserved.
// ============================================================

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { ClassificationWizard } from "@/components/classifier/ClassificationWizard"

export default function ClassifyPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Page header ── */}
      <PageHeader
        title="Classify a Product"
        description="Provide product details or describe your product in plain text to identify the applicable HS classification."
        badge={
          <Badge variant="outline" className="w-fit text-muted-foreground">
            HS Chapter 09 · Coffee (0901) & Tea (0902)
          </Badge>
        }
      />

      {/* ── Classification wizard ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <ClassificationWizard />
        </CardContent>
      </Card>
    </div>
  )
}
