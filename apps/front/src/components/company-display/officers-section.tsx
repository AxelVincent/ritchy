import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { useState } from 'react'
import { type Address, AddressDisplay } from './address-display'

export interface Officer {
  type?: string | null
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  role?: string | null
  appointmentDate?: string | null
  nationality?: string | null
  mention?: string | null
  address?: Address | null
}

interface OfficersSectionProps {
  officers: Officer[]
  showCard?: boolean
}

export const OfficersSection = ({
  officers,
  showCard = true,
}: OfficersSectionProps) => {
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

  if (officers.length === 0) return null

  const content = (
    <div className="space-y-1.5">
      {officers.map((officer, index) => {
        const isExpanded = expanded.has(index)
        const name =
          officer.type === 'legal'
            ? officer.companyName
            : `${officer.firstName || ''} ${officer.lastName || ''}`.trim()
        const key = `officer-${officer.firstName || ''}-${officer.lastName || ''}-${officer.role || ''}-${index}`
        const hasDetails =
          officer.appointmentDate ||
          officer.nationality ||
          officer.mention ||
          officer.address

        return (
          <div key={key} className="rounded-lg bg-muted/50 overflow-hidden">
            <button
              type="button"
              onClick={() => hasDetails && toggleItem(index)}
              className={`w-full flex items-center justify-between p-2.5 text-left ${hasDetails ? 'hover:bg-muted cursor-pointer' : 'cursor-default'} transition-colors`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{name || 'Unknown'}</span>
                {officer.role && (
                  <Badge variant="secondary" className="text-xs">
                    {officer.role}
                  </Badge>
                )}
                {officer.type && (
                  <Badge variant="outline" className="text-xs">
                    {officer.type}
                  </Badge>
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
                  {officer.appointmentDate && (
                    <p className="text-muted-foreground">
                      Appointed:{' '}
                      {new Date(officer.appointmentDate).toLocaleDateString()}
                    </p>
                  )}
                  {officer.nationality && (
                    <p className="text-muted-foreground">
                      Nationality: {officer.nationality}
                    </p>
                  )}
                  {officer.mention && (
                    <p className="text-muted-foreground">
                      Mention: {officer.mention}
                    </p>
                  )}
                </div>
                {officer.address && (
                  <AddressDisplay address={officer.address} />
                )}
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
          Officers ({officers.length})
        </p>
        {content}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Officers ({officers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
