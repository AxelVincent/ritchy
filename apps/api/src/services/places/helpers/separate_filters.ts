import type { FilterCondition } from '@ritchy/types'

// Define the field sets for easy lookup
const PG_FIELDS = new Set([
  'list.id',
  'search.id',
  'status.status',
  'contact_email.email',
  'contact_social.social_media_url',
  'note.note',
])

const REDIS_FIELDS = new Set([
  'name',
  'price',
  'status',
  'created_at',
  'is_active',
])

export interface SeparatedFilters {
  pgFilters: FilterCondition | null
  redisFilters: FilterCondition | null
}

/**
 * Recursively separates a FilterCondition tree into PostgreSQL and Redis filters
 */
export function separateFilters(condition: FilterCondition): SeparatedFilters {
  if ('conditions' in condition) {
    // Handle AND/OR conditions
    const separatedChildren = condition.conditions.map(separateFilters)

    const pgConditions = separatedChildren
      .map((child) => child.pgFilters)
      .filter(Boolean) as FilterCondition[]

    const redisConditions = separatedChildren
      .map((child) => child.redisFilters)
      .filter(Boolean) as FilterCondition[]

    return {
      pgFilters:
        pgConditions.length > 0
          ? {
              operator: condition.operator,
              conditions: pgConditions,
            }
          : null,
      redisFilters:
        redisConditions.length > 0
          ? {
              operator: condition.operator,
              conditions: redisConditions,
            }
          : null,
    }
  }

  // Handle leaf conditions
  const { field } = condition

  if (PG_FIELDS.has(field)) {
    return {
      pgFilters: condition,
      redisFilters: null,
    }
  }

  if (REDIS_FIELDS.has(field)) {
    return {
      pgFilters: null,
      redisFilters: condition,
    }
  }

  throw new Error(`Unknown field: ${field}`)
}
