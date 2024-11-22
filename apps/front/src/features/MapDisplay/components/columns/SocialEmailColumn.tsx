import { useEnrichWebsite } from '@/api/queries/enrich/useEnrichWebsite'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const socialEmailColumn: ColumnDef<SearchResult> = {
  id: 'socialAndEmail',
  header: () => <CellWrapper>Social & Email</CellWrapper>,
  cell: ({ row }) => {
    const website = row.original.websiteUri
    const enrichQuery = useEnrichWebsite(website)

    if (enrichQuery.isLoading) {
      return (
        <CellWrapper>
          <Loader2 className="h-4 w-4 animate-spin" />
        </CellWrapper>
      )
    }

    if (!enrichQuery.data && !enrichQuery.isError) {
      return (
        <CellWrapper>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enrichQuery.refetch()}
              disabled={!website}
            >
              Enrich data
            </Button>
            {enrichQuery.failureCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => enrichQuery.refetch()}
                disabled={!website}
                className="text-destructive"
              >
                Retry ({enrichQuery.failureCount})
              </Button>
            )}
          </div>
        </CellWrapper>
      )
    }

    if (enrichQuery.isError || 'error' in enrichQuery.data) {
      return (
        <CellWrapper>
          <span className="text-destructive">Failed to load</span>
        </CellWrapper>
      )
    }

    const { emails, socialLinks } = enrichQuery.data
    const hasContent =
      emails.length > 0 ||
      Object.values(socialLinks).some((urls) => urls.length > 0)

    return (
      <CellWrapper>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={!hasContent}>
              {hasContent ? 'View Details' : 'No data'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <div className="flex flex-col gap-2">
              {emails.length > 0 && (
                <div className="space-y-1">
                  <span className="font-medium">Emails:</span>
                  {emails.map((email) => (
                    <div key={email}>{email}</div>
                  ))}
                </div>
              )}
              {Object.entries(socialLinks).map(([platform, urls]) => {
                if (urls.length === 0) return null
                return (
                  <div key={platform} className="space-y-1">
                    <span className="font-medium capitalize">{platform}:</span>
                    {urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        {url.replace(
                          `https://${SOCIAL_MEDIA_CONFIG[platform as keyof typeof SOCIAL_MEDIA_CONFIG].domain}/`,
                          ''
                        )}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CellWrapper>
    )
  }
}
