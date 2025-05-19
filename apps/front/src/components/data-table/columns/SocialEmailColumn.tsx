import { TextWrapper } from '@/components/common/TextWrapper'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SOCIAL_MEDIA_CONFIG, type SocialMediaPlatform } from '@ritchy/types'
import type { EnrichmentWithStatus, SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  Award,
  Building2,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Star,
  Tag,
  Target,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { HeaderWrapper } from './utils/HeaderWrapper'

type TabType = 'overview' | 'contact' | 'business' | 'customers'

export const socialEmailColumn: ColumnDef<SearchResult> = {
  id: 'socialsAndEmails',
  accessorKey: 'enrichment',
  size: 200,
  enableColumnFilter: false,
  enableSorting: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Socials & Emails" />
  ),
  cell: ({ row, table }) => {
    const { setSelectedPlaceId } = useMapStore()
    const enrichment = row.original.enrichment as
      | EnrichmentWithStatus
      | undefined
    const website = row.original.website
    const [activeTab, setActiveTab] = useState<TabType>('overview')
    const [copied, setCopied] = useState<string | null>(null)

    const handleCopy = async (text: string, type: string) => {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }

    if (!website) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                table.options.meta?.setSelectedPlaceId?.(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full pointer-events-none"
          >
            Unavailable
          </Button>
        </TextWrapper>
      )
    }

    if (enrichment?.isLoading) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enriching...
          </Button>
        </TextWrapper>
      )
    }

    if (!enrichment || enrichment.error) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            {enrichment?.error ? 'Error' : 'No data'}
          </Button>
        </TextWrapper>
      )
    }

    const hasContent = Boolean(
      (enrichment.social_networks &&
        Object.values(enrichment.social_networks).some(Boolean)) ||
        enrichment.contact_info?.email ||
        enrichment.contact_info?.phone ||
        enrichment.contact_info?.address ||
        enrichment.business_info?.name ||
        enrichment.business_info?.sector,
    )

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              setSelectedPlaceId(row.original.id)
            },
            label: 'Pin to map',
          },
        ]}
        disableContentTooltip
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasContent}
              className={cn(
                'w-full',
                hasContent && 'text-green-600 hover:text-green-700',
              )}
            >
              {hasContent ? 'View Data' : 'No data'}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{row.original.name}</span>
                {enrichment.last_updated && (
                  <span className="text-sm text-muted-foreground">
                    Updated{' '}
                    {format(new Date(enrichment.last_updated), 'MMM d, yyyy')}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabType)}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium">Contact Info</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2">
                          {enrichment.contact_info?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`mailto:${enrichment.contact_info.email}`}
                                className="hover:underline"
                              >
                                {enrichment.contact_info.email}
                              </a>
                            </div>
                          )}
                          {enrichment.contact_info?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${enrichment.contact_info.phone}`}
                                className="hover:underline"
                              >
                                {enrichment.contact_info.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">Business Info</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2">
                          {enrichment.business_info?.name && (
                            <div className="text-sm font-medium">
                              {enrichment.business_info.name}
                            </div>
                          )}
                          {enrichment.business_info?.sector && (
                            <div className="text-sm text-muted-foreground">
                              {enrichment.business_info.sector}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">Target Market</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {enrichment.target_customers?.b2b_focus && (
                            <Badge variant="secondary">B2B</Badge>
                          )}
                          {enrichment.target_customers?.b2c_focus && (
                            <Badge variant="secondary">B2C</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {enrichment.business_info?.description && (
                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          <span className="font-medium">Description</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <span className="text-sm">
                          {enrichment.business_info.description}
                        </span>
                      </CardContent>
                    </Card>
                  )}

                  {enrichment.social_networks &&
                    Object.values(enrichment.social_networks).some(Boolean) && (
                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            <span className="font-medium">Social Media</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(enrichment.social_networks).map(
                              ([platform, url]) => {
                                if (!url) return null
                                const config =
                                  SOCIAL_MEDIA_CONFIG[
                                    platform as SocialMediaPlatform
                                  ]
                                if (!config) return null

                                return (
                                  <a
                                    key={platform}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm hover:underline"
                                  >
                                    <config.icon className="h-4 w-4" />
                                    <span className="capitalize">
                                      {platform}
                                    </span>
                                  </a>
                                )
                              },
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {enrichment.products_services?.specialties &&
                    enrichment.products_services.specialties.length > 0 && (
                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <span className="font-medium">Key Services</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex flex-wrap gap-2">
                            {enrichment.products_services.specialties.map(
                              (specialty) => (
                                <Badge key={specialty} variant="secondary">
                                  {specialty}
                                </Badge>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {enrichment.contact_info?.email && (
                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span className="font-medium">Email</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  String(enrichment.contact_info?.email),
                                  'email',
                                )
                              }
                            >
                              {copied === 'email' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <a
                            href={`mailto:${enrichment.contact_info.email}`}
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            {enrichment.contact_info.email}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </CardContent>
                      </Card>
                    )}
                    {enrichment.contact_info?.phone && (
                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span className="font-medium">Phone</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  String(enrichment.contact_info?.phone),
                                  'phone',
                                )
                              }
                            >
                              {copied === 'phone' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <a
                            href={`tel:${enrichment.contact_info.phone}`}
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            {enrichment.contact_info.phone}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </CardContent>
                      </Card>
                    )}
                    {enrichment.contact_info?.address && (
                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">Address</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  String(enrichment.contact_info?.address),
                                  'address',
                                )
                              }
                            >
                              {copied === 'address' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <span className="text-sm">
                            {enrichment.contact_info.address}
                          </span>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="business" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Company Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {enrichment.business_info?.name && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">Business Name</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.business_info.name}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.business_info?.sector && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              <span className="font-medium">Sector</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.business_info.sector}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.business_info?.registration_info && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              <span className="font-medium">
                                Registration Info
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.business_info.registration_info}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.business_info?.structure && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">Structure</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.business_info.structure}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.business_info?.founded && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">Founded</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.business_info.founded}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.business_info?.languages &&
                        enrichment.business_info.languages.length > 0 && (
                          <Card>
                            <CardHeader className="p-4">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="font-medium">Languages</span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="flex flex-wrap gap-2">
                                {enrichment.business_info.languages.map(
                                  (lang) => (
                                    <Badge key={lang} variant="secondary">
                                      {lang}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Products & Services
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {enrichment.products_services?.price_range && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              <span className="font-medium">Price Range</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.products_services.price_range}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                      {enrichment.products_services?.service_area && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">Service Area</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <span className="text-sm">
                              {enrichment.products_services.service_area}
                            </span>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="customers" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Target Market
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {enrichment.target_customers?.primary_segments && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">
                                Customer Segments
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-2">
                              {enrichment.target_customers.primary_segments.map(
                                (segment) => (
                                  <Badge key={segment} variant="secondary">
                                    {segment}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span className="font-medium">Business Focus</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex flex-wrap gap-2">
                            {enrichment.target_customers?.b2b_focus && (
                              <Badge variant="secondary">B2B</Badge>
                            )}
                            {enrichment.target_customers?.b2c_focus && (
                              <Badge variant="secondary">B2C</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="col-span-2">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            <span className="font-medium">Key Benefits</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex flex-wrap gap-2">
                            {enrichment.target_customers?.key_benefits?.map(
                              (benefit) => (
                                <Badge key={benefit} variant="secondary">
                                  {benefit}
                                </Badge>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Data automatically extracted from website
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      This data has been automatically extracted from the
                      business website. While we strive for accuracy, some
                      details may be outdated or incorrect. Please verify
                      critical information before use.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
