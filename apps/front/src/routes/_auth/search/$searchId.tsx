import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search/$searchId')({
  component: RouteComponent,
})

function RouteComponent() {
  return 'Hello /_auth/search/$searchId!'
}
