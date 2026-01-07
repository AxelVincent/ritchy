import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { FilterRule, NumberOperator } from '@ritchy/types'
import { format, subMonths, subYears } from 'date-fns'
import { CalendarIcon, ChevronsUpDown, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getFilterableProperty } from './filterableProperties'
import {
  getOperatorLabels,
  getOperatorsForProperty,
  operatorRequiresValue,
} from './operatorLabels'

interface FilterRuleEditorProps {
  rule: FilterRule
  onUpdate: (rule: FilterRule) => void
  onRemove: (ruleId: string) => void
  // For multi-select options
  options?: Array<{ value: string; label: string }>
  isLoading?: boolean
}

/**
 * Editor component for a single filter rule
 * Handles all filter types with appropriate inputs
 */
export const FilterRuleEditor = ({
  rule,
  onUpdate,
  onRemove,
  options = [],
  isLoading,
}: FilterRuleEditorProps) => {
  const property = getFilterableProperty(rule.property)
  const operatorLabels = getOperatorLabels(rule.type)
  const operators = getOperatorsForProperty(rule.type, rule.property)
  const requiresValue = operatorRequiresValue(rule.operator)
  const isSemanticSearch = rule.property === 'semanticQuery'

  // Handle operator change
  const handleOperatorChange = (newOperator: string) => {
    const updatedRule = { ...rule, operator: newOperator } as FilterRule
    onUpdate(updatedRule)
  }

  // Render the value input based on filter type
  const renderValueInput = () => {
    if (!requiresValue) {
      return null
    }

    switch (rule.type) {
      case 'text':
        return isSemanticSearch ? (
          <DebouncedTextValueInput
            value={rule.value ?? ''}
            onChange={(value) => onUpdate({ ...rule, value })}
            placeholder='e.g. "italian restaurant", "yoga studio"...'
            debounceMs={500}
          />
        ) : (
          <TextValueInput
            value={rule.value ?? ''}
            onChange={(value) => onUpdate({ ...rule, value })}
            placeholder="Enter value..."
          />
        )

      case 'number':
        return (
          <NumberValueInput
            value={rule.value}
            valueTo={rule.valueTo}
            operator={rule.operator}
            onChange={(value, valueTo) => onUpdate({ ...rule, value, valueTo })}
          />
        )

      case 'multi_select':
        return (
          <MultiSelectValueInput
            values={rule.values ?? []}
            options={options}
            isLoading={isLoading}
            onChange={(values) => onUpdate({ ...rule, values })}
          />
        )

      case 'date':
        return (
          <DateValueInput
            value={rule.value}
            valueTo={rule.valueTo}
            onChange={(value, valueTo) => onUpdate({ ...rule, value, valueTo })}
          />
        )

      case 'boolean':
        // Boolean doesn't need a value input - operator is the value
        return null

      default:
        return null
    }
  }

  // Hide operator selector when there's only one option
  const showOperatorSelect = operators.length > 1

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Property label (read-only) */}
      <div className="min-w-[100px] text-sm font-medium">
        {property?.label ?? rule.property}
      </div>

      {/* Operator select - only show if multiple operators available */}
      {showOperatorSelect ? (
        <Select value={rule.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op} value={op}>
                {operatorLabels[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">
          {operatorLabels[rule.operator]}
        </span>
      )}

      {/* Value input */}
      <div className="flex-1">{renderValueInput()}</div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(rule.id)}
        aria-label="Remove filter"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================
// VALUE INPUT COMPONENTS
// ============================================

interface TextValueInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const TextValueInput = ({
  value,
  onChange,
  placeholder = 'Enter value...',
}: TextValueInputProps) => (
  <Input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="h-8"
    autoFocus
  />
)

interface DebouncedTextValueInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

const DebouncedTextValueInput = ({
  value,
  onChange,
  placeholder = 'Enter value...',
  debounceMs = 500,
}: DebouncedTextValueInputProps) => {
  const [localValue, setLocalValue] = useState(value)

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce the onChange callback
  useEffect(() => {
    // Don't trigger on initial mount or if values are the same
    if (localValue === value) return

    const timer = setTimeout(() => {
      onChange(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange, value])

  return (
    <Input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className="h-8"
      autoFocus
    />
  )
}

interface NumberValueInputProps {
  value?: number
  valueTo?: number
  operator: NumberOperator
  onChange: (value?: number, valueTo?: number) => void
}

const NumberValueInput = ({
  value,
  valueTo,
  operator,
  onChange,
}: NumberValueInputProps) => {
  const isBetween = operator === 'between'

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const newValue = e.target.value ? Number(e.target.value) : undefined
          onChange(newValue, valueTo)
        }}
        placeholder={isBetween ? 'Min' : 'Value'}
        className="h-8 w-24"
        autoFocus
      />
      {isBetween && (
        <>
          <span className="text-muted-foreground text-sm">and</span>
          <Input
            type="number"
            value={valueTo ?? ''}
            onChange={(e) => {
              const newValueTo = e.target.value
                ? Number(e.target.value)
                : undefined
              onChange(value, newValueTo)
            }}
            placeholder="Max"
            className="h-8 w-24"
          />
        </>
      )}
    </div>
  )
}

interface MultiSelectValueInputProps {
  values: string[]
  options: Array<{ value: string; label: string }>
  isLoading?: boolean
  onChange: (values: string[]) => void
}

const MultiSelectValueInput = ({
  values,
  options,
  isLoading,
  onChange,
}: MultiSelectValueInputProps) => {
  const [open, setOpen] = useState(false)

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  const selectedLabels = values
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className="h-8 w-full justify-between font-normal"
        >
          <span className="truncate">
            {values.length > 0 ? selectedLabels : 'Select values...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>
              {isLoading
                ? 'Loading options...'
                : options.length === 0
                  ? 'No options available for this filter.'
                  : 'No matching options found.'}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Checkbox
                    checked={values.includes(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Quick date range options (value is months to subtract from today)
const QUICK_DATE_RANGES = [
  { value: '0.25', label: '1 week' },
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: '36', label: '3 years' },
  { value: '60', label: '5 years' },
] as const

interface DateValueInputProps {
  value?: string
  valueTo?: string
  onChange: (value?: string, valueTo?: string) => void
}

const DateValueInput = ({ value, valueTo, onChange }: DateValueInputProps) => {
  const [mode, setMode] = useState<'quick' | 'manual'>('quick')
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)

  const parseDate = (dateStr?: string): Date | undefined => {
    if (!dateStr) return undefined
    const date = new Date(dateStr)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  const formatDateValue = (date: Date | undefined): string | undefined => {
    if (!date) return undefined
    return format(date, 'yyyy-MM-dd')
  }

  const handleQuickRangeSelect = (months: string) => {
    const monthsNum = Number.parseFloat(months)
    const today = new Date()
    let fromDate: Date

    if (monthsNum < 1) {
      // For values less than 1 month, treat as weeks (0.25 = 1 week)
      const days = Math.round(monthsNum * 30)
      fromDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
    } else if (monthsNum >= 12) {
      fromDate = subYears(today, monthsNum / 12)
    } else {
      fromDate = subMonths(today, monthsNum)
    }

    onChange(formatDateValue(fromDate), formatDateValue(today))
  }

  // Date filter only supports is_between with quick range or manual mode
  return (
    <div className="flex items-center gap-2">
      {mode === 'quick' ? (
        <>
          <Select onValueChange={handleQuickRangeSelect}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {QUICK_DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setMode('manual')}
          >
            Custom
          </Button>
        </>
      ) : (
        <>
          <Popover open={openFrom} onOpenChange={setOpenFrom}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-8 w-[120px] justify-start text-left font-normal text-xs',
                  !value && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {value ? format(new Date(value), 'MMM d, yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDate(value)}
                onSelect={(date) => {
                  onChange(formatDateValue(date), valueTo)
                  setOpenFrom(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">–</span>
          <Popover open={openTo} onOpenChange={setOpenTo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-8 w-[120px] justify-start text-left font-normal text-xs',
                  !valueTo && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {valueTo ? format(new Date(valueTo), 'MMM d, yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDate(valueTo)}
                onSelect={(date) => {
                  onChange(value, formatDateValue(date))
                  setOpenTo(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setMode('quick')}
          >
            Quick
          </Button>
        </>
      )}
    </div>
  )
}
