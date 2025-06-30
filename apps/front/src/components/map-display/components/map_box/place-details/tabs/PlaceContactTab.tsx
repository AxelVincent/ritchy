import { TextWrapper } from '@/components/common/TextWrapper'
import { PrimaryEmailCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { Place } from '@ritchy/types'
import { ChevronDown, ChevronUp, Mail, Store } from 'lucide-react'
import { useState } from 'react'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const [isPrimaryEmailOpen, setIsPrimaryEmailOpen] = useState(true)
  const [isSecondaryEmailsOpen, setIsSecondaryEmailsOpen] = useState(true)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col w-full">
          {/* Contact Information Header */}
          <div className="flex items-center gap-3 mb-4">
            <Store className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper id={place.id} actions={[]}>
              <h2 className="text-lg font-semibold">{place.name}</h2>
            </TextWrapper>
          </div>

          {/* Email Sections - Only show if there are emails */}
          {place.primaryEmail ||
          (place.secondaryEmails && place.secondaryEmails.length > 0) ? (
            <>
              {/* Primary Email */}
              <div className="flex flex-col gap-2 mb-3">
                <Collapsible
                  open={isPrimaryEmailOpen}
                  onOpenChange={setIsPrimaryEmailOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        {place.primaryEmail ? (
                          <>
                            <Mail className="h-5 w-5 text-green-600 shrink-0" />
                            <div className="text-sm text-green-600 font-medium">
                              Primary Email
                            </div>
                          </>
                        ) : (
                          <>
                            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="text-sm text-muted-foreground">
                              Primary Email
                            </div>
                          </>
                        )}
                      </div>
                      {isPrimaryEmailOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-8">
                    {place.primaryEmail ? (
                      <PrimaryEmailCell
                        id={place.id}
                        content={place.primaryEmail}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        No primary email available
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Secondary Emails */}
              <div className="flex flex-col gap-2 mb-3">
                <Collapsible
                  open={isSecondaryEmailsOpen}
                  onOpenChange={setIsSecondaryEmailsOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        {place.secondaryEmails &&
                        place.secondaryEmails.length > 0 ? (
                          <>
                            <Mail className="h-5 w-5 text-green-600 shrink-0" />
                            <div className="text-sm text-green-600 font-medium">
                              Secondary Emails ({place.secondaryEmails.length})
                            </div>
                          </>
                        ) : (
                          <>
                            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="text-sm text-muted-foreground">
                              Secondary Emails
                            </div>
                          </>
                        )}
                      </div>
                      {isSecondaryEmailsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-8">
                    {place.secondaryEmails &&
                    place.secondaryEmails.length > 0 ? (
                      <div className="space-y-2">
                        {place.secondaryEmails.map((email) => (
                          <PrimaryEmailCell
                            key={email}
                            id={place.id}
                            content={email}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        No secondary emails
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
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
