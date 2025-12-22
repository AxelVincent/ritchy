'use client'

import { CREDIT_COSTS } from '@/components/data-table/enrich/constants'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DownloadIcon,
  Linkedin,
  Mail,
  Phone,
  Plus,
  Sparkles,
  User,
} from 'lucide-react'
import { useState } from 'react'

import { useUserMe } from '@/api/queries/users/useUserMe'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Card, CardContent } from '../ui/card'

export function NavCredits() {
  const { data: me } = useUserMe()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const { open } = useSidebar()

  const creditsPercentage =
    ((me?.credits.credits ?? 0) / (me?.credits.plan ?? 1)) * 100

  const handleAddCredits = () => {
    navigate({ to: '/pricing' })
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const formatRenewalDate = (date: string) => {
    return dayjs(date).format('MMM D, YYYY')
  }

  const getCreditsStatus = () => {
    if (creditsPercentage >= 80) return 'high'
    if (creditsPercentage >= 30) return 'medium'
    return 'low'
  }

  const getStatusColor = () => {
    const status = getCreditsStatus()
    switch (status) {
      case 'high':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <TooltipProvider>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Credits</span>
            {me?.credits && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 font-medium text-xs"
              >
                {me.credits.credits.toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddCredits()
                  }}
                >
                  <Plus size={16} />
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add credits</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={handleToggle}>
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Collapse' : 'Expand'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarGroupLabel>
        {isExpanded && open && (
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="w-full space-y-4">
                {/* Credits Overview */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 justify-between w-full">
                    <div className="flex items-center gap-2 flex-1">
                      <Progress value={creditsPercentage} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${getStatusColor()}`}
                      >
                        {me?.credits.credits.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        / {me?.credits.plan.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Credit Usage Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <DownloadIcon className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs">Lead import</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      1 credit
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs">Company</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      1 credit
                    </span>
                  </div>

                  {/* Contact enrichment - pay per result */}
                  <div className="py-1.5 px-2 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium">Contact</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        per result
                      </span>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Linkedin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            LinkedIn
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {CREDIT_COSTS.linkedin}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Email
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {CREDIT_COSTS.email}/each
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Phone
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {CREDIT_COSTS.phone}/each
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Renewal Date */}
                {me?.nextRenewalDate && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Renews {formatRenewalDate(me.nextRenewalDate)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </SidebarGroup>
    </TooltipProvider>
  )
}
