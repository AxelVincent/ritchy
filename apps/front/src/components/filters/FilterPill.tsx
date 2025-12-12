import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { FilterRule } from '@ritchy/types'
import { X } from 'lucide-react'
import { memo } from 'react'
import { getFilterableProperty } from './filterableProperties'
import { getOperatorLabels, operatorRequiresValue } from './operatorLabels'

// Maximum number of values to show in the pill before truncating
const MAX_VISIBLE_VALUES = 2
// Maximum character length for displayed values
const MAX_VALUE_LENGTH = 20

interface FilterPillProps {
  rule: FilterRule
  onRemove: (ruleId: string) => void
  onClick?: (ruleId: string) => void
  // For multi-select, we need labels for the selected values
  getValueLabel?: (propertyId: string, value: string) => string
}

/**
 * Displays a single filter rule as a pill/badge
 * Uses proper accessibility patterns with separate interactive elements
 */
export const FilterPill = memo(
  ({ rule, onRemove, onClick, getValueLabel }: FilterPillProps) => {
    const property = getFilterableProperty(rule.property)
    const operatorLabels = getOperatorLabels(rule.type)
    const operatorLabel = operatorLabels[rule.operator] ?? rule.operator

    // Truncate a string if it exceeds max length
    const truncateValue = (val: string): string => {
      if (val.length <= MAX_VALUE_LENGTH) return val
      return `${val.slice(0, MAX_VALUE_LENGTH - 1)}…`
    }

    // Get all labels for multi-select values
    const getMultiSelectLabels = (): string[] => {
      if (rule.type !== 'multi_select') return []
      const values = rule.values ?? []
      return values.map((v) =>
        getValueLabel ? getValueLabel(rule.property, v) : v,
      )
    }

    // Format the value display based on filter type
    const formatValue = (): { display: string; full: string | null } => {
      if (!operatorRequiresValue(rule.operator)) {
        return { display: '', full: null }
      }

      switch (rule.type) {
        case 'text': {
          const val = rule.value ?? ''
          return {
            display: truncateValue(val),
            full: val.length > MAX_VALUE_LENGTH ? val : null,
          }
        }

        case 'number': {
          if (rule.operator === 'between') {
            return {
              display: `${rule.value ?? ''} – ${rule.valueTo ?? ''}`,
              full: null,
            }
          }
          return { display: String(rule.value ?? ''), full: null }
        }

        case 'multi_select': {
          const labels = getMultiSelectLabels()
          if (labels.length === 0) return { display: '', full: null }

          // Show up to MAX_VISIBLE_VALUES, then "+N more"
          const visibleLabels = labels.slice(0, MAX_VISIBLE_VALUES)
          const remainingCount = labels.length - MAX_VISIBLE_VALUES

          let display = visibleLabels.map(truncateValue).join(', ')
          if (remainingCount > 0) {
            display += ` +${remainingCount}`
          }

          // Full tooltip shows all values if truncated
          const needsTooltip =
            labels.length > MAX_VISIBLE_VALUES ||
            labels.some((l) => l.length > MAX_VALUE_LENGTH)
          const full = needsTooltip ? labels.join(', ') : null

          return { display, full }
        }

        case 'date': {
          if (rule.operator === 'is_between') {
            return {
              display: `${rule.value ?? ''} – ${rule.valueTo ?? ''}`,
              full: null,
            }
          }
          return { display: rule.value ?? '', full: null }
        }

        case 'boolean':
          return { display: '', full: null }

        default:
          return { display: '', full: null }
      }
    }

    const { display: value, full: tooltipValue } = formatValue()
    const propertyLabel = property?.label ?? rule.property
    const filterDescription = value
      ? `${propertyLabel} ${operatorLabel} ${tooltipValue ?? value}`
      : `${propertyLabel} ${operatorLabel}`

    // Value display element (with or without tooltip)
    const valueElement = value ? (
      tooltipValue ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs font-medium max-w-[200px] sm:max-w-[300px] truncate min-w-0">
              {value}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="break-words">{tooltipValue}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-xs font-medium max-w-[200px] sm:max-w-[300px] truncate min-w-0">
          {value}
        </span>
      )
    ) : null

    return (
      <TooltipProvider delayDuration={300}>
        <div className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 py-1 rounded-full bg-secondary text-secondary-foreground overflow-hidden shrink-0">
          {/* Clickable area for editing the filter */}
          <button
            type="button"
            onClick={() => onClick?.(rule.id)}
            className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            aria-label={`Edit filter: ${filterDescription}`}
          >
            <span className="text-xs font-medium truncate min-w-0 whitespace-nowrap">
              {propertyLabel}
            </span>
            <span className="text-xs text-muted-foreground truncate min-w-0 whitespace-nowrap">
              {operatorLabel}
            </span>
            {valueElement}
          </button>

          {/* Separate remove button */}
          <button
            type="button"
            onClick={() => onRemove(rule.id)}
            className="h-4 w-4 p-0 inline-flex items-center justify-center rounded-full hover:bg-destructive/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 flex-shrink-0"
            aria-label={`Remove ${propertyLabel} filter`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </TooltipProvider>
    )
  },
)
