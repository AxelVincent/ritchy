import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Award,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Info,
  Link as LinkIcon,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  Star,
  Tag,
  Target,
  Users,
} from 'lucide-react'
import { useState } from 'react'

type TabType = 'overview' | 'contact' | 'business' | 'customers'
type SocialMediaPlatform =
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'youtube'

interface SocialMediaConfig {
  icon: LucideIcon
  label: string
}

const SOCIAL_MEDIA_CONFIG: Record<SocialMediaPlatform, SocialMediaConfig> = {
  facebook: { icon: LinkIcon, label: 'Facebook' },
  twitter: { icon: LinkIcon, label: 'Twitter' },
  instagram: { icon: LinkIcon, label: 'Instagram' },
  linkedin: { icon: LinkIcon, label: 'LinkedIn' },
  youtube: { icon: LinkIcon, label: 'YouTube' },
}

export const CompanyMetadataContent = ({
  enrichment,
}: {
  enrichment: {
    contact_info?: {
      email?: string | null
      phone?: string | null
      website?: string | null
      whatsapp?: string | null
      address?: string | null
      visit_info?: string | null
    }
    business_info?: {
      name?: string | null
      sector?: string | null
      description?: string | null
      registration_info?: string | null
      structure?: string | null
      founded?: string | null
      languages?: string[] | null
    }
    products_services?: {
      price_range?: string | null
      service_area?: string | null
      specialties?: string[] | null
    }
    target_customers?: {
      primary_segments?: string[] | null
      b2b_focus?: boolean | string | null
      b2c_focus?: boolean | string | null
      needs_addressed?: string[] | null
      key_benefits?: string[] | null
    }
    social_networks?: {
      facebook?: string | null
      twitter?: string | null
      instagram?: string | null
      linkedin?: string | null
      youtube?: string | null
      source?: string | null
    }
    last_updated?: string | null
  }
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [copied, setCopied] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState({
    description: true,
    socialMedia: true,
    keyServices: true,
    companyDetails: true,
    productsServices: true,
    targetMarket: true,
  })

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as TabType)}
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span>Contact</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>Business</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Customers</span>
          </TabsTrigger>
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
              <Collapsible
                className="w-full"
                defaultOpen
                onOpenChange={(open: boolean) =>
                  setOpenSections((prev) => ({
                    ...prev,
                    description: open,
                  }))
                }
              >
                <Card>
                  <CardHeader className="p-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Description</span>
                      </div>
                      {openSections.description ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-0">
                      <span className="text-sm">
                        {enrichment.business_info.description}
                      </span>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {enrichment.social_networks &&
              Object.values(enrichment.social_networks).some(Boolean) && (
                <Collapsible
                  className="w-full"
                  defaultOpen
                  onOpenChange={(open: boolean) =>
                    setOpenSections((prev) => ({
                      ...prev,
                      socialMedia: open,
                    }))
                  }
                >
                  <Card>
                    <CardHeader className="p-4">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          <span className="font-medium">Social Media</span>
                        </div>
                        {openSections.socialMedia ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(enrichment.social_networks).map(
                            ([platform, url]) => {
                              if (!url || platform === 'source') return null
                              const config =
                                SOCIAL_MEDIA_CONFIG[
                                  platform as SocialMediaPlatform
                                ]
                              if (!config) return null

                              return (
                                <a
                                  key={platform}
                                  href={url as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm hover:underline"
                                >
                                  <config.icon className="h-4 w-4" />
                                  <span className="capitalize">{platform}</span>
                                </a>
                              )
                            },
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

            {enrichment.products_services?.specialties &&
              enrichment.products_services.specialties.length > 0 && (
                <Collapsible
                  className="w-full"
                  defaultOpen
                  onOpenChange={(open: boolean) =>
                    setOpenSections((prev) => ({
                      ...prev,
                      keyServices: open,
                    }))
                  }
                >
                  <Card>
                    <CardHeader className="p-4">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          <span className="font-medium">Key Services</span>
                        </div>
                        {openSections.keyServices ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {enrichment.products_services.specialties.map(
                            (specialty: string) => (
                              <Badge key={specialty} variant="secondary">
                                {specialty}
                              </Badge>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
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
              {enrichment.contact_info?.website && (
                <Card>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="font-medium">Website</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            String(enrichment.contact_info?.website),
                            'website',
                          )
                        }
                      >
                        {copied === 'website' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <a
                      href={enrichment.contact_info.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      {enrichment.contact_info.website}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}
              {enrichment.contact_info?.whatsapp && (
                <Card>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="font-medium">WhatsApp</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            String(enrichment.contact_info?.whatsapp),
                            'whatsapp',
                          )
                        }
                      >
                        {copied === 'whatsapp' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <a
                      href={`https://wa.me/${enrichment.contact_info.whatsapp.replace(
                        /[^0-9]/g,
                        '',
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      {enrichment.contact_info.whatsapp}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}
              {enrichment.contact_info?.address && (
                <Card className="col-span-2">
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
              {enrichment.contact_info?.visit_info && (
                <Card className="col-span-2">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Opening Hours</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            String(enrichment.contact_info?.visit_info),
                            'visit_info',
                          )
                        }
                      >
                        {copied === 'visit_info' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-sm">
                      {enrichment.contact_info.visit_info}
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <Collapsible
              className="w-full"
              defaultOpen
              onOpenChange={(open: boolean) =>
                setOpenSections((prev) => ({
                  ...prev,
                  companyDetails: open,
                }))
              }
            >
              <div className="space-y-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-between">
                  <span>Company Details</span>
                  {openSections.companyDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                                (lang: string) => (
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
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible
              className="w-full"
              defaultOpen
              onOpenChange={(open: boolean) =>
                setOpenSections((prev) => ({
                  ...prev,
                  productsServices: open,
                }))
              }
            >
              <div className="space-y-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-between">
                  <span>Products & Services</span>
                  {openSections.productsServices ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                    {enrichment.products_services?.specialties &&
                      enrichment.products_services.specialties.length > 0 && (
                        <Card className="col-span-2">
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              <span className="font-medium">Specialties</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-2">
                              {enrichment.products_services.specialties.map(
                                (specialty: string) => (
                                  <Badge key={specialty} variant="secondary">
                                    {specialty}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Collapsible
              className="w-full"
              defaultOpen
              onOpenChange={(open: boolean) =>
                setOpenSections((prev) => ({
                  ...prev,
                  targetMarket: open,
                }))
              }
            >
              <div className="space-y-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full justify-between">
                  <span>Target Market</span>
                  {openSections.targetMarket ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                              (segment: string) => (
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
                        <div className="space-y-2">
                          {enrichment.target_customers?.b2b_focus && (
                            <div className="text-sm">
                              <span className="font-medium">B2B: </span>
                              {typeof enrichment.target_customers.b2b_focus ===
                              'string' ? (
                                enrichment.target_customers.b2b_focus
                              ) : (
                                <Badge variant="secondary">B2B</Badge>
                              )}
                            </div>
                          )}
                          {enrichment.target_customers?.b2c_focus && (
                            <div className="text-sm">
                              <span className="font-medium">B2C: </span>
                              {typeof enrichment.target_customers.b2c_focus ===
                              'string' ? (
                                enrichment.target_customers.b2c_focus
                              ) : (
                                <Badge variant="secondary">B2C</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {enrichment.target_customers?.needs_addressed &&
                      enrichment.target_customers.needs_addressed.length >
                        0 && (
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              <span className="font-medium">
                                Needs Addressed
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-2">
                              {enrichment.target_customers.needs_addressed.map(
                                (need: string) => (
                                  <Badge key={need} variant="secondary">
                                    {need}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {enrichment.target_customers?.key_benefits &&
                      enrichment.target_customers.key_benefits.length > 0 && (
                        <Card className="col-span-2">
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              <span className="font-medium">Key Benefits</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-2">
                              {enrichment.target_customers.key_benefits.map(
                                (benefit: string) => (
                                  <Badge key={benefit} variant="secondary">
                                    {benefit}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
