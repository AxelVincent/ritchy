import { usePlaceEnrichmentQuery } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import {
  ActivitiesSection,
  EstablishmentsSection,
  FinancialsTable,
  TechnologiesSection,
  UBOSection,
} from '@/components/company-display'
import { EnrichmentAwareEmptyState } from '@/components/enrichment'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Place } from '@api/shared'
import {
  Building,
  Calendar,
  ChevronDown,
  ChevronRight,
  Globe,
  Hash,
  Loader2,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Company Identifiers Card - Shows basic info prominently
const CompanyIdentifiersCard = ({
  place,
  company,
  enrichment,
}: {
  place: Place
  company?: {
    name: string
    companyNumber: string
    status: string
    workforceRange?: string
    confidenceScore?: number
    reasoning?: string
  }
  enrichment?: {
    domain: string
  }
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)

  if (!company) return null

  const companyNameDiffers = company.name && company.name !== place.name

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company Identifiers
          </CardTitle>
          {company.confidenceScore !== undefined && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {company.confidenceScore}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Matching Reasoning - Associated with confidence score */}
        {company.reasoning && (
          <div className="mb-4 pb-4 border-b">
            <Collapsible
              open={isReasoningOpen}
              onOpenChange={setIsReasoningOpen}
            >
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-full text-left">
                {isReasoningOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>Matching reasoning</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-xs text-muted-foreground pl-4">
                {company.reasoning}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
          {/* Company Name - Only show if different from place name */}
          {companyNameDiffers && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Company Name</p>
              <p className="text-sm font-semibold">{company.name}</p>
            </div>
          )}

          {/* Company Number */}
          {company.companyNumber && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Company Number
              </p>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-mono">{company.companyNumber}</p>
              </div>
            </div>
          )}

          {/* Domain */}
          {enrichment?.domain && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Domain</p>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://${enrichment.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {enrichment.domain}
                </a>
              </div>
            </div>
          )}

          {/* Status */}
          {company.status && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge
                variant={company.status === 'ACTIVE' ? 'default' : 'secondary'}
              >
                {company.status}
              </Badge>
            </div>
          )}

          {/* Workforce Range */}
          {company.workforceRange && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Workforce</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{company.workforceRange}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Enrichment Info Card - Prominent, always visible
const EnrichmentInfoCard = ({
  enrichment,
}: {
  enrichment: {
    id: string
    description: string
    shortDescription: string
    domain: string
    domainRegisteredAt: string
    success: boolean
    technologies?: Array<{
      technology: string
      category: string
    }>
  }
}) => {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Enrichment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Description - Full text, prominent */}
        {enrichment.description && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Company Description</h4>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <ReactMarkdown>{enrichment.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Domain Info */}
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Domain</p>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={`https://${enrichment.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                {enrichment.domain || 'N/A'}
              </a>
            </div>
          </div>
          {enrichment.domainRegisteredAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Domain Registered
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {new Date(enrichment.domainRegisteredAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Technologies Section */}
        {enrichment.technologies && enrichment.technologies.length > 0 && (
          <div className="pt-4 border-t">
            <TechnologiesSection
              technologies={enrichment.technologies}
              showCard={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Company Overview Card
const CompanyOverviewCard = ({
  company,
}: {
  company: {
    tradeName?: string
    acronym?: string
    country: string
    countryCode: string
    type: string
    dateOfCreation: string
    dateOfCessation?: string
    workforce?: number
  }
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Additional Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
          {company.tradeName && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trade Name</p>
              <p className="text-sm">{company.tradeName}</p>
            </div>
          )}

          {company.acronym && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Acronym</p>
              <p className="text-sm font-mono">{company.acronym}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <p className="text-sm">
              {company.country} ({company.countryCode})
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="text-sm">{company.type || 'N/A'}</p>
          </div>

          {company.dateOfCreation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Date of Creation
              </p>
              <p className="text-sm">
                {new Date(company.dateOfCreation).toLocaleDateString()}
              </p>
            </div>
          )}

          {company.workforce && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Workforce Count
              </p>
              <p className="text-sm">{company.workforce.toLocaleString()}</p>
            </div>
          )}

          {company.dateOfCessation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Date of Cessation
              </p>
              <p className="text-sm text-destructive">
                {new Date(company.dateOfCessation).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Legal & Registration Card
const LegalRegistrationCard = ({
  company,
}: {
  company: {
    legalFormCode?: string
    localLegalFormCode?: string
    localLegalFormName?: string
    commercialRegisterRegistrationStatus?: string
    commercialRegisterRegistrationDate?: string
    commercialRegisterRegistrationNumber?: string
    commercialRegisterCessationDate?: string
  }
}) => {
  const hasLegalInfo =
    company.legalFormCode ||
    company.localLegalFormName ||
    company.commercialRegisterRegistrationStatus

  if (!hasLegalInfo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legal & Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {company.localLegalFormName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Legal Form</p>
            <p className="text-sm">{company.localLegalFormName}</p>
            {company.legalFormCode && (
              <p className="text-xs text-muted-foreground mt-1">
                Code: {company.legalFormCode}
              </p>
            )}
          </div>
        )}

        {company.commercialRegisterRegistrationStatus && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Status
            </p>
            <Badge variant="outline">
              {company.commercialRegisterRegistrationStatus}
            </Badge>
          </div>
        )}

        {company.commercialRegisterRegistrationNumber && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Number
            </p>
            <p className="text-sm font-mono">
              {company.commercialRegisterRegistrationNumber}
            </p>
          </div>
        )}

        {company.commercialRegisterRegistrationDate && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Date
            </p>
            <p className="text-sm">
              {new Date(
                company.commercialRegisterRegistrationDate,
              ).toLocaleDateString()}
            </p>
          </div>
        )}

        {company.commercialRegisterCessationDate && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cessation Date</p>
            <p className="text-sm text-destructive">
              {new Date(
                company.commercialRegisterCessationDate,
              ).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Address Card
const AddressCard = ({
  company,
}: {
  company: {
    headOfficeAddressLine1?: string
    headOfficeAddressLine2?: string
    headOfficePostalCode?: string
    headOfficeCity?: string
    headOfficeCountry?: string
    headOfficeCountryCode?: string
  }
}) => {
  const addressParts = [
    company.headOfficeAddressLine1,
    company.headOfficeAddressLine2,
    company.headOfficePostalCode,
    company.headOfficeCity,
    company.headOfficeCountry,
  ].filter(Boolean)

  if (addressParts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Head Office Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{addressParts.join(', ')}</p>
        {company.headOfficeCountryCode && (
          <p className="text-xs text-muted-foreground mt-1">
            Country Code: {company.headOfficeCountryCode}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Capital & Fiscal Card
const CapitalFiscalCard = ({
  company,
}: {
  company: {
    shareCapital?: string
    shareCapitalCurrency?: string
    fiscalYearEnd?: string
    nextFiscalYearEnd?: string
  }
}) => {
  const hasCapitalInfo =
    company.shareCapital || company.fiscalYearEnd || company.nextFiscalYearEnd

  if (!hasCapitalInfo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capital & Fiscal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {company.shareCapital && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Share Capital</p>
            <p className="text-sm font-medium">
              {company.shareCapital} {company.shareCapitalCurrency || ''}
            </p>
          </div>
        )}

        {company.fiscalYearEnd && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Fiscal Year End
            </p>
            <p className="text-sm">{company.fiscalYearEnd}</p>
          </div>
        )}

        {company.nextFiscalYearEnd && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Next Fiscal Year End
            </p>
            <p className="text-sm">{company.nextFiscalYearEnd}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Company Contacts Section
const CompanyContactsSection = ({
  contacts,
}: {
  contacts: Array<{ id: string; type: string; value: string }>
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Company Contacts ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {contacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1">
              <span className="text-xs text-muted-foreground">
                {contact.type}:
              </span>
              <span>{contact.value}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Component
export const PlaceCompanyDetailsTab = ({ place }: { place: Place }) => {
  const { data, isLoading, error } = usePlaceEnrichmentQuery(place.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading enrichment: {error.message}
      </div>
    )
  }

  const hasData = data && !('error' in data) && data?.id !== null

  return (
    <>
      <EnrichmentAwareEmptyState placeId={place.id} hasData={!!hasData} />

      {hasData && data && !('error' in data) && (
        <div className="h-full flex flex-col">
          <ScrollArea className="flex-1">
            <div className="@container pr-4 space-y-4">
              {/* 1. Company Identifiers - Prominent at top */}
              {data.company && (
                <CompanyIdentifiersCard
                  place={place}
                  company={data.company}
                  enrichment={data.enrichment}
                />
              )}

              {/* 2. Prominent Enrichment Info */}
              {data.enrichment && (
                <EnrichmentInfoCard enrichment={data.enrichment} />
              )}

              {/* 3. Company Details Sections */}
              {data.company && (
                <>
                  {/* Additional Details + Head Office Address - Side by side when available */}
                  <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                    <CompanyOverviewCard company={data.company} />
                    <AddressCard company={data.company} />
                  </div>

                  {/* Legal & Registration + Capital & Fiscal - Side by side when available */}
                  <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                    <LegalRegistrationCard company={data.company} />
                    <CapitalFiscalCard company={data.company} />
                  </div>

                  {data.company.ubos && data.company.ubos.length > 0 && (
                    <UBOSection ubos={data.company.ubos} />
                  )}

                  {data.company.contacts &&
                    data.company.contacts.length > 0 && (
                      <CompanyContactsSection
                        contacts={data.company.contacts}
                      />
                    )}

                  {/* Establishments + Business Activities - Side by side when available */}
                  {(data.company.establishments?.length > 0 ||
                    data.company.activities?.length > 0) && (
                    <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                      {data.company.establishments &&
                        data.company.establishments.length > 0 && (
                          <EstablishmentsSection
                            establishments={data.company.establishments}
                          />
                        )}

                      {data.company.activities &&
                        data.company.activities.length > 0 && (
                          <ActivitiesSection
                            activities={data.company.activities}
                          />
                        )}
                    </div>
                  )}

                  {data.company.financials &&
                    data.company.financials.length > 0 && (
                      <FinancialsTable financials={data.company.financials} />
                    )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  )
}
