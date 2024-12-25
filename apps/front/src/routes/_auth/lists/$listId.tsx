import { useCustomListContentQuery } from '@/api/queries/lists/useCustomListContent'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
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

  if (isLoading) return <LoadingSpinner message="Loading list content..." />
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">List Content</h2>
      <ul className="space-y-2">
        {data?.placeIds.map((placeId) => (
          <li key={placeId} className="font-mono text-sm">
            {placeId}
          </li>
        ))}
      </ul>
    </div>
  )
}
