import { z } from 'zod'

// Re-export AI filter types
export * from './ai-filter'

// ============================================
// OPERATOR DEFINITIONS
// ============================================

// Text operators
export const TextOperatorSchema = z.enum([
  'is',
  'is_not',
  'contains',
  'does_not_contain',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
  'semantic_match', // Semantic search operator for RAG-based content matching
])

// Number operators
export const NumberOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'between',
  'is_empty',
  'is_not_empty',
])

// Multi-select operators
export const MultiSelectOperatorSchema = z.enum([
  'is_any_of',
  'is_none_of',
  'is_all_of',
  'is_empty',
  'is_not_empty',
])

// Date operators
export const DateOperatorSchema = z.enum([
  'is',
  'is_before',
  'is_after',
  'is_on_or_before',
  'is_on_or_after',
  'is_between',
  'is_empty',
  'is_not_empty',
])

// Boolean operators
export const BooleanOperatorSchema = z.enum(['is_true', 'is_false'])

export type TextOperator = z.infer<typeof TextOperatorSchema>
export type NumberOperator = z.infer<typeof NumberOperatorSchema>
export type MultiSelectOperator = z.infer<typeof MultiSelectOperatorSchema>
export type DateOperator = z.infer<typeof DateOperatorSchema>
export type BooleanOperator = z.infer<typeof BooleanOperatorSchema>

// ============================================
// FILTER PROPERTY TYPES
// ============================================

export const FilterPropertyTypeSchema = z.enum([
  'text',
  'number',
  'multi_select',
  'date',
  'boolean',
])

export type FilterPropertyType = z.infer<typeof FilterPropertyTypeSchema>

// ============================================
// FILTER RULE DEFINITIONS
// ============================================

// Base filter rule structure
const BaseFilterRuleSchema = z.object({
  id: z.string(),
  property: z.string(),
})

// Text filter rule
export const TextFilterRuleSchema = BaseFilterRuleSchema.extend({
  type: z.literal('text'),
  operator: TextOperatorSchema,
  value: z.string().optional(), // Optional for is_empty/is_not_empty
})

// Number filter rule
export const NumberFilterRuleSchema = BaseFilterRuleSchema.extend({
  type: z.literal('number'),
  operator: NumberOperatorSchema,
  value: z.number().optional(),
  valueTo: z.number().optional(), // For between operator
})

// Multi-select filter rule
export const MultiSelectFilterRuleSchema = BaseFilterRuleSchema.extend({
  type: z.literal('multi_select'),
  operator: MultiSelectOperatorSchema,
  values: z.array(z.string()).optional(), // Optional for is_empty/is_not_empty
})

// Date filter rule
export const DateFilterRuleSchema = BaseFilterRuleSchema.extend({
  type: z.literal('date'),
  operator: DateOperatorSchema,
  value: z.string().optional(), // ISO date string
  valueTo: z.string().optional(), // For is_between operator
})

// Boolean filter rule
export const BooleanFilterRuleSchema = BaseFilterRuleSchema.extend({
  type: z.literal('boolean'),
  operator: BooleanOperatorSchema,
})

// Union of all filter rule types
export const FilterRuleSchema = z.discriminatedUnion('type', [
  TextFilterRuleSchema,
  NumberFilterRuleSchema,
  MultiSelectFilterRuleSchema,
  DateFilterRuleSchema,
  BooleanFilterRuleSchema,
])

export type TextFilterRule = z.infer<typeof TextFilterRuleSchema>
export type NumberFilterRule = z.infer<typeof NumberFilterRuleSchema>
export type MultiSelectFilterRule = z.infer<typeof MultiSelectFilterRuleSchema>
export type DateFilterRule = z.infer<typeof DateFilterRuleSchema>
export type BooleanFilterRule = z.infer<typeof BooleanFilterRuleSchema>
export type FilterRule = z.infer<typeof FilterRuleSchema>

// ============================================
// FILTER GROUP (AND/OR Logic) - Phase 3
// ============================================

export const FilterLogicSchema = z.enum(['and', 'or'])
export type FilterLogic = z.infer<typeof FilterLogicSchema>

// Recursive filter group type for AND/OR logic
export interface FilterGroup {
  id: string
  logic: FilterLogic
  rules: Array<FilterRule | FilterGroup>
}

export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    id: z.string(),
    logic: FilterLogicSchema,
    rules: z.array(z.union([FilterRuleSchema, FilterGroupSchema])),
  }),
)

// ============================================
// ADVANCED FILTER (Top Level)
// ============================================

// For Phase 1: Simple array of rules with AND logic
export const SimpleFilterSchema = z.object({
  rules: z.array(FilterRuleSchema),
})

// For Phase 3+: Full AND/OR logic support
export const AdvancedFilterSchema = z.object({
  root: FilterGroupSchema,
})

export type SimpleFilter = z.infer<typeof SimpleFilterSchema>
export type AdvancedFilter = z.infer<typeof AdvancedFilterSchema>

// ============================================
// FILTERABLE PROPERTY DEFINITION
// ============================================

export interface FilterableProperty {
  id: string
  label: string
  type: FilterPropertyType
  icon?: string
  // For multi-select, can provide static options or fetch dynamically
  options?: Array<{ value: string; label: string }>
  // If true, options are fetched from API
  dynamicOptions?: boolean
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Filter state for API requests (Phase 1 - simple rules)
export const FilterRequestSchema = z.object({
  rules: z.array(FilterRuleSchema),
})

export type FilterRequest = z.infer<typeof FilterRequestSchema>

// Filter options response (for dynamic multi-select options)
export const FilterOptionsResponseSchema = z.object({
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      count: z.number().optional(),
    }),
  ),
})

