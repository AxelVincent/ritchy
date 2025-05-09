import { TextWrapper } from '@/components/common/TextWrapper'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { SOCIAL_MEDIA_CONFIG, type SocialMediaPlatform } from '@ritchy/types'
import type { EnrichmentWithStatus, SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  Info,
  Link as LinkIcon,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react'
import { useState } from 'react'
import { HeaderWrapper } from './utils/HeaderWrapper'

enum ContentType {
  TEXT = 'text',
  LINK = 'link',
  EMAIL = 'email',
  PHONE = 'phone',
}

const SocialCard = ({
  platform,
  links,
}: {
  platform: SocialMediaPlatform
  links: string[]
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const normalizedPlatform = String(
    platform,
  ).toLowerCase() as SocialMediaPlatform
  const config = SOCIAL_MEDIA_CONFIG[normalizedPlatform]

  if (!config) {
    console.warn(`Unknown social media platform: ${platform}`)
    return null
  }

  const IconComponent = config.icon

  return (
    <Card className={cn(links.length === 0 && 'opacity-50')}>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-muted">
            <IconComponent className="h-4 w-4" />
          </div>
          <h3 className="font-medium capitalize">{platform}</h3>
          <Badge variant={links.length > 0 ? 'default' : 'secondary'}>
            {links.length}
          </Badge>
          {links.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-2">
          {links.map((url) => (
            <LinkItem key={url} text={url} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

const LinkItem = ({
  text,
  type = ContentType.TEXT,
}: {
  text: string
  type?: ContentType
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getContent = () => {
    switch (type) {
      case ContentType.LINK:
        return (
          <a
            href={text}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate hover:underline flex items-center gap-1"
          >
            {text}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      case ContentType.EMAIL:
        return (
          <a
            href={`mailto:${text}`}
            className="text-sm truncate hover:underline flex items-center gap-1"
          >
            {text}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      case ContentType.PHONE:
        return (
          <a
            href={`tel:${text}`}
            className="text-sm truncate hover:underline flex items-center gap-1"
          >
            {text}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      default:
        return <span className="text-sm text-muted-foreground">{text}</span>
    }
  }

  return (
    <div className="flex items-center justify-between">
      {getContent()}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-8 w-8"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

export const socialEmailColumn: ColumnDef<SearchResult> = {
  id: 'socialsAndEmails',
  accessorKey: 'enrichment',
  size: 200,
  enableColumnFilter: false,
  enableSorting: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Socials & Emails" />
  ),
  cell: ({ row, table }) => {
    const { setSelectedPlaceId } = useMapStore()
    const enrichment = row.original.enrichment as
      | EnrichmentWithStatus
      | undefined
    const website = row.original.website

    if (!website) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                table.options.meta?.setSelectedPlaceId?.(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full pointer-events-none hover:bg-background hover:text-muted-foreground"
          >
            Unavailable
          </Button>
        </TextWrapper>
      )
    }

    if (enrichment?.isLoading) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enriching...
          </Button>
        </TextWrapper>
      )
    }

    if (!enrichment) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          disableContentTooltip
        >
          <div />
        </TextWrapper>
      )
    }

    if (enrichment.error) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            No contacts
          </Button>
        </TextWrapper>
      )
    }

    // Get social links from social_networks
    const socialLinks = enrichment.social_networks

    const hasContent = Boolean(
      (socialLinks && Object.values(socialLinks).some(Boolean)) ||
        enrichment.sector ||
        enrichment.tone ||
        (enrichment.values && enrichment.values.length > 0) ||
        enrichment.description ||
        (enrichment.contact_info &&
          (enrichment.contact_info.address ||
            enrichment.contact_info.phone ||
            enrichment.contact_info.website ||
            enrichment.contact_info.contact_url ||
            enrichment.contact_info.email)),
    )

    const totalResults =
      (socialLinks
        ? Object.values(socialLinks).reduce(
            (sum, url) => sum + (url ? 1 : 0),
            0,
          )
        : 0) + (enrichment.contact_info?.email ? 1 : 0)

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              setSelectedPlaceId(row.original.id)
            },
            label: 'Pin to map',
          },
        ]}
        disableContentTooltip
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasContent}
              className={cn(
                'w-full',
                hasContent && 'text-green-600 hover:text-green-700',
              )}
            >
              {hasContent ? `View (${totalResults})` : 'No contacts'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Enrichment informations - {row.original.name}
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <span>
                  This data has been automatically extracted from the business
                  website. While we strive for accuracy, some details may be
                  outdated or incorrect. Please verify critical information
                  before use.
                </span>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[80vh]">
              <div className="space-y-6">
                {/* Business Information Section */}
                {(enrichment.sector ||
                  enrichment.tone ||
                  enrichment.values ||
                  enrichment.description) && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-muted">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <h2 className="font-medium">Business Information</h2>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {enrichment.sector && (
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Info className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">Sector</h3>
                            <p className="text-sm text-muted-foreground">
                              {enrichment.sector}
                            </p>
                          </div>
                        </div>
                      )}
                      {enrichment.tone && (
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Heart className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">Tone</h3>
                            <p className="text-sm text-muted-foreground">
                              {enrichment.tone}
                            </p>
                          </div>
                        </div>
                      )}
                      {enrichment.values && enrichment.values.length > 0 && (
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Heart className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">Values</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {enrichment.values.map((value) => (
                                <Badge key={value} variant="secondary">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {enrichment.description && (
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Info className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">Description</h3>
                            <LinkItem
                              text={enrichment.description}
                              type={ContentType.TEXT}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Contact Information Section */}
                {enrichment.contact_info &&
                  (enrichment.contact_info.address ||
                    enrichment.contact_info.email ||
                    enrichment.contact_info.phone ||
                    enrichment.contact_info.website ||
                    enrichment.contact_info.contact_url) && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Phone className="h-4 w-4" />
                          </div>
                          <h2 className="font-medium">Contact Information</h2>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {enrichment.contact_info.phone && (
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Phone className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">Phone</h3>
                              <LinkItem
                                text={enrichment.contact_info.phone}
                                type={ContentType.PHONE}
                              />
                            </div>
                          </div>
                        )}
                        {enrichment.contact_info.website && (
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">Website</h3>
                              <LinkItem
                                text={enrichment.contact_info.website}
                                type={ContentType.LINK}
                              />
                            </div>
                          </div>
                        )}
                        {enrichment.contact_info.contact_url && (
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-md bg-muted">
                              <LinkIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">
                                Contact Page
                              </h3>
                              <LinkItem
                                text={enrichment.contact_info.contact_url}
                                type={ContentType.LINK}
                              />
                            </div>
                          </div>
                        )}
                        {enrichment.contact_info.email && (
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">Email</h3>
                              <LinkItem
                                text={enrichment.contact_info.email}
                                type={ContentType.EMAIL}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Existing Social Media Section */}
                <Card>
                  <CardHeader>
                    <h2 className="font-medium">Social Media</h2>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {socialLinks &&
                      Object.entries(socialLinks).map(([platform, url]) => (
                        <SocialCard
                          key={platform}
                          platform={platform as SocialMediaPlatform}
                          links={typeof url === 'string' ? [url] : []}
                        />
                      ))}
                  </CardContent>
                </Card>

                {/* Last Updated Section */}
                {enrichment.last_updated && (
                  <div className="text-sm text-muted-foreground text-right">
                    Last updated:{' '}
                    {new Date(enrichment.last_updated).toLocaleDateString()}
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
