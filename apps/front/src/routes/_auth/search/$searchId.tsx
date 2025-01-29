import { useSearchContentQuery } from '@/api/queries/search/useSearchContent'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MapDisplay } from '@/features/map-display/MapDisplay'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search/$searchId')({
  loader: async ({ params }) => {
    return {
      searchId: params.searchId,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { searchId } = Route.useLoaderData()
  const { data, isLoading, error } = useSearchContentQuery(searchId)

  if (isLoading) return <LoadingSpinner message="Loading search content..." />
  if (error) return <div>Error: {error.message}</div>
  if (!data || 'error' in data) return null

  return <MapDisplay isSearch={false} places={data} />
}
