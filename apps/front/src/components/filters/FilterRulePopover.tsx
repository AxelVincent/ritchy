import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { FilterRule } from '@api/shared'
import { FilterPill } from './FilterPill'
import { FilterRuleEditor } from './FilterRuleEditor'

interface FilterRulePopoverProps {
  rule: FilterRule
  isEditing: boolean
  onEditingChange: (open: boolean) => void
  onUpdate: (rule: FilterRule) => void
  onRemove: (ruleId: string) => void
  options: Array<{ value: string; label: string }>
  isLoading?: boolean
  getValueLabel: (propertyId: string, value: string) => string
}

/**
 * Reusable popover component for displaying and editing a filter rule.
 * Combines FilterPill (display) with FilterRuleEditor (edit mode).
 */
export const FilterRulePopover = ({
  rule,
  isEditing,
  onEditingChange,
  onUpdate,
  onRemove,
  options,
  isLoading,
  getValueLabel,
}: FilterRulePopoverProps) => {
  return (
    <Popover open={isEditing} onOpenChange={onEditingChange}>
      <PopoverTrigger asChild>
        <div>
          <FilterPill
            rule={rule}
            onRemove={onRemove}
            onClick={() => onEditingChange(true)}
            getValueLabel={getValueLabel}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[300px] p-3" align="start">
        <FilterRuleEditor
          rule={rule}
          onUpdate={onUpdate}
          onRemove={onRemove}
          options={options}
          isLoading={isLoading}
        />
      </PopoverContent>
    </Popover>
  )
}
