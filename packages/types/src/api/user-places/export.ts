import { z } from 'zod'
import { FilterQueryParamsSchema } from './user-places'

// ============================================================================
// Export Request Schema
// ============================================================================

/**
 * Export endpoint uses same filters as GET /user-places
 * plus sorting params. No pagination needed - exports all matching items.
 */
export const ExportUserPlacesQuerySchema = FilterQueryParamsSchema.extend({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type ExportUserPlacesQuery = z.infer<typeof ExportUserPlacesQuerySchema>

// ============================================================================
// Export Response
// ============================================================================

// Response is a CSV file stream, not JSON
// Content-Type: text/csv; charset=utf-8
// Content-Disposition: attachment; filename="places.csv"
