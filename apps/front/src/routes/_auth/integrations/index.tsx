import { useHubspotStatus } from '@/api/queries/integrations/hubspot/oauth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faHubspot } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/_auth/integrations/')({
  component: IntegrationsPage,
})

interface IntegrationCardProps {
  title: string
  description: string
  icon: IconDefinition
  status?: 'connected' | 'disconnected'
  features: string[]
  href: string
  className?: string
}

const statusStyles = {
  connected:
    'border border-green-500 text-green-500 bg-transparent dark:bg-transparent',
  disconnected:
    'border border-gray-500 text-gray-500 bg-transparent dark:bg-transparent',
}

const statusDot = {
  connected: 'bg-green-500',
  disconnected: 'bg-gray-500',
}

const IntegrationCard = ({
  title,
  description,
  icon,
  status,
  features,
  href,
  className,
}: IntegrationCardProps) => {
  return (
    <Card
      className={cn(
        'flex flex-col transition-shadow hover:shadow-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-600 dark:hover:border-blue-500',
        className,
      )}
      tabIndex={0}
      aria-label={`${title} integration card`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted dark:bg-zinc-800">
            <FontAwesomeIcon
              icon={icon}
              className="text-[28px] text-[#1a1a1a] dark:text-white"
            />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {title}
              {status && (
                <span
                  className={cn(
                    'ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    statusStyles[status],
                  )}
                  aria-label={
                    status === 'connected' ? 'Connected' : 'Not Connected'
                  }
                >
                  <span
                    className={cn('h-2 w-2 rounded-full', statusDot[status])}
                  />
                  {status === 'connected' ? 'Connected' : 'Not Connected'}
                </span>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className="w-full"
          aria-label={
            status === 'connected'
              ? 'Configure Integration'
              : 'Connect Integration'
          }
        >
          <Link to={href}>
            {status === 'connected'
              ? 'Configure Integration'
              : 'Connect Integration'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function IntegrationsPage() {
  const { data: hubspotStatus } = useHubspotStatus()

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect and manage your third-party integrations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          title="HubSpot"
          description="Sync your contacts and companies with HubSpot CRM"
          icon={faHubspot}
          status={hubspotStatus ?? 'disconnected'}
          features={[
            'Sync companies between Ritchy and HubSpot',
            'Sync contacts between Ritchy and HubSpot',
            'Custom field mapping',
            'Real-time status updates',
          ]}
          href="/integrations/hubspot"
        />
        {/* Add more integration cards here as they become available */}
      </div>
    </div>
  )
}
