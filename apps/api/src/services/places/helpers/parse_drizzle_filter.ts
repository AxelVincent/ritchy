import type { FilterCondition } from '@ritchy/types'
import { type SQL, and, eq, gt, ilike, inArray, lt, or, sql } from 'drizzle-orm'
import {
  contactEmail,
  contactSocial,
  list,
  note,
  search,
  status
} from '../../../db/schema'

const FIELD_MAP = {
  'list.id': list.id,
  'search.id': search.id,
  'status.status': status.status,
  'contact_email.email': contactEmail.email,
  'contact_social.social_media_url': contactSocial.profileUrl,
  'note.note': note.note
} as const

export function parseDrizzleFilter(filter: FilterCondition): SQL<unknown> {
  if ('conditions' in filter) {
    const op = filter.operator === 'AND' ? and : or
    const result = op(...filter.conditions.map(parseDrizzleFilter))
    return result || sql`TRUE`
  }

  const { field, operator, value } = filter
  const column = FIELD_MAP[field as keyof typeof FIELD_MAP]

  if (!column) {
    throw new Error(`Unknown field: ${field}`)
  }

  switch (operator) {
    case 'equals':
    case 'is':
      if (field === 'status.status' && value === 'NEW') {
        return sql`(${column} = ${value} OR ${column} IS NULL)`
      }
      return sql`${column} = ${value}`
    case 'is_not':
      return sql`${column} != ${value}`
    case 'greater_than':
      return sql`${column} > ${value}`
    case 'less_than':
      return sql`${column} < ${value}`
    case 'before':
    case 'after': {
      if (
        !(
          value instanceof Date ||
          typeof value === 'string' ||
          typeof value === 'number'
        )
      ) {
        throw new Error('Date operators require string, number, or Date value')
      }
      const dateValue = new Date(value)
      return operator === 'before'
        ? sql`${column} < ${dateValue}`
        : sql`${column} > ${dateValue}`
    }
    case 'contains':
    case 'fuzzy':
      if (field === 'status.status') {
        return sql`(${column} ILIKE ${`%${value}%`} OR (${column} IS NULL AND ${sql.raw("'NEW'")} ILIKE ${`%${value}%`}))`
      }
      return sql`${column} ILIKE ${`%${value}%`}`
    case 'in':
      if (
        field === 'status.status' &&
        Array.isArray(value) &&
        value.includes('NEW')
      ) {
        return sql`(${column} in ${value} OR ${column} IS NULL)`
      }
      return sql`${column} in ${value}`
    default:
      throw new Error(`Unsupported operator: ${operator}`)
  }
}
