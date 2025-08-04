import type { Place } from '@ritchy/types'
import ReactMarkdown from 'react-markdown'

export const PlaceDescriptionTab = ({ place }: { place: Place }) => {
  return (
    <div className="h-full flex flex-col">
      {place.description && (
        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none p-2">
          <ReactMarkdown>{place.description}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
