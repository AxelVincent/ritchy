'use client'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import { ChevronDown, ChevronRight, Code } from 'lucide-react'
import { useState } from 'react'
import { RawJsonPanel } from './raw-json-panel'
import { VisualPanel } from './visual-panel'

interface PlaygroundResponseTabsProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

/**
 * Response display with Visual view as default
 * and collapsible JSON section for developers
 */
export const PlaygroundResponseTabs = ({
  response,
}: PlaygroundResponseTabsProps) => {
  const [jsonExpanded, setJsonExpanded] = useState(false)

  return (
    <div className="space-y-4">
      {/* JSON Toggle */}
      <Collapsible open={jsonExpanded} onOpenChange={setJsonExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-muted-foreground"
          >
            {jsonExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Code className="h-3 w-3" />
            {jsonExpanded ? 'Hide JSON' : 'Show JSON'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="rounded-lg border bg-muted/30 max-h-[300px] overflow-auto">
            <RawJsonPanel response={response} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Visual View */}
      <ScrollArea className="h-[500px]">
        <VisualPanel response={response} />
      </ScrollArea>
    </div>
  )
}

// Re-export individual panels for potential standalone use
export { DataPanel } from './data-panel'
export { FinancialsPanel } from './financials-panel'
export { GooglePanel } from './google-panel'
export { OverviewPanel } from './overview-panel'
export { RawJsonPanel } from './raw-json-panel'
export { RegistryPanel } from './registry-panel'
export { VisualPanel } from './visual-panel'
export { WebsitePanel } from './website-panel'
