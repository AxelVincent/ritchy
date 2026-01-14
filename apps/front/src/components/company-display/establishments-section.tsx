import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { type Address, AddressDisplay } from './address-display'

export interface Establishment {
  id?: string
  number?: string | null
  name?: string | null
  tradeName?: string | null
  acronym?: string | null
  status?: string | null
  fieldsOfActivity?: string | null
  createdAt?: string | null
  dateOfCreation?: string | null
  dateOfCessation?: string | null
  address?: Address | null
  // Support both flat and nested address formats
  addressLine1?: string | null
  addressLine2?: string | null
  postalCode?: string | null
  city?: string | null
  country?: string | null
  countryCode?: string | null
}

interface EstablishmentsSectionProps {
  establishments: Establishment[]
  showCard?: boolean
}

export const EstablishmentsSection = ({
  establishments,
  showCard = true,
}: EstablishmentsSectionProps) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (establishments.length === 0) return null

  const content = (
    <div className="space-y-1.5">
      {establishments.map((est, index) => {
        const isExpanded = expanded.has(index)
        const displayName = est.tradeName || est.name || 'Unknown'
        const key = `est-${est.id || ''}-${est.number || ''}-${est.name || ''}-${index}`

        // Support both nested address object and flat address fields
        const address: Address | null = est.address || {
          addressLine1: est.addressLine1,
          addressLine2: est.addressLine2,
          postalCode: est.postalCode,
          city: est.city,
          country: est.country,
          countryCode: est.countryCode,
        }
        const hasAddress = address && Object.values(address).some(Boolean)

        const creationDate = est.createdAt || est.dateOfCreation
        const hasDetails =
          creationDate ||
          est.fieldsOfActivity ||
          hasAddress ||
          est.dateOfCessation

        return (
          <div key={key} className="rounded-lg bg-muted/50 overflow-hidden">
            <button
              type="button"
              onClick={() => hasDetails && toggleItem(index)}
              className={`w-full flex items-center justify-between p-2.5 text-left ${hasDetails ? 'hover:bg-muted cursor-pointer' : 'cursor-default'} transition-colors`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{displayName}</span>
                {est.acronym && (
                  <Badge variant="outline" className="text-xs">
                    {est.acronym}
                  </Badge>
                )}
                {est.status && (
                  <Badge
                    variant={est.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {est.status}
                  </Badge>
                )}
                {est.number && (
                  <span className="text-xs text-muted-foreground font-mono">
                    #{est.number}
                  </span>
                )}
              </div>
              {hasDetails &&
                (isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ))}
            </button>
            {isExpanded && hasDetails && (
              <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-2">
                  {creationDate && (
                    <p className="text-muted-foreground">
                      Created: {new Date(creationDate).toLocaleDateString()}
                    </p>
                  )}
                  {est.dateOfCessation && (
                    <p className="text-destructive">
                      Ceased:{' '}
                      {new Date(est.dateOfCessation).toLocaleDateString()}
                    </p>
                  )}
                  {est.fieldsOfActivity && (
                    <p className="text-muted-foreground col-span-full">
                      Activity: {est.fieldsOfActivity}
                    </p>
                  )}
                </div>
                {hasAddress && <AddressDisplay address={address} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if (!showCard) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Establishments ({establishments.length})
        </p>
        {content}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Establishments ({establishments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
