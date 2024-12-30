import { MapDisplay } from '@/features/MapDisplay/MapDisplay'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MapDisplay />
}
