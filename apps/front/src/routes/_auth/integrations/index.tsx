import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/integrations/')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect and manage your third-party integrations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Add integration cards here as they become available */}
        <p className="text-muted-foreground col-span-full text-center py-12">
          No integrations available yet. Check back soon!
        </p>
      </div>
    </div>
  )
}
