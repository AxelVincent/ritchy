import type { FilterCondition } from '@ritchy/types'

function escapeValue(val: string | number | boolean | Date | string[]): string {
  if (typeof val === 'string') return `"${val.replace(/([{}[\]"|])/g, '\\$1')}"`
  if (val === true) return 'true'
  if (val === false) return 'false'
  return `${val}`
}

/**
 * Converts a FilterNode into a RediSearch query string
 */
export function parseRediSearchFilter(filter: FilterCondition): string {
  // If no filter is provided, return '*' to match all documents
  if (!filter) return '*'

  if ('conditions' in filter) {
    // If conditions array is empty, return '*' to match all documents
    if (!filter.conditions.length) return '*'

    const parsed = filter.conditions.map(parseRediSearchFilter)
    const joiner = filter.operator === 'AND' ? ' ' : ' | '
    return parsed.length > 1 ? `(${parsed.join(joiner)})` : parsed[0]
  }

  const { field, operator, value } = filter

  // If no value is provided, return '*' to match all documents
  if (value === undefined || value === null) return '*'

  switch (operator) {
    case 'equals':
      return `@${field}:{${escapeValue(value)}}`
    case 'contains':
      return `@${field}:*${value}*`
    case 'fuzzy':
      // For fuzzy search in RediSearch, we use % for fuzzy matching
      // The %% means it will match with at most 2 character differences
      return `@${field}:%%${value}%%`
    case 'is_not':
      return `-@${field}:{${escapeValue(value)}}`
    case 'greater_than':
      return `@${field}:[(${value} inf]`
    case 'less_than':
      return `@${field}:[-inf (${value}]`
    case 'before':
    case 'after':
      if (
        !(
          value instanceof Date ||
          typeof value === 'string' ||
          typeof value === 'number'
        )
      ) {
        throw new Error('Date operators require string, number, or Date value')
      }
      return operator === 'before'
        ? `@${field}:[-inf (${new Date(value).getTime()}]`
        : `@${field}:[(${new Date(value).getTime()} inf]`
    case 'is':
      return `@${field}:{${value}}`
    case 'in':
      if (!Array.isArray(value)) {
        throw new Error('IN operator requires array value')
      }
      return `@${field}:{${value.map(escapeValue).join('|')}}`
    default:
      return '*'
  }
}
