'use client'

import {
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Plus,
  Search,
} from 'lucide-react'
import { useState } from 'react'

import { useUserMe } from '@/api/queries/users/useUserMe'
import { Progress } from '@/components/ui/progress'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { MagicWandIcon } from '@radix-ui/react-icons'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Card } from '../ui/card'

export function NavCredits() {
  const { data: me } = useUserMe()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  const searchResultsPercentage =
    ((me?.credits.search.credits ?? 0) / (me?.credits.search.plan ?? 0)) * 100
  const enrichmentPercentage =
    ((me?.credits.enrichment.credits ?? 0) /
      (me?.credits.enrichment.plan ?? 0)) *
    100

  const handleAddCredits = () => {
    navigate({ to: '/pricing' })
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const formatRenewalDate = (date: string) => {
    return dayjs(date).format('MMM D, YYYY')
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>Credits</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <SidebarMenuButton
            tooltip="Add credits"
            onClick={(e) => {
              e.stopPropagation()
              handleAddCredits()
            }}
          >
            <Plus size={16} />
          </SidebarMenuButton>
          <SidebarMenuButton
            tooltip={isExpanded ? 'Collapse' : 'Expand'}
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </SidebarMenuButton>
        </div>
      </SidebarGroupLabel>
      {isExpanded && (
        <Card className="p-4">
          <div className="w-full space-y-3">
            {/* Search Result Credits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Search Result</span>
                </div>
                <span className="font-medium">
                  {me?.credits.search.credits.toLocaleString()}/
                  {me?.credits.search.plan.toLocaleString()}
                </span>
              </div>
              <Progress value={searchResultsPercentage} className="h-1.5" />
            </div>

            {/* Enrichment Credits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <MagicWandIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Enrichment</span>
                </div>
                <span className="font-medium">
                  {me?.credits.enrichment.credits.toLocaleString()}/
                  {me?.credits.enrichment.plan.toLocaleString()}
                </span>
              </div>
              <Progress value={enrichmentPercentage} className="h-1.5" />
            </div>

            {/* Renewal Date */}
            {me?.nextRenewalDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <Calendar className="h-3 w-3" />
                <span>Renews {formatRenewalDate(me.nextRenewalDate)}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </SidebarGroup>
  )
}
