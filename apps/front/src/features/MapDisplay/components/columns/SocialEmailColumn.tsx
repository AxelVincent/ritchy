import { useEnrichWebsite } from '@/api/queries/enrich/useEnrichWebsite'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { SOCIAL_MEDIA_CONFIG, type SocialMediaPlatform } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, ExternalLink, type LucideIcon, Mail } from 'lucide-react'
import { useState } from 'react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

const SocialCard = ({
  platform,
  links
}: { platform: SocialMediaPlatform; links: string[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = SOCIAL_MEDIA_CONFIG[platform]
  const IconComponent = config.icon

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        'hover:shadow-md transition-shadow',
        links.length === 0 && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-muted">
          <IconComponent className="h-5 w-5" />
        </div>
        <h3 className="font-medium capitalize">{platform}</h3>
        <Badge variant={links.length > 0 ? 'default' : 'secondary'}>
          {links.length}
        </Badge>
        {links.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {links.map((url) => (
            <LinkItem
              key={url}
              url={url}
              domain={config.domain}
              icon={IconComponent}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const LinkItem = ({
  url,
  domain,
  icon: Icon
}: {
  url: string
  domain: string
  icon: LucideIcon
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      url.startsWith('mailto:') ? url.slice(7) : url
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayUrl = url.startsWith('mailto:')
    ? url.slice(7) // Remove mailto: prefix for display
    : url.replace(`https://${domain}/`, '')

  const href = url.startsWith('mailto:') ? url : url

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={cn('h-3 w-3')} />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm truncate hover:underline flex items-center gap-1"
        >
          {displayUrl}
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 ml-2 flex-shrink-0"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

export const socialEmailColumn: ColumnDef<SearchResult> = {
  id: 'socialAndEmail',
  accessorKey: 'socialAndEmail',
  header: () => <CellWrapper>Social & Email</CellWrapper>,
  cell: ({ row }) => {
    const website = row.original.websiteUri
    const enrichQuery = useEnrichWebsite(website)

    if (enrichQuery.isLoading) {
      return (
        <CellWrapper>
          <Button variant="ghost" size="sm" disabled className="w-32">
            Loading...
          </Button>
        </CellWrapper>
      )
    }

    if (!enrichQuery.data && !enrichQuery.isError) {
      return (
        <CellWrapper>
          {!website ? (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="w-32 text-gray-500"
            >
              No website
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => enrichQuery.refetch()}
                className="w-32 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Enrich
              </Button>
              {enrichQuery.failureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => enrichQuery.refetch()}
                  className="w-32 text-destructive hover:bg-destructive/10"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </CellWrapper>
      )
    }

    if (enrichQuery.isError || 'error' in enrichQuery.data) {
      return (
        <CellWrapper>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="w-32 text-gray-500"
            title={enrichQuery.error?.message || 'Error enriching data'}
          >
            No results
          </Button>
        </CellWrapper>
      )
    }

    const { emails, socialLinks } = enrichQuery.data
    const hasContent =
      emails.length > 0 ||
      Object.values(socialLinks).some((urls) => urls.length > 0)

    const totalResults =
      emails.length +
      Object.values(socialLinks).reduce((sum, urls) => sum + urls.length, 0)

    return (
      <CellWrapper>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasContent}
              className={`w-32 ${
                hasContent
                  ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  : 'text-gray-500'
              }`}
            >
              {hasContent ? `View contacts (${totalResults})` : 'No contacts'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <div className="space-y-6">
              {emails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-gray-100">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <h2 className="font-medium">Emails</h2>
                    <Badge>{emails.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {emails.map((email) => (
                      <LinkItem
                        key={email}
                        url={`mailto:${email}`}
                        domain=""
                        icon={Mail}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="font-medium">Social Media</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(socialLinks).map(([platform, urls]) => (
                    <SocialCard
                      key={platform}
                      platform={platform as SocialMediaPlatform}
                      links={urls}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CellWrapper>
    )
  }
}
