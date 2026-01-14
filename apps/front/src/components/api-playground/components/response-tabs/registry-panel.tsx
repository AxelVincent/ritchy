import {
  ActivitiesSection,
  EstablishmentsSection,
  OfficersSection,
  UBOSection,
} from '@/components/company-display'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  Briefcase,
  Building,
  Calendar,
  Hash,
  MapPin,
  Users,
} from 'lucide-react'
import { AddressDisplay, InfoRow } from './shared'

interface RegistryPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

export const RegistryPanel = ({ response }: RegistryPanelProps) => {
  const { registry } = response.data

  if (!registry) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p>No registry data available</p>
      </div>
    )
  }

  const officers = registry.officers ?? []
  const ubos = registry.ubos ?? []
  const establishments = registry.establishments ?? []
  const activities = registry.activities ?? []

  const hasOfficers = officers.length > 0
  const hasUbos = ubos.length > 0
  const hasPeople = hasOfficers || hasUbos
  const hasEstablishments = establishments.length > 0
  const hasActivities = activities.length > 0
  const hasLocations = hasEstablishments || hasActivities

  return (
    <div className="space-y-4">
      {/* Card 1: Company Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              {registry.name || 'Company'}
            </CardTitle>
            <Badge
              variant={registry.status === 'ACTIVE' ? 'default' : 'secondary'}
            >
              {registry.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identifiers Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow
              label="Registration Number"
              value={registry.registrationNumber}
              icon={Hash}
              mono
            />
            {registry.tradeName && (
              <InfoRow label="Trade Name" value={registry.tradeName} />
            )}
            <InfoRow
              label="Country"
              value={
                registry.country
                  ? `${registry.country}${registry.countryCode ? ` (${registry.countryCode})` : ''}`
                  : registry.countryCode
              }
            />
            {registry.vatNumber && (
              <InfoRow label="VAT Number" value={registry.vatNumber} mono />
            )}
            {registry.lei && <InfoRow label="LEI" value={registry.lei} mono />}
            {registry.isin && (
              <InfoRow label="ISIN" value={registry.isin} mono />
            )}
          </div>

          {/* Company Details Section */}
          {(registry.type ||
            registry.localLegalFormName ||
            registry.createdAt ||
            registry.workforce !== null ||
            registry.shareCapital) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {registry.type && (
                  <InfoRow label="Type" value={registry.type} />
                )}
                {registry.localLegalFormName && (
                  <InfoRow
                    label="Legal Form"
                    value={registry.localLegalFormName}
                  />
                )}
                {registry.createdAt && (
                  <InfoRow
                    label="Date of Creation"
                    value={new Date(registry.createdAt).toLocaleDateString()}
                    icon={Calendar}
                  />
                )}
                {registry.cessationDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Date of Cessation
                    </p>
                    <p className="text-sm text-destructive">
                      {new Date(registry.cessationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {registry.workforce !== null && (
                  <InfoRow
                    label="Workforce"
                    value={registry.workforce?.toLocaleString()}
                    icon={Users}
                  />
                )}
                {registry.workforceRange && (
                  <InfoRow
                    label="Workforce Range"
                    value={registry.workforceRange}
                  />
                )}
                {registry.shareCapital && (
                  <InfoRow
                    label="Share Capital"
                    value={`${registry.shareCapital} ${registry.shareCapitalCurrency || ''}`}
                  />
                )}
                {registry.fiscalYearEnd && (
                  <InfoRow
                    label="Fiscal Year End"
                    value={registry.fiscalYearEnd}
                  />
                )}
              </div>
            </>
          )}

          {/* Head Office */}
          {registry.headOffice && (
            <>
              <Separator />
              <AddressDisplay
                address={registry.headOffice}
                label="Head Office"
                showIcon={true}
              />
            </>
          )}

          {/* Commercial Register */}
          {registry.commercialRegister && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Commercial Register
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {registry.commercialRegister.status && (
                    <Badge variant="outline">
                      {registry.commercialRegister.status}
                    </Badge>
                  )}
                  {registry.commercialRegister.location && (
                    <span className="text-muted-foreground">
                      {registry.commercialRegister.location}
                    </span>
                  )}
                  {registry.commercialRegister.registrationDate && (
                    <span className="text-muted-foreground">
                      Registered:{' '}
                      {new Date(
                        registry.commercialRegister.registrationDate,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 2: People (Officers + UBOs) */}
      {hasPeople && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              People
              <Badge variant="secondary" className="ml-1">
                {officers.length + ubos.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasOfficers && (
              <OfficersSection officers={officers} showCard={false} />
            )}
            {hasUbos && (
              <>
                {hasOfficers && <Separator />}
                <UBOSection ubos={ubos} showCard={false} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 3: Locations & Activities */}
      {hasLocations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations & Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasEstablishments && (
              <EstablishmentsSection
                establishments={establishments}
                showCard={false}
              />
            )}
            {hasActivities && (
              <>
                {hasEstablishments && <Separator />}
                <ActivitiesSection activities={activities} showCard={false} />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
