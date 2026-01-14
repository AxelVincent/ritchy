import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Code } from 'lucide-react'

interface Technology {
  technology: string
  category: string
}

interface TechnologiesGridProps {
  technologies: Technology[]
  showCard?: boolean
}

export const TechnologiesGrid = ({
  technologies,
  showCard = true,
}: TechnologiesGridProps) => {
  if (!technologies || technologies.length === 0) return null

  // Group technologies by category
  const groupedByCategory = technologies.reduce(
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

  if (!showCard) return content

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Code className="h-3.5 w-3.5" />
          Technologies ({technologies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  )
}
