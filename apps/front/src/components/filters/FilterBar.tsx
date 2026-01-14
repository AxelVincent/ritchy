import { useListsQuery } from '@/api/queries/lists/useLists'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { FilterRule, ListFilterOptions } from '@api/shared'
import { Filter, Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AIFilterSearchBar } from './AIFilterSearchBar'
import { FilterPill } from './FilterPill'
import { FilterRuleEditor } from './FilterRuleEditor'
import { FilterRulePopover } from './FilterRulePopover'
import {
  FILTERABLE_PROPERTIES,
  WORKFORCE_RANGE_OPTIONS,
  getFilterableProperty,
} from './filterableProperties'
import { getDefaultOperator } from './operatorLabels'

interface FilterBarProps {
  rules: FilterRule[]
  onRulesChange: (rules: FilterRule[]) => void
  // Filter options for multi-select dropdowns
  filterOptions?: ListFilterOptions
  filterOptionsLoading?: boolean
  // Results count for zero-results indicator
  resultsCount?: number
  // Ref to expose open add filter popover
  onOpenAddFilter?: (callback: () => void) => void
  // Mobile mode - shows collapsed button that opens a sheet
  isMobile?: boolean
  // Loading state - shows spinner when data is being fetched
  isLoading?: boolean
}

/**
 * Main filter bar component with:
 * - Active filter pills
 * - Add filter button with property selector
 * - Filter rule editors in popover
 */
