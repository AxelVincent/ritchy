import { useSearchContentQuery } from '@/api/queries/search/useSearchContent'
import { LoadingMessages } from '@/components/common/LoadingMessages'
import { MapDisplay } from '@/components/map-display/MapDisplay'
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

  if (isLoading) return <LoadingMessages />
  if (error) return <div>Error: {error.message}</div>
  if (!data || 'error' in data) return null

  return <MapDisplay key={searchId} places={data} searchId={searchId} />
}
