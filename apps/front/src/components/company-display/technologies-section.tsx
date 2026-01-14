import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Code } from 'lucide-react'

export interface Technology {
  technology: string
  category: string
}

interface TechnologiesSectionProps {
  technologies: Technology[] | string[]
  showCard?: boolean
}

export const TechnologiesSection = ({
  technologies,
  showCard = true,
}: TechnologiesSectionProps) => {
  if (technologies.length === 0) return null

  // Handle both string[] and Technology[] formats
  const isStringArray =
    technologies.length > 0 && typeof technologies[0] === 'string'

  if (isStringArray) {
    const techStrings = technologies as string[]
    const content = (
      <div className="flex flex-wrap gap-2">
        {techStrings.map((tech) => (
          <Badge key={tech} variant="outline">
            {tech}
          </Badge>
        ))}
      </div>
    )

    if (!showCard) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Technologies ({techStrings.length})
          </p>
          {content}
        </div>
      )
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            Technologies ({techStrings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  // Group technologies by category
  const techObjects = technologies as Technology[]
  const groupedByCategory = techObjects.reduce(
    (acc, tech) => {
      if (!acc[tech.category]) {
        acc[tech.category] = []
      }
      acc[tech.category].push(tech)
      return acc
    },
    {} as Record<string, Technology[]>,
  )

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Object.entries(groupedByCategory).map(([category, techs]) => (
        <div key={category} className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {category}
          </span>
          <div className="flex flex-col gap-1.5">
            {techs.map((tech, index) => (
              <Badge
                key={`${tech.technology}-${tech.category}-${index}`}
                variant="outline"
                className="text-xs py-1 px-2 w-fit"
              >
                {tech.technology}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (!showCard) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Technologies ({techObjects.length})
        </p>
        {content}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="h-4 w-4" />
          Technologies ({techObjects.length})
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
