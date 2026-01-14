import { Check, X } from 'lucide-react'

interface BooleanFeature {
  key: string
  label: string
  value: boolean | undefined
}

interface BooleanFeatureGridProps {
  features: BooleanFeature[]
  columns?: 2 | 3 | 4
}

const BooleanIndicator = ({
  value,
  label,
}: { value: boolean | undefined; label: string }) => {
  if (value === undefined) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      {value ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  )
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

export const BooleanFeatureGrid = ({
  features,
  columns = 3,
}: BooleanFeatureGridProps) => {
  const filteredFeatures = features.filter((f) => f.value !== undefined)

  if (filteredFeatures.length === 0) return null

  return (
    <div className={`grid ${columnClasses[columns]} gap-3`}>
      {filteredFeatures.map((feature) => (
        <BooleanIndicator
          key={feature.key}
          value={feature.value}
          label={feature.label}
        />
      ))}
    </div>
  )
}

export { BooleanIndicator }
