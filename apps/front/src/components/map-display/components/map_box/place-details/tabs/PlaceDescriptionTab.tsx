import type { Place } from '@ritchy/types'
import ReactMarkdown from 'react-markdown'
import { EMPTY_MESSAGE } from '../SelectedPlaceCard'

export const PlaceDescriptionTab = ({ place }: { place: Place }) => {
  return (
    <div className="h-full flex flex-col">
      {place.description ? (
        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none p-2">
          <ReactMarkdown>{place.description}</ReactMarkdown>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Enrichment required for description
              </h3>
              {place.website ? (
                <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This place needs a website URL to be enriched.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
