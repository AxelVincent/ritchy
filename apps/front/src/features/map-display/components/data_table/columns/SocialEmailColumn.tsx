import { useEnrichWebsite } from '@/api/queries/enrich/useEnrichWebsite'
import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { SOCIAL_MEDIA_CONFIG, type SocialMediaPlatform } from '@ritchy/types'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, ExternalLink, type LucideIcon, Mail } from 'lucide-react'
import { useState } from 'react'
import { HeaderWrapper } from './utils/HeaderWrapper'

const SocialCard = ({
  platform,
  links,
}: { platform: SocialMediaPlatform; links: string[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = SOCIAL_MEDIA_CONFIG[platform]
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
            <LinkItem
              key={url}
              url={url}
              domain={config.domain}
              icon={IconComponent}
            />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

const LinkItem = ({
  url,
  domain,
  icon: Icon,
}: {
  url: string
  domain: string
  icon: LucideIcon
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      url.startsWith('mailto:') ? url.slice(7) : url,
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayUrl = url.startsWith('mailto:')
    ? url.slice(7)
    : url.replace(`https://${domain}/`, '')

  const href = url.startsWith('mailto:') ? url : url

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <a
          href={href}
          target={url.startsWith('mailto:') ? undefined : '_blank'}
          rel={url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          className="text-sm truncate hover:underline flex items-center gap-1"
        >
          {displayUrl}
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
      <Button
        variant="outline"
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
  accessorKey: 'socialsAndEmails',
  size: 150,
  enableColumnFilter: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Socials & Emails" />
  ),
  cell: ({ row, table }) => {
    const website = row.original.websiteUri
    const enrichQuery = useEnrichWebsite(website)

    if (enrichQuery.isLoading) {
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
        >
          <Button variant="outline" size="sm" disabled className="w-32">
            Loading...
          </Button>
        </TextWrapper>
      )
    }

    if (!enrichQuery.data && !enrichQuery.isError) {
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
        >
          {!website ? (
            <></>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => enrichQuery.refetch()}
                className="w-32"
              >
                Enrich
              </Button>
              {enrichQuery.failureCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => enrichQuery.refetch()}
                  className="w-32"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </TextWrapper>
      )
    }

    if (enrichQuery.isError || 'error' in enrichQuery.data) {
      return (
        <TextWrapper>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-32"
            title={enrichQuery.error?.message || 'Error enriching data'}
          >
            No results
          </Button>
        </TextWrapper>
      )
    }

    if (enrichQuery.data && !('error' in enrichQuery.data)) {
      const { emails, socialLinks } = enrichQuery.data
      const hasContent =
        emails.length > 0 ||
        Object.values(socialLinks).some((urls) => urls.length > 0)

      const totalResults =
        emails.length +
        Object.values(socialLinks).reduce((sum, urls) => sum + urls.length, 0)

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
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasContent}
                className={cn(
                  'w-32',
                  hasContent && 'text-green-600 hover:text-green-700',
                )}
              >
                {hasContent ? `View contacts (${totalResults})` : 'No contacts'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Contact Information - {row.original.displayName}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh]">
                <div className="space-y-6">
                  {emails.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Mail className="h-4 w-4" />
                          </div>
                          <h2 className="font-medium">Emails</h2>
                          <Badge>{emails.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2">
                        {emails.map((email) => (
                          <LinkItem
                            key={email}
                            url={`mailto:${email}`}
                            domain=""
                            icon={Mail}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <h2 className="font-medium">Social Media</h2>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(socialLinks).map(([platform, urls]) => (
                        <SocialCard
                          key={platform}
                          platform={platform as SocialMediaPlatform}
                          links={urls}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TextWrapper>
      )
    }
  },
}
