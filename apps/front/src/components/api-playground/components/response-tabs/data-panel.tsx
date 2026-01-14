'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  Building,
  ChevronDown,
  ChevronRight,
  Globe,
  MapPin,
} from 'lucide-react'
import { useState } from 'react'
import { GooglePanel } from './google-panel'
import { RegistryPanel } from './registry-panel'
import { WebsitePanel } from './website-panel'

interface DataPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

/**
 * Consolidated data panel
 * Combines Website, Registry, and Google data into expandable sections
 */
export const DataPanel = ({ response }: DataPanelProps) => {
  const { data } = response

  const hasWebsite = !!data.website
  const hasRegistry = !!data.registry
  const hasGooglePlace = !!data.googlePlace

  // Default: Website and Registry open, Google collapsed
  const [websiteOpen, setWebsiteOpen] = useState(hasWebsite)
  const [registryOpen, setRegistryOpen] = useState(hasRegistry)
  const [googleOpen, setGoogleOpen] = useState(false)

  const hasAnyData = hasWebsite || hasRegistry || hasGooglePlace

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No website, registry, or Google Place data was found for this
          business.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Jump Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Jump to:</span>
        {hasWebsite && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-muted"
            onClick={() => {
              setWebsiteOpen(true)
              document.getElementById('data-section-website')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }}
          >
            <Globe className="h-3 w-3 mr-1" />
            Website
          </Badge>
        )}
        {hasRegistry && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-muted"
            onClick={() => {
              setRegistryOpen(true)
              document.getElementById('data-section-registry')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }}
          >
            <Building className="h-3 w-3 mr-1" />
            Registry
          </Badge>
        )}
        {hasGooglePlace && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-muted"
            onClick={() => {
              setGoogleOpen(true)
              document.getElementById('data-section-google')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }}
          >
            <MapPin className="h-3 w-3 mr-1" />
            Google
          </Badge>
        )}
      </div>

      {/* Website Section */}
      {hasWebsite && (
        <DataSection
          id="data-section-website"
          title="Website Data"
          description="Data extracted from the company website"
          icon={Globe}
          iconColor="text-blue-500"
          isOpen={websiteOpen}
          onOpenChange={setWebsiteOpen}
          badge={
            data.website?.emails?.length
              ? `${data.website.emails.length} emails`
              : undefined
          }
        >
          <WebsitePanel response={response} />
        </DataSection>
      )}

      {/* Registry Section */}
      {hasRegistry && (
        <DataSection
          id="data-section-registry"
          title="Registry Data"
          description="Official data from government business registries"
          icon={Building}
          iconColor="text-amber-500"
          isOpen={registryOpen}
          onOpenChange={setRegistryOpen}
          badge={data.registry?.status}
        >
          <RegistryPanel response={response} />
        </DataSection>
      )}

      {/* Google Section */}
      {hasGooglePlace && (
        <DataSection
          id="data-section-google"
          title="Google Place Data"
          description="Full Google Maps Place API data"
          icon={MapPin}
          iconColor="text-red-500"
          isOpen={googleOpen}
          onOpenChange={setGoogleOpen}
          badge={
            data.rating && data.reviewCount != null
              ? `${data.rating} ★ (${data.reviewCount} reviews)`
              : data.rating
                ? `${data.rating} ★`
                : undefined
          }
        >
          <GooglePanel response={response} />
        </DataSection>
      )}
    </div>
  )
}

interface DataSectionProps {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  badge?: string
  children: React.ReactNode
}

/**
 * Collapsible section within the data panel
 */
const DataSection = ({
  id,
  title,
  description,
  icon: Icon,
  iconColor,
  isOpen,
  onOpenChange,
  badge,
  children,
}: DataSectionProps) => {
  return (
    <Card id={id} className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-3 px-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-lg bg-muted ${iconColor}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {title}
                    {badge && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {badge}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className="pt-4">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