export type FilterOptionsResponse = z.infer<typeof FilterOptionsResponseSchema>

// ============================================
// URL SERIALIZATION
// ============================================

/**
 * Serialize filter rules to readable URL search params
 * Format: property.op=operator&property.v=value (comma-separated for arrays)
 * Examples:
 *   - status.op=is_any_of&status.v=NEW,CONTACTED
 *   - rating.op=between&rating.v=3&rating.v2=5
 *   - website.op=is_empty
 *   - name.op=contains&name.v=coffee
 */
export const serializeFiltersToParams = (
  rules: FilterRule[],
): Record<string, string> => {
  const params: Record<string, string> = {}

  for (const rule of rules) {
    const prop = rule.property
    params[`${prop}.op`] = rule.operator

    switch (rule.type) {
      case 'text':
        if (rule.value) {
          params[`${prop}.v`] = rule.value
        }
        break
      case 'number':
        if (rule.value !== undefined) {
          params[`${prop}.v`] = String(rule.value)
        }
        if (rule.valueTo !== undefined) {
          params[`${prop}.v2`] = String(rule.valueTo)
        }
        break
      case 'multi_select':
        if (rule.values && rule.values.length > 0) {
          params[`${prop}.v`] = rule.values.join(',')
        }
        break
      case 'date':
        if (rule.value) {
          params[`${prop}.v`] = rule.value
        }
        if (rule.valueTo) {
          params[`${prop}.v2`] = rule.valueTo
        }
        break
      case 'boolean':
        // Boolean rules don't need a value - operator IS the value (is_true/is_false)
        break
    }
  }

  return params
}

/**
 * Deserialize filter rules from URL search params
 * Reconstructs FilterRule[] from readable params
 */
export const deserializeFiltersFromParams = (
  params: Record<string, string | undefined>,
): FilterRule[] => {
  const rules: FilterRule[] = []

  // Find all unique property names from .op params
  const properties = new Set<string>()
  for (const key of Object.keys(params)) {
    if (key.endsWith('.op')) {
      properties.add(key.slice(0, -3))
    }
  }

  for (const prop of properties) {
    const operator = params[`${prop}.op`]
    if (!operator) continue

    const value = params[`${prop}.v`]
    const valueTo = params[`${prop}.v2`]

    // Generate a stable ID based on property name
    const id = `rule_${prop}`

    // Determine type based on operator
    let rule: FilterRule | null = null

    if (
      [
        'is',
        'is_not',
        'contains',
        'does_not_contain',
        'starts_with',
        'ends_with',
        'is_empty',
        'is_not_empty',
        'semantic_match',
      ].includes(operator) &&
      !['is_any_of', 'is_none_of', 'is_all_of'].includes(operator)
    ) {
      // Could be text - check if it's not a known multi-select or other type
      // For now, check if there's a comma in value (multi-select) or if operator suggests multi-select
      if (['is_any_of', 'is_none_of', 'is_all_of'].includes(operator)) {
        rule = {
          id,
          property: prop,
          type: 'multi_select',
          operator: operator as FilterRule['operator'],
          values: value ? value.split(',') : [],
        } as FilterRule
      } else {
        rule = {
          id,
          property: prop,
          type: 'text',
          operator: operator as FilterRule['operator'],
          value,
        } as FilterRule
      }
    } else if (['is_any_of', 'is_none_of', 'is_all_of'].includes(operator)) {
      rule = {
        id,
        property: prop,
        type: 'multi_select',
        operator: operator as FilterRule['operator'],
        values: value ? value.split(',') : [],
      } as FilterRule
    } else if (
      [
        'equals',
        'not_equals',
        'greater_than',
        'greater_than_or_equal',
        'less_than',
        'less_than_or_equal',
        'between',
      ].includes(operator)
    ) {
      rule = {
        id,
        property: prop,
        type: 'number',
        operator: operator as FilterRule['operator'],
        value: value ? Number(value) : undefined,
        valueTo: valueTo ? Number(valueTo) : undefined,
      } as FilterRule
    } else if (
      [
        'is_before',
        'is_after',
        'is_on_or_before',
        'is_on_or_after',
        'is_between',
      ].includes(operator)
    ) {
      rule = {
        id,
        property: prop,
        type: 'date',
        operator: operator as FilterRule['operator'],
        value,
        valueTo,
      } as FilterRule
    } else if (['is_true', 'is_false'].includes(operator)) {
      rule = {
        id,
        property: prop,
        type: 'boolean',
        operator: operator as FilterRule['operator'],
      } as FilterRule
    }

    if (rule) {
      // Validate the rule
      const result = FilterRuleSchema.safeParse(rule)
      if (result.success) {
        rules.push(result.data)
      }
    }
  }

  return rules
}

// Legacy functions for backward compatibility (deprecated)
/** @deprecated Use serializeFiltersToParams instead */
export const serializeFilters = (rules: FilterRule[]): string => {
  if (rules.length === 0) return ''
  const params = serializeFiltersToParams(rules)
  return new URLSearchParams(params).toString()
}

/** @deprecated Use deserializeFiltersFromParams instead */
export const deserializeFilters = (encoded: string): FilterRule[] => {
  if (!encoded) return []
  try {
    // Try new format first (URL params string)
    const params = Object.fromEntries(new URLSearchParams(encoded))
    if (Object.keys(params).some((k) => k.includes('.op'))) {
      return deserializeFiltersFromParams(params)
    }
    // Fall back to old base64 format
    const decoded = JSON.parse(atob(encoded))
    const result = z.array(FilterRuleSchema).safeParse(decoded)
    return result.success ? result.data : []
  } catch {
    return []
  }
}
