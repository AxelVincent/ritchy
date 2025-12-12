import {
  type LeadsSearchParams,
  useFilterState,
} from '@/components/filters/useFilterState'
import { LeadsView } from '@/components/leads/LeadsView'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

// Search params schema with readable filter params
// Filter format: property.op=operator&property.v=value
// Examples: status.op=is_any_of&status.v=NEW,CONTACTED
const leadsSearchSchema = z
  .object({
    // Scope param for historical searches (not part of saved views)
    searchId: z.string().uuid().optional(),

    // Pagination
    page: z.coerce.number().min(1).optional(),
    pageSize: z.coerce.number().min(1).max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .catchall(z.string()) // Allow dynamic filter params like status.op, status.v, etc.

export const Route = createFileRoute('/_auth/leads')({
  validateSearch: (search): LeadsSearchParams =>
    leadsSearchSchema.parse(search) as LeadsSearchParams,
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Use new filter state hook
  const {
    rules,
    setRules,
    apiFilters,
    pagination,
    sorting,
    searchId,
    setPage,
    setPageSize,
    handleSortingChange,
  } = useFilterState({
    search,
    navigate,
  })

  return (
    <LeadsView
      // New filter system props
      filterRules={rules}
      onFilterRulesChange={setRules}
      searchId={searchId}
      // API-ready filters (includes listIds)
      filters={apiFilters}
      pagination={pagination}
      sorting={sorting}
      // Handlers
      onSortingChange={handleSortingChange}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  )
}
