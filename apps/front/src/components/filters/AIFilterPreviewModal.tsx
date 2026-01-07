import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import type { FilterRule, GeneratedFilter } from '@ritchy/types'
import { Check, ChevronDown, Pencil, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getFilterableProperty } from './filterableProperties'
import {
  getOperatorLabels,
  getOperatorsForProperty,
  operatorRequiresValue,
} from './operatorLabels'

interface AIFilterPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: GeneratedFilter[]
  semanticQuery?: string
  reasoning: string
  onApply: (selectedFilters: FilterRule[], includeSemantic: boolean) => void
}

/**
 * Preview modal for AI-generated filters.
 * Shows generated filters with selection and inline editing.
 * Responsive: Dialog on desktop, Sheet on mobile.
 */
export const AIFilterPreviewModal = ({
  open,
  onOpenChange,
  filters: initialFilters,
  semanticQuery: initialSemanticQuery,
  reasoning,
  onApply,
}: AIFilterPreviewModalProps) => {
  const isMobile = useIsMobile()

  // Track editable filter state
  const [filters, setFilters] = useState<GeneratedFilter[]>(initialFilters)
  const [semanticQuery, setSemanticQuery] = useState(initialSemanticQuery)

  // Track selected filter indices and semantic query
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(initialFilters.map((_, i) => i)),
  )
  const [includeSemanticQuery, setIncludeSemanticQuery] = useState(
    !!initialSemanticQuery,
  )
  const [showReasoning, setShowReasoning] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingSemanticQuery, setEditingSemanticQuery] = useState(false)

  // Reset state when modal opens with new filters
  useEffect(() => {
    if (open) {
      setFilters(initialFilters)
      setSemanticQuery(initialSemanticQuery)
      setSelectedIndices(new Set(initialFilters.map((_, i) => i)))
      setIncludeSemanticQuery(!!initialSemanticQuery)
      setShowReasoning(false)
      setEditingIndex(null)
      setEditingSemanticQuery(false)
    }
  }, [open, initialFilters, initialSemanticQuery])

  const toggleFilter = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleApply = () => {
    const selectedFilters = filters
      .filter((_, i) => selectedIndices.has(i))
      .map((f) => f.rule)
    onApply(selectedFilters, includeSemanticQuery && !!semanticQuery)
  }

  const updateFilterValue = (
    index: number,
    newValue: string | number | string[],
  ) => {
    setFilters((prev) => {
      const updated = [...prev]
      const filter = updated[index]
      if ('value' in filter.rule) {
        updated[index] = {
          ...filter,
          rule: { ...filter.rule, value: newValue } as FilterRule,
        }
      } else if ('values' in filter.rule && Array.isArray(newValue)) {
        updated[index] = {
          ...filter,
          rule: { ...filter.rule, values: newValue } as FilterRule,
        }
      }
      return updated
    })
  }

  const updateFilterOperator = (index: number, newOperator: string) => {
    setFilters((prev) => {
      const updated = [...prev]
      const filter = updated[index]
      updated[index] = {
        ...filter,
        rule: { ...filter.rule, operator: newOperator } as FilterRule,
      }
      return updated
    })
  }

  const formatFilterValue = (filter: GeneratedFilter) => {
    const { rule } = filter
    const operatorLabels = getOperatorLabels(rule.type)
    const operatorLabel = operatorLabels[rule.operator] || rule.operator

    if (rule.type === 'multi_select' && 'values' in rule && rule.values) {
      return `${operatorLabel} ${rule.values.join(', ')}`
    }
    if (rule.type === 'number' && 'value' in rule) {
      if (rule.operator === 'between' && 'valueTo' in rule) {
        return `${operatorLabel} ${rule.value} – ${rule.valueTo}`
      }
      return `${operatorLabel} ${rule.value}`
    }
    if ('value' in rule && rule.value !== undefined) {
      return `${operatorLabel} "${rule.value}"`
    }
    return operatorLabel
  }

  const getEditableValue = (filter: GeneratedFilter): string => {
    const { rule } = filter
    if (rule.type === 'multi_select' && 'values' in rule && rule.values) {
      return rule.values.join(', ')
    }
    if ('value' in rule && rule.value !== undefined) {
      return String(rule.value)
    }
    return ''
  }

  const handleEditChange = (
    index: number,
    inputValue: string,
    filter: GeneratedFilter,
  ) => {
    const { rule } = filter
    if (rule.type === 'multi_select') {
      // Split by comma and trim whitespace
      const values = inputValue
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      updateFilterValue(index, values)
    } else if (rule.type === 'number') {
      const num = Number(inputValue)
      if (!Number.isNaN(num)) {
        updateFilterValue(index, num)
      }
    } else {
      updateFilterValue(index, inputValue)
    }
  }

  const selectedCount =
    selectedIndices.size + (includeSemanticQuery && semanticQuery ? 1 : 0)
  const totalCount = filters.length + (semanticQuery ? 1 : 0)

  // Content shared between Dialog and Sheet
  const content = (
    <div className="space-y-3">
      {/* Filter list */}
      <div className="space-y-2">
        {filters.map((filter, index) => {
          const property = getFilterableProperty(filter.rule.property)
          const isSelected = selectedIndices.has(index)
          const isEditing = editingIndex === index
          const operatorLabels = getOperatorLabels(filter.rule.type)
          const availableOperators = getOperatorsForProperty(
            filter.rule.type,
            filter.rule.property,
          )
          const needsValue = operatorRequiresValue(filter.rule.operator)

          return (
            <div
              key={filter.rule.id}
              className={cn(
                'rounded-lg border transition-all duration-150',
                isSelected
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/60 bg-card',
              )}
            >
              <button
                type="button"
                onClick={() => toggleFilter(index)}
                className="w-full text-left p-3 hover:bg-primary/5 rounded-t-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {property?.label || filter.rule.property}
                      </span>
                    </div>
                    {!isEditing && (
                      <div className="text-sm text-foreground/80 mt-0.5">
                        {formatFilterValue(filter)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingIndex(isEditing ? null : index)
                    }}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      isEditing
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>

              {/* Inline edit field */}
              {isEditing && (
                <div className="px-3 pb-3 pt-1">
                  <div className="flex flex-col gap-2 pl-8">
                    {/* Operator selector */}
                    {availableOperators.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">
                          Condition:
                        </span>
                        <Select
                          value={filter.rule.operator}
                          onValueChange={(value) =>
                            updateFilterOperator(index, value)
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-sm w-auto min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOperators.map((op) => (
                              <SelectItem key={op} value={op}>
                                {operatorLabels[op] || op}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Value input */}
                    {needsValue && (
                      <div className="flex items-center gap-2">
                        <Input
                          value={getEditableValue(filter)}
                          onChange={(e) =>
                            handleEditChange(index, e.target.value, filter)
                          }
                          className="h-8 text-sm"
                          placeholder={
                            filter.rule.type === 'multi_select'
                              ? 'Values (comma-separated)'
                              : 'Value'
                          }
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingIndex(null)
                            }
                            if (e.key === 'Escape') {
                              setEditingIndex(null)
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingIndex(null)
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    )}

                    {/* Done button for operators without value */}
                    {!needsValue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 w-fit"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingIndex(null)
                        }}
                      >
                        Done
                      </Button>
                    )}

                    {filter.rule.type === 'multi_select' && needsValue && (
                      <p className="text-xs text-muted-foreground">
                        Separate multiple values with commas
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Semantic query option */}
        {(semanticQuery || editingSemanticQuery) && (
          <div
            className={cn(
              'rounded-lg border transition-all duration-150',
              includeSemanticQuery
                ? 'border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/20'
                : 'border-border/60 bg-card',
            )}
          >
            <button
              type="button"
              onClick={() => setIncludeSemanticQuery(!includeSemanticQuery)}
              className="w-full text-left p-3 hover:bg-primary/5 rounded-t-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    includeSemanticQuery
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {includeSemanticQuery && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-sm">Website Content</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      AI
                    </span>
                  </div>
                  {!editingSemanticQuery && semanticQuery && (
                    <div className="text-sm text-foreground/80 mt-0.5">
                      "{semanticQuery}"
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingSemanticQuery(!editingSemanticQuery)
                  }}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    editingSemanticQuery
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </button>

            {/* Inline edit for semantic query */}
            {editingSemanticQuery && (
              <div className="px-3 pb-3 pt-1">
                <div className="flex items-center gap-2 pl-8">
                  <Input
                    value={semanticQuery || ''}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Search term for website content"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingSemanticQuery(false)
                      }
                      if (e.key === 'Escape') {
                        setEditingSemanticQuery(false)
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingSemanticQuery(false)
                    }}
                  >
                    Done
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 pl-8">
                  AI searches website content for matching businesses
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible reasoning */}
      {reasoning && (
        <button
          type="button"
          onClick={() => setShowReasoning(!showReasoning)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showReasoning && 'rotate-180',
              )}
            />
            <span>Why these filters?</span>
          </div>
          {showReasoning && (
            <div className="mt-2 p-2.5 rounded-md bg-muted/50 text-muted-foreground leading-relaxed">
              {reasoning}
            </div>
          )}
        </button>
      )}
    </div>
  )

  // Footer buttons
  const footer = (
    <div className="flex items-center justify-between w-full gap-3">
      <span className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} selected
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={selectedCount === 0}>
          Apply Filters
        </Button>
      </div>
    </div>
  )

  // Mobile: Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[85vh] flex flex-col p-0 [&>button:first-child]:hidden rounded-t-xl"
        >
          <SheetHeader className="px-4 pt-3 pb-2">
            {/* Drag handle indicator */}
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-2" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <SheetTitle className="text-base">Generated Filters</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 py-2">{content}</div>

          <SheetFooter className="px-4 py-3 border-t border-border/40">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Generated Filters</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Select and edit filters before applying
              </p>
            </div>
          </div>
        </DialogHeader>

        {content}

        <DialogFooter className="border-t border-border/40 pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/30">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
