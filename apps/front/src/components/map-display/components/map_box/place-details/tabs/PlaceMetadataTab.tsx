import type { Place } from '@ritchy/types'

import { CompanyMetadataContent } from '@/components/common/CompanyMetadataContent'

export const PlaceMetadataTab = ({ place }: { place: Place }) => {
  const enrichment = place.enrichment

  if (!enrichment) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No enrichment data available
      </div>
    )
  }

  return <CompanyMetadataContent enrichment={enrichment} />
}
