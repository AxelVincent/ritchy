import { useEnrichWebsite } from '@/api/queries/enrich/useEnrichWebsite'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const socialEmailColumn: ColumnDef<SearchResult> = {
  id: 'Social & Email',
  header: () => <CellWrapper>Social & Email</CellWrapper>,
  cell: ({ row }) => {
    const website = row.original.websiteUri
    const enrichQuery = useEnrichWebsite(website)

    if (enrichQuery.isLoading) {
      return (
        <CellWrapper>
          <Button variant="ghost" size="sm" disabled className="w-24">
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
              className="w-24 text-gray-500"
            >
              No website
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => enrichQuery.refetch()}
                className="w-24 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Enrich
              </Button>
              {enrichQuery.failureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => enrichQuery.refetch()}
                  className="w-24 text-destructive hover:bg-destructive/10"
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
            className="w-24 text-gray-500"
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

    return (
      <CellWrapper>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasContent}
              className={`w-24 ${
                hasContent
                  ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  : 'text-gray-500'
              }`}
            >
              {hasContent ? 'Details' : 'No data'}
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
