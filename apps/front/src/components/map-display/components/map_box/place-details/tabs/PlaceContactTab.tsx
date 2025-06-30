import { ContactEmailCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Badge } from '@/components/ui/badge'
import type { Place } from '@ritchy/types'
import { Mail } from 'lucide-react'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col w-full">
          {/* Email Sections - Only show if there are emails */}
          {place.primaryEmail ||
          (place.secondaryEmails && place.secondaryEmails.length > 0) ? (
            <>
              {/* Emails Title */}
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-sm text-muted-foreground font-medium">
                  Emails
                </div>
              </div>

              {/* Primary Email */}
              {place.primaryEmail && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="ml-8">
                    <div className="flex items-center gap-2">
                      <ContactEmailCell
                        id={place.id}
                        content={place.primaryEmail}
                      />
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Secondary Emails */}
              {place.secondaryEmails && place.secondaryEmails.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="ml-8 space-y-2">
                    {place.secondaryEmails.map((email) => (
                      <ContactEmailCell
                        key={email}
                        id={place.id}
                        content={email}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="border-t pt-2" />
            </>
          ) : (
            /* No Contact Information - Only show when no emails exist */
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">
                  No contact emails available
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
