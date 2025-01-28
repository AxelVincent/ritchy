import { useListContentQuery } from '@/api/queries/lists/useListContent'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MapDisplay } from '@/features/map-display/MapDisplay'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/lists/$listId')({
  loader: async ({ params }) => {
    return {
      listId: params.listId,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { listId } = Route.useLoaderData()
  const { data, isLoading, error } = useListContentQuery(listId)

  if (isLoading) return <LoadingSpinner message="Loading list content..." />
  if (error) return <div>Error: {error.message}</div>
  if (!data || 'error' in data) return null

  return <MapDisplay key={listId} listId={listId} places={data.items} />
}
