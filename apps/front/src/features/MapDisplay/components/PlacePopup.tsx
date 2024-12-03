import { useState } from 'react'
import type { Place } from '@ritchy/types'
import { Copy } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface CopyTextProps {
  text: string
  className?: string
}

const CopyText = ({ text, className = "" }: CopyTextProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  return (
    <p 
      className={`flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors ${className}`}
      onClick={handleCopy}
      onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
      title={text}
    >
      <span className="truncate flex-1">
        {copied ? <span className="text-green-500">Copied!</span> : text}
      </span>
      <Copy className="h-3 w-3 flex-shrink-0" />
    </p>
  )
}

interface PlacePopupProps {
  place: Place
}

export const PlacePopup = ({ place }: PlacePopupProps) => {
  return (
    <Card className="w-[300px] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{place.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2 space-y-1">
        {place.rating && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span>{place.rating.toFixed(1)}</span>
            {place.userRatingCount && (
              <span className="text-muted-foreground">({place.userRatingCount} reviews)</span>
            )}
          </div>
        )}
        
        {place.shortFormattedAddress && (
          <CopyText 
            text={place.shortFormattedAddress} 
            className="text-sm text-muted-foreground"
          />
        )}

        {place.currentOpeningHours && (
          <Badge className={place.currentOpeningHours.openNow ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
            {place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
          </Badge>
        )}

        <Button
          variant="link"
          className="h-auto p-0"
          asChild
        >
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            View on Google Maps
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
