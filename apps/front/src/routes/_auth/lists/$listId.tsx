import { useCustomListContentQuery } from '@/api/queries/lists/useCustomListContent'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MapDisplay } from '@/features/MapDisplay/MapDisplay'
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
  const { data, isLoading, error } = useCustomListContentQuery(listId)

  console.log(data)

  if (isLoading) return <LoadingSpinner message="Loading list content..." />
  if (error) return <div>Error: {error.message}</div>

  return <MapDisplay key={listId} initialData={data} listId={listId} />
}
