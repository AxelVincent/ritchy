import { useListContentQuery } from '@/api/queries/lists/useListContent'
import { ApiErrorDisplay } from '@/components/common/ApiErrorDisplay'
import { LoadingMessages } from '@/components/common/LoadingMessages'
import { MapDisplay } from '@/components/map-display/MapDisplay'
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

  if (isLoading) return <LoadingMessages />
  if (error) return <ApiErrorDisplay error={error} />
  if (!data || 'error' in data) return null

  return <MapDisplay key={listId} listId={listId} places={data.items} />
}