export const FilterBar = ({
  rules,
  onRulesChange,
  filterOptions,
  filterOptionsLoading,
  resultsCount,
  onOpenAddFilter,
  isMobile = false,
  isLoading = false,
}: FilterBarProps) => {
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  // Pending rule being configured in the add filter popover
  const [pendingRule, setPendingRule] = useState<FilterRule | null>(null)

  // Expose the open callback to parent
  useEffect(() => {
    if (onOpenAddFilter) {
      onOpenAddFilter(() => setAddFilterOpen(true))
    }
  }, [onOpenAddFilter])

  // Fetch lists for listIds filter
  const { data: listsData } = useListsQuery()
  const lists = listsData && !('error' in listsData) ? listsData : []

  // Generate unique ID for new rules
  const generateRuleId = () =>
    `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  // Get options for a property
  const getOptionsForProperty = useCallback(
    (propertyId: string): Array<{ value: string; label: string }> => {
      const property = getFilterableProperty(propertyId)
      if (!property) return []

      // Static options
      if (property.options) {
        return property.options
      }

      // Dynamic options from API
      if (property.dynamicOptions) {
        switch (propertyId) {
          case 'listIds':
            return lists.map((list) => ({
              value: list.id,
              label: `${list.emoji || ''} ${list.name}`.trim(),
            }))
          case 'status':
            return (
              filterOptions?.status?.map((s: string) => ({
                value: s,
                label: s.charAt(0) + s.slice(1).toLowerCase(),
              })) ?? []
            )
          case 'primaryType':
            return (
              filterOptions?.primaryType?.map((t: string) => ({
                value: t,
                label: t,
              })) ?? []
            )
          case 'types':
            return (
              filterOptions?.types?.map((t: string) => ({
                value: t,
                label: t,
              })) ?? []
            )
          case 'country':
            return (
              filterOptions?.country?.map((c: string) => ({
                value: c,
                label: c,
              })) ?? []
            )
          case 'locality':
            return (
              filterOptions?.locality?.map((l: string) => ({
                value: l,
                label: l,
              })) ?? []
            )
          case 'workforceRange':
            return [...WORKFORCE_RANGE_OPTIONS]
          case 'source':
            return (
              filterOptions?.source?.map((s: string) => ({
                value: s,
                label: s,
              })) ?? []
            )
          case 'priceLevel':
            return (
              filterOptions?.priceLevel?.map((p: string) => ({
                value: p,
                label: p,
              })) ?? []
            )
          case 'technologies':
            return (
              filterOptions?.technologies?.map((t: string) => ({
                value: t,
                label: t,
              })) ?? []
            )
          default:
            return []
        }
      }

      return []
    },
    [lists, filterOptions],
  )

  // Get value label for display in pills
  const getValueLabel = useCallback(
    (propertyId: string, value: string): string => {
      const options = getOptionsForProperty(propertyId)
      return options.find((o) => o.value === value)?.label ?? value
    },
    [getOptionsForProperty],
  )

  // Start adding a new filter rule (shows editor in popover)
  const handleSelectProperty = (propertyId: string) => {
    const property = getFilterableProperty(propertyId)
    if (!property) return

    const defaultOperator = getDefaultOperator(property.type, propertyId)

    // Create pending rule to edit in the popover
    const newRule: FilterRule = {
      id: generateRuleId(),
      property: propertyId,
      type: property.type,
      operator: defaultOperator as FilterRule['operator'],
      ...(property.type === 'multi_select' ? { values: [] } : {}),
      ...(property.type === 'text' ? { value: '' } : {}),
    } as FilterRule

    setPendingRule(newRule)
  }

  // Apply the pending rule and close popover
  const handleApplyPendingRule = () => {
    if (pendingRule) {
      onRulesChange([...rules, pendingRule])
      setPendingRule(null)
      setAddFilterOpen(false)
    }
  }

  // Cancel pending rule
  const handleCancelPendingRule = () => {
    setPendingRule(null)
  }

  // Update pending rule while editing
  const handleUpdatePendingRule = (updatedRule: FilterRule) => {
    setPendingRule(updatedRule)
  }

  // Handle popover close - apply rule if it has values
  const handleAddFilterOpenChange = (open: boolean) => {
    if (!open && pendingRule) {
      // Auto-apply if the rule has meaningful values
      const hasValues =
        (pendingRule.type === 'multi_select' &&
          pendingRule.values &&
          pendingRule.values.length > 0) ||
        (pendingRule.type === 'text' && pendingRule.value) ||
        (pendingRule.type === 'number' && pendingRule.value !== undefined) ||
        (pendingRule.type === 'date' && pendingRule.value) ||
        pendingRule.type === 'boolean'

      if (hasValues) {
        onRulesChange([...rules, pendingRule])
      }
      setPendingRule(null)
    }
    setAddFilterOpen(open)
  }

  // Update an existing rule
  const handleUpdateRule = (updatedRule: FilterRule) => {
    onRulesChange(rules.map((r) => (r.id === updatedRule.id ? updatedRule : r)))
  }

  // Remove a rule
  const handleRemoveRule = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId))
    if (editingRuleId === ruleId) {
      setEditingRuleId(null)
    }
  }

  // Clear all filters
  const handleClearAll = () => {
    onRulesChange([])
    setEditingRuleId(null)
  }

  // Properties that haven't been used yet (for add filter dropdown)
  const availableProperties = useMemo(
    () =>
      FILTERABLE_PROPERTIES.filter(
        (prop) => !rules.some((r) => r.property === prop.id),
      ),
    [rules],
  )

  // Mobile: Collapsed button that opens a sheet
  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-background/50 overflow-x-auto">
          <Button
            variant={rules.length > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-9 px-3 gap-2 shrink-0"
            onClick={() => setMobileSheetOpen(true)}
          >
            {isLoading ? (
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-label="Loading results"
              />
            ) : (
              <Filter className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {rules.length > 0
                ? `${rules.length} Filter${rules.length > 1 ? 's' : ''}`
                : 'Filter'}
            </span>
          </Button>

          {/* Active filter pills - show up to 2 on mobile bar for quick removal */}
          {rules.slice(0, 2).map((rule) => (
            <FilterPill
              key={rule.id}
              rule={rule}
              onRemove={handleRemoveRule}
              onClick={() => {
                setMobileSheetOpen(true)
                setEditingRuleId(rule.id)
              }}
              getValueLabel={getValueLabel}
            />
          ))}

          {/* Overflow indicator */}
          {rules.length > 2 && (
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="h-7 px-2 text-xs font-medium rounded-full bg-secondary text-secondary-foreground shrink-0"
            >
              +{rules.length - 2}
            </button>
          )}

          {/* Zero results indicator on mobile */}
          {!isLoading && resultsCount === 0 && rules.length > 0 && (
            <span className="text-xs text-destructive ml-auto shrink-0">
              No results
            </span>
          )}
        </div>

        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent
            side="bottom"
            className="h-[80vh] flex flex-col p-0 [&>button:first-child]:hidden"
          >
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/60">
              {/* Drag handle indicator */}
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base">
                  Filters {rules.length > 0 && `(${rules.length})`}
                </SheetTitle>
                {rules.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:text-destructive"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-auto">
              {/* Active filters section */}
              {rules.length > 0 && (
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                    Active filters
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rules.map((rule) => (
                      <FilterRulePopover
                        key={rule.id}
                        rule={rule}
                        isEditing={editingRuleId === rule.id}
                        onEditingChange={(open) =>
                          setEditingRuleId(open ? rule.id : null)
                        }
                        onUpdate={handleUpdateRule}
                        onRemove={handleRemoveRule}
                        options={getOptionsForProperty(rule.property)}
                        isLoading={filterOptionsLoading}
                        getValueLabel={getValueLabel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Add filter section */}
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                  Add filter
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableProperties.map((property) => (
                    <Button
                      key={property.id}
                      variant="outline"
                      size="sm"
                      className="h-10 justify-start text-left"
                      onClick={() => {
                        handleSelectProperty(property.id)
                        setAddFilterOpen(true)
                      }}
                    >
                      {property.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending rule editor - shown as modal overlay */}
            {pendingRule && addFilterOpen && (
              <div className="absolute inset-0 bg-background flex flex-col">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <h3 className="font-medium">
                    {getFilterableProperty(pendingRule.property)?.label}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCancelPendingRule}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <FilterRuleEditor
                    rule={pendingRule}
                    onUpdate={handleUpdatePendingRule}
                    onRemove={handleCancelPendingRule}
                    options={getOptionsForProperty(pendingRule.property)}
                    isLoading={filterOptionsLoading}
                  />
                </div>
                <div className="px-4 py-3 border-t border-border/60 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={handleCancelPendingRule}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-11"
                    onClick={() => {
                      handleApplyPendingRule()
                      setAddFilterOpen(false)
                    }}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: Full filter bar
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60 bg-background/50">
      {/* Filter icon with active indicator and loading spinner */}
      <div className="relative flex items-center gap-1.5">
        {isLoading ? (
          <Loader2
            className="h-4 w-4 animate-spin text-primary"
            aria-label="Loading results"
          />
        ) : (
          <Filter
            className={`h-4 w-4 ${rules.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
            aria-hidden="true"
          />
        )}
        {rules.length > 0 && !isLoading && (
          <span
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center"
            aria-label={`${rules.length} active filter${rules.length > 1 ? 's' : ''}`}
          >
            {rules.length}
          </span>
        )}
      </div>

      {/* Empty state hint */}
      {rules.length === 0 && (
        <span className="text-sm text-muted-foreground">
          Filter by status, location, type...
        </span>
      )}

      {/* Active filter pills - show first 5, then overflow */}
      {rules.slice(0, 5).map((rule) => (
        <FilterRulePopover
          key={rule.id}
          rule={rule}
          isEditing={editingRuleId === rule.id}
          onEditingChange={(open) => setEditingRuleId(open ? rule.id : null)}
          onUpdate={handleUpdateRule}
          onRemove={handleRemoveRule}
          options={getOptionsForProperty(rule.property)}
          isLoading={filterOptionsLoading}
          getValueLabel={getValueLabel}
        />
      ))}

      {/* Overflow indicator for more than 5 filters */}
      {rules.length > 5 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="h-7 px-2 text-xs">
              +{rules.length - 5} more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-col gap-1">
              {rules.slice(5).map((rule) => (
                <FilterRulePopover
                  key={rule.id}
                  rule={rule}
                  isEditing={editingRuleId === rule.id}
                  onEditingChange={(open) =>
                    setEditingRuleId(open ? rule.id : null)
                  }
                  onUpdate={handleUpdateRule}
                  onRemove={handleRemoveRule}
                  options={getOptionsForProperty(rule.property)}
                  isLoading={filterOptionsLoading}
                  getValueLabel={getValueLabel}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Add filter button */}
      <Popover open={addFilterOpen} onOpenChange={handleAddFilterOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add filter
            <kbd className="ml-1.5 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
              /
            </kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={pendingRule ? 'w-auto min-w-[300px] p-3' : 'w-[250px] p-0'}
          align="start"
        >
          {pendingRule ? (
            <div className="flex flex-col gap-3">
              <FilterRuleEditor
                rule={pendingRule}
                onUpdate={handleUpdatePendingRule}
                onRemove={handleCancelPendingRule}
                options={getOptionsForProperty(pendingRule.property)}
                isLoading={filterOptionsLoading}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelPendingRule}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApplyPendingRule}>
                  Apply
                </Button>
              </div>
            </div>
          ) : (
            <Command>
              <CommandInput placeholder="Search properties..." />
              <CommandList>
                <CommandEmpty>No properties found.</CommandEmpty>
                <CommandGroup>
                  {availableProperties.map((property) => (
                    <CommandItem
                      key={property.id}
                      value={property.id}
                      onSelect={() => handleSelectProperty(property.id)}
                    >
                      {property.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      {/* AI Filter button */}
      <AIFilterSearchBar
        existingRules={rules}
        onApplyFilters={onRulesChange}
        filterOptions={filterOptions}
      />

      {/* Clear all button (only show if there are filters) */}
      {rules.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-destructive"
          onClick={handleClearAll}
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          Clear all
          <kbd className="ml-1.5 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
            Esc
          </kbd>
        </Button>
      )}

      {/* Zero results indicator */}
      {resultsCount === 0 && rules.length > 0 && (
        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          <span>No results match your filters</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm"
            onClick={handleClearAll}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
