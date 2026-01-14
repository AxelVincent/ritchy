import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase } from 'lucide-react'

export interface Activity {
  id?: string
  code?: string | null
  name?: string | null
  type?: string | null
  classification?: string | null
}

interface ActivitiesSectionProps {
  activities: Activity[]
  showCard?: boolean
}

export const ActivitiesSection = ({
  activities,
  showCard = true,
}: ActivitiesSectionProps) => {
  if (activities.length === 0) return null

  const content = (
    <div className="flex flex-wrap gap-2">
      {activities.map((activity, index) => (
        <Badge
          key={`activity-${activity.id || ''}-${activity.code || ''}-${activity.name || ''}-${index}`}
          variant="outline"
          className="gap-1.5 font-normal"
        >
          {activity.code && (
            <span className="font-mono text-xs opacity-70">
              {activity.code}
            </span>
          )}
          {activity.code && activity.name && <span className="text-xs">·</span>}
          {activity.name && <span>{activity.name}</span>}
        </Badge>
      ))}
    </div>
  )

  if (!showCard) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Business Activities ({activities.length})
        </p>
        {content}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Business Activities ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
