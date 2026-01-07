import type {
  BooleanOperator,
  DateOperator,
  FilterPropertyType,
  MultiSelectOperator,
  NumberOperator,
  TextOperator,
} from '@ritchy/types'

// Human-readable labels for text operators
// NOTE: Backend currently only supports 'contains' (ILIKE) and 'semantic_match'.
// Other operators are defined in types but not yet implemented server-side.
// Only expose supported operators to avoid UX confusion.
export const TEXT_OPERATOR_LABELS: Partial<Record<TextOperator, string>> = {
  contains: 'contains',
  semantic_match: 'matches',
}

// Full operator labels (for future use when backend supports all operators)
export const TEXT_OPERATOR_LABELS_FULL: Record<TextOperator, string> = {
  is: 'is',
  is_not: 'is not',
  contains: 'contains',
  does_not_contain: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  semantic_match: 'matches',
}

// Human-readable labels for number operators
export const NUMBER_OPERATOR_LABELS: Record<NumberOperator, string> = {
  equals: '=',
  not_equals: '!=',
  greater_than: '>',
  greater_than_or_equal: '>=',
  less_than: '<',
  less_than_or_equal: '<=',
  between: 'between',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

// Human-readable labels for multi-select operators
// NOTE: Backend currently only supports 'is_any_of' (WHERE IN).
// Other operators are defined in types but not yet implemented server-side.
export const MULTI_SELECT_OPERATOR_LABELS: Partial<
  Record<MultiSelectOperator, string>
> = {
  is_any_of: 'is any of',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

// Full operator labels (for future use when backend supports all operators)
export const MULTI_SELECT_OPERATOR_LABELS_FULL: Record<
  MultiSelectOperator,
  string
> = {
  is_any_of: 'is any of',
  is_none_of: 'is none of',
  is_all_of: 'is all of',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

// Human-readable labels for date operators
// NOTE: Only is_between is supported for simplified UX with quick range presets.
export const DATE_OPERATOR_LABELS: Partial<Record<DateOperator, string>> = {
  is_between: 'is between',
}

// Full operator labels (for future use)
export const DATE_OPERATOR_LABELS_FULL: Record<DateOperator, string> = {
  is: 'is',
  is_before: 'is before',
  is_after: 'is after',
  is_on_or_before: 'is on or before',
  is_on_or_after: 'is on or after',
  is_between: 'is between',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

// Human-readable labels for boolean operators
export const BOOLEAN_OPERATOR_LABELS: Record<BooleanOperator, string> = {
  is_true: 'is true',
  is_false: 'is false',
}

// Get operator labels by property type
export const getOperatorLabels = (
  type: FilterPropertyType,
): Record<string, string> => {
  switch (type) {
    case 'text':
      return TEXT_OPERATOR_LABELS
    case 'number':
      return NUMBER_OPERATOR_LABELS
    case 'multi_select':
      return MULTI_SELECT_OPERATOR_LABELS
    case 'date':
      return DATE_OPERATOR_LABELS
    case 'boolean':
      return BOOLEAN_OPERATOR_LABELS
    default:
      return {}
  }
}

// Get available operators for a property type
export const getOperatorsForType = (type: FilterPropertyType): string[] => {
  switch (type) {
    case 'text':
      return Object.keys(TEXT_OPERATOR_LABELS)
    case 'number':
      return Object.keys(NUMBER_OPERATOR_LABELS)
    case 'multi_select':
      return Object.keys(MULTI_SELECT_OPERATOR_LABELS)
    case 'date':
      return Object.keys(DATE_OPERATOR_LABELS)
    case 'boolean':
      return Object.keys(BOOLEAN_OPERATOR_LABELS)
    default:
      return []
  }
}

// Get default operator for a property type
// propertyId is optional and used for special cases like semanticQuery
export const getDefaultOperator = (
  type: FilterPropertyType,
  propertyId?: string,
): string => {
  // Special case: semantic search uses semantic_match operator
  if (propertyId === 'semanticQuery') {
    return 'semantic_match'
  }

  switch (type) {
    case 'text':
      return 'contains'
    case 'number':
      return 'equals'
    case 'multi_select':
      return 'is_any_of'
    case 'date':
      return 'is_between'
    case 'boolean':
      return 'is_true'
    default:
      return 'is'
  }
}

// Get available operators for a property
// Some properties have specific operators (e.g., semanticQuery only uses semantic_match)
export const getOperatorsForProperty = (
  type: FilterPropertyType,
  propertyId?: string,
): string[] => {
  // Special case: semantic search only uses semantic_match
  if (propertyId === 'semanticQuery') {
    return ['semantic_match']
  }

  return getOperatorsForType(type)
}

// Check if an operator requires a value
export const operatorRequiresValue = (operator: string): boolean => {
  return operator !== 'is_empty' && operator !== 'is_not_empty'
}
