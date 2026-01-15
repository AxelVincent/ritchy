import { CREDIT_COSTS } from '@/components/data-table/enrich/constants'
import type { BadgeProps } from '@/components/ui/badge'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  SearchX,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Extended display status that differentiates between completed with/without results
 */
export type EnrichmentDisplayStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed_with_results'
  | 'completed_no_results'
  | 'failed'

/**
 * Configuration for displaying enrichment status
 */
export interface EnrichmentStatusConfig {
  displayStatus: EnrichmentDisplayStatus
  icon: LucideIcon
  label: string
  badgeVariant: BadgeProps['variant']
  iconClass: string
  description: string
}

const statusConfigs: Record<EnrichmentDisplayStatus, EnrichmentStatusConfig> = {
  idle: {
    displayStatus: 'idle',
    icon: CircleDashed,
    label: 'Not enriched',
    badgeVariant: 'secondary',
    iconClass: 'text-muted-foreground',
    description: 'Contact has not been enriched yet',
  },
  queued: {
    displayStatus: 'queued',
    icon: Clock,
    label: 'Queued',
    badgeVariant: 'outline',
    iconClass: 'text-yellow-500',
    description: 'Waiting to start enrichment',
  },
  processing: {
    displayStatus: 'processing',
    icon: Loader2,
    label: 'Enriching',
    badgeVariant: 'outline',
    iconClass: 'text-blue-500 animate-spin',
    description: 'Searching for contact information',
  },
  completed_with_results: {
    displayStatus: 'completed_with_results',
    icon: CheckCircle2,
    label: 'Enriched',
    badgeVariant: 'emerald',
    iconClass: 'text-emerald-600',
    description: 'Contact information found',
  },
  completed_no_results: {
    displayStatus: 'completed_no_results',
    icon: SearchX,
    label: 'No results',
    badgeVariant: 'amber',
    iconClass: 'text-amber-500',
    description: 'No contact information found',
  },
  failed: {
    displayStatus: 'failed',
    icon: XCircle,
    label: 'Failed',
    badgeVariant: 'destructive',
    iconClass: 'text-red-500',
    description: 'Enrichment failed',
  },
}

/**
 * Resolves the display status from an enrichment status response
 * Differentiates between completed with/without results based on credits used
 */
export const resolveEnrichmentStatus = (
  status: EnrichmentStatusResponse | null | undefined,
): EnrichmentStatusConfig => {
  if (!status) {
    return statusConfigs.idle
  }

  const { status: rawStatus, credits } = status

  // For completed status, check if any data was found based on credits
  if (rawStatus === 'completed') {
    const creditsUsed = credits?.creditsUsed ?? 0
    return creditsUsed > 0
      ? statusConfigs.completed_with_results
      : statusConfigs.completed_no_results
  }

  // Map other statuses directly
  const displayStatus = rawStatus as EnrichmentDisplayStatus
  return statusConfigs[displayStatus] ?? statusConfigs.idle
}

/**
 * Generates a human-readable message from credits breakdown
 */
export const getCreditsBreakdownMessage = (
  breakdown: { linkedin: number; emails: number; phones: number } | undefined,
): string => {
  if (!breakdown) return ''

  const parts: string[] = []

  if (breakdown.linkedin > 0) {
    parts.push('LinkedIn profile')
  }

  if (breakdown.emails > 0) {
    const count = breakdown.emails
    parts.push(`${count} email${count !== 1 ? 's' : ''}`)
  }

  if (breakdown.phones > 0) {
    const count = Math.floor(breakdown.phones / CREDIT_COSTS.phone)
    if (count > 0) {
      parts.push(`${count} phone${count !== 1 ? 's' : ''}`)
    }
  }

  if (parts.length === 0) return 'no additional information'

  if (parts.length === 1) return parts[0]

  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

/**
 * Gets the text color class for a given display status
 */
export const getStatusTextColorClass = (
  displayStatus: EnrichmentDisplayStatus,
): string => {
  switch (displayStatus) {
    case 'completed_with_results':
      return 'text-emerald-600'
    case 'completed_no_results':
      return 'text-amber-600'
    case 'failed':
      return 'text-red-600'
    case 'processing':
    case 'queued':
      return 'text-blue-600'
    default:
      return 'text-muted-foreground'
  }
}
