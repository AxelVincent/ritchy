import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  faFacebook,
  faInstagram,
  faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  Building,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { InfoRow, MetaBadge } from './shared'

interface OverviewPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

export const OverviewPanel = ({ response }: OverviewPanelProps) => {
  const { data, meta } = response
  const { website, registry } = data
  const [isCoordinatesOpen, setIsCoordinatesOpen] = useState(false)
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)

  const hasRating = data.rating !== null || data.reviewCount !== null

  return (
    <div className="space-y-4">
      {/* Request Metadata */}
      <MetaBadge
        requestId={meta.requestId}
        processingTimeMs={meta.processingTimeMs}
        creditsUsed={meta.creditsUsed}
        creditsRemaining={meta.creditsRemaining}
      />

      {/* Main Business Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Header: Business Name + Scores */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Business Identity */}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 shrink-0">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {data.name || 'Unknown Business'}
                </h2>
                {data.formattedAddress && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {data.formattedAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Enrichment Score */}
            {data.enrichmentScore !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {data.enrichmentScore}%
                </span>
                <span className="text-xs text-muted-foreground">quality</span>
              </div>
            )}
          </div>

          {/* Short Description */}
          {website?.shortDescription && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                {website.shortDescription}
              </p>
            </>
          )}

          {/* Rating - Inline */}
          {hasRating && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(data.rating ?? 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                {data.rating !== null && (
                  <span className="text-lg font-semibold">{data.rating}</span>
                )}
                {data.reviewCount !== null && (
                  <span className="text-sm text-muted-foreground">
                    ({data.reviewCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            </>
          )}

          {/* Contact Details */}
          <Separator className="my-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow label="Phone" value={data.phone} icon={Phone} />

            {data.websiteUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Website</p>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={data.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 truncate"
                  >
                    {new URL(data.websiteUrl).hostname}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            <InfoRow
              label="Google Place ID"
              value={data.googlePlaceId}
              mono
              className="truncate"
            />
          </div>

          {/* Coordinates - Collapsible */}
          {data.location && (
            <>
              <Separator className="my-4" />
              <Collapsible
                open={isCoordinatesOpen}
                onOpenChange={setIsCoordinatesOpen}
              >
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-full">
                  {isCoordinatesOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <MapPin className="h-3 w-3" />
                  <span>Coordinates</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="flex items-center gap-6 text-sm pl-4">
                    <div>
                      <span className="text-muted-foreground">Lat: </span>
                      <span className="font-mono">{data.location.lat}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lng: </span>
                      <span className="font-mono">{data.location.lng}</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>

      {/* Key Info Cards - Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Website Key Info */}
        {website && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Website</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {website.domain && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {website.domain}
                    </Badge>
                  )}
                  {website.emails && website.emails.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      {website.emails.length} email
                      {website.emails.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Social Links */}
                {website.socials &&
                  (website.socials.linkedin ||
                    website.socials.facebook ||
                    website.socials.instagram) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {website.socials.linkedin && (
                        <a
                          href={website.socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors text-xs"
                        >
                          <FontAwesomeIcon
                            icon={faLinkedin}
                            className="h-3 w-3"
                          />
                          LinkedIn
                        </a>
                      )}
                      {website.socials.facebook && (
                        <a
                          href={website.socials.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors text-xs"
                        >
                          <FontAwesomeIcon
                            icon={faFacebook}
                            className="h-3 w-3"
                          />
                          Facebook
                        </a>
                      )}
                      {website.socials.instagram && (
                        <a
                          href={website.socials.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors text-xs"
                        >
                          <FontAwesomeIcon
                            icon={faInstagram}
                            className="h-3 w-3"
                          />
                          Instagram
                        </a>
                      )}
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registry Key Info */}
        {registry && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Registry</span>
                </div>
                {/* Match Score */}
                {data.companyMatch?.confidenceScore !== null &&
                  data.companyMatch?.confidenceScore !== undefined && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                      <Target className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {data.companyMatch.confidenceScore}% match
                      </span>
                    </div>
                  )}
              </div>
              <div className="space-y-3 text-sm">
                {registry.name && (
                  <p className="font-medium">{registry.name}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {registry.registrationNumber && (
                    <Badge variant="outline" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {registry.registrationNumber}
                    </Badge>
                  )}
                  {registry.vatNumber && (
                    <Badge variant="outline" className="text-xs">
                      VAT: {registry.vatNumber}
                    </Badge>
                  )}
                  {registry.status && (
                    <Badge
                      variant={
                        registry.status === 'active' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {registry.status}
                    </Badge>
                  )}
                  {registry.type && (
                    <Badge variant="outline" className="text-xs">
                      {registry.type}
                    </Badge>
                  )}
                  {registry.officers && registry.officers.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {registry.officers.length} officer
                      {registry.officers.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {registry.workforceRange && (
                    <Badge variant="outline" className="text-xs">
                      {registry.workforceRange}
                    </Badge>
                  )}
                </div>

                {/* Match Reasoning - Collapsible */}
                {data.companyMatch?.reasoning && (
                  <Collapsible
                    open={isReasoningOpen}
                    onOpenChange={setIsReasoningOpen}
                    className="pt-2"
                  >
                    <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      {isReasoningOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span>Why this company was matched</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 text-xs text-muted-foreground pl-4 border-l-2 border-muted">
                      {data.companyMatch.reasoning}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
