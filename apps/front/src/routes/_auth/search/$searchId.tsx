import { Navigate, createFileRoute } from '@tanstack/react-router'

/**
 * Legacy route - redirects to /leads with searchId scope
 *
 * This route is preserved for backward compatibility.
 * Search viewing now happens through /leads with searchId as a scope param.
 * Note: searchId is NOT a filter - it's a navigation context for historical searches.
 */
export const Route = createFileRoute('/_auth/search/$searchId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { searchId } = Route.useParams()

  // Redirect to /leads with the searchId scope
  return <Navigate to="/leads" search={{ searchId }} replace />
}
