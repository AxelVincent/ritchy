import { serializeFiltersToParams } from '@ritchy/types'
import { Navigate, createFileRoute } from '@tanstack/react-router'

/**
 * Legacy route - redirects to /leads with listIds filter
 *
 * This route is preserved for backward compatibility.
 * All list viewing now happens through /leads with the listIds filter.
 */
export const Route = createFileRoute('/_auth/lists/$listId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { listId } = Route.useParams()

  // Create a filter rule for the listId
  const filterRules = [
    {
      id: `rule_${Date.now()}`,
      property: 'listIds',
      type: 'multi_select' as const,
      operator: 'is_any_of' as const,
      values: [listId],
    },
  ]

  // Serialize to individual params (listIds.op, listIds.v)
  const filterParams = serializeFiltersToParams(filterRules)

  // Redirect to /leads with the listIds filter
  return <Navigate to="/leads" search={filterParams} replace />
}
