import { MapDisplay } from '@/features/map-display/MapDisplay'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MapDisplay />
}
