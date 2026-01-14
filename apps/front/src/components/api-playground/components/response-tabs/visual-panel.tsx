'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  Building,
  Globe,
  LayoutDashboard,
  MapPin,
  TrendingUp,
} from 'lucide-react'
import { FinancialsPanel } from './financials-panel'
import { GooglePanel } from './google-panel'
import { OverviewPanel } from './overview-panel'
import { RegistryPanel } from './registry-panel'
import { WebsitePanel } from './website-panel'

interface VisualPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

/**
 * Visual panel with sub-tabs for navigating between data sources
 */
export const VisualPanel = ({ response }: VisualPanelProps) => {
  const { data } = response

  const hasWebsite = !!data.website
  const hasRegistry = !!data.registry
  const hasGoogle = !!data.googlePlace

  // Check if financials have actual displayable data (not just confidential entries with null ratios)
  const hasFinancials = (() => {
    const financials = data.registry?.financials
    if (!Array.isArray(financials) || financials.length === 0) return false

    // Check if any financial entry has actual ratio data or related documents
    return financials.some((financial) => {
      // Has related documents
      if (
        Array.isArray(financial.relatedDocuments) &&
        financial.relatedDocuments.length > 0
      )
        return true

      // Has ratios with actual values
      if (financial.ratios) {
        return Object.values(financial.ratios).some(
          (value) => value !== null && value !== undefined && value !== 0,
        )
      }

      return false
    })
  })()

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
        <TabsTrigger value="overview" className="px-3 py-1.5 text-xs gap-1.5">
          <LayoutDashboard className="h-3 w-3" />
          Overview
        </TabsTrigger>
        {hasWebsite && (
          <TabsTrigger value="website" className="px-3 py-1.5 text-xs gap-1.5">
            <Globe className="h-3 w-3" />
            Website
          </TabsTrigger>
        )}
        {hasRegistry && (
          <TabsTrigger value="registry" className="px-3 py-1.5 text-xs gap-1.5">
            <Building className="h-3 w-3" />
            Registry
          </TabsTrigger>
        )}
        {hasGoogle && (
          <TabsTrigger value="google" className="px-3 py-1.5 text-xs gap-1.5">
            <MapPin className="h-3 w-3" />
            Google
          </TabsTrigger>
        )}
        {hasFinancials && (
          <TabsTrigger
            value="financials"
            className="px-3 py-1.5 text-xs gap-1.5"
          >
            <TrendingUp className="h-3 w-3" />
            Financials
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <OverviewPanel response={response} />
      </TabsContent>

      <TabsContent value="website" className="mt-0">
        <WebsitePanel response={response} />
      </TabsContent>

      <TabsContent value="registry" className="mt-0">
        <RegistryPanel response={response} />
      </TabsContent>

      <TabsContent value="google" className="mt-0">
        <GooglePanel response={response} />
      </TabsContent>

      <TabsContent value="financials" className="mt-0">
        <FinancialsPanel response={response} />
      </TabsContent>
    </Tabs>
  )
}
