import {
  useResetContactMappings,
  useUpdateContactMapping,
} from '@/api/mutations/integrations/hubspot/mappings'
import {
  useContactMappings,
  useContactProperties,
} from '@/api/queries/integrations/hubspot/mappings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ContactField,
  FIELD_CONFIGS,
  HUBSPOT_STATUS_DISPLAY_NAMES,
  HubspotLeadStatusEnum,
  type StatusField,
} from '@ritchy/types'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { FieldMapping } from './shared/OptimizedSelect'

export const ContactMapping = () => {
  const {
    data: mappings,
    isLoading: isMappingsLoading,
    error,
  } = useContactMappings()
  const { data: properties, isLoading: isPropertiesLoading } =
    useContactProperties()
  const updateMapping = useUpdateContactMapping()
  const resetMappings = useResetContactMappings()

  const mappingArray = Array.isArray(mappings) ? mappings : []
  const contactFields = Object.entries(FIELD_CONFIGS.contact)
  const statusFields = Object.entries(FIELD_CONFIGS.status)

  // Compute expected fields for both contact and status
  const expectedFields = [
    ...contactFields.map(([field]) => `contact.${field}`),
    ...statusFields.map(([field]) => `status.${field}`),
  ]
  const allFieldsPresent =
    mappingArray.length > 0 &&
    expectedFields.every((field) =>
      mappingArray.some((m) => m.internalField === field),
    )

  const statusOptions = Object.values(HubspotLeadStatusEnum.enum).map(
    (status) => ({
      value: status,
      label: HUBSPOT_STATUS_DISPLAY_NAMES[status],
    }),
  )

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load contact mappings</AlertDescription>
      </Alert>
    )
  }

  if (isMappingsLoading || isPropertiesLoading || !allFieldsPresent) {
    return <div>Loading contact mappings...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contact Mappings</CardTitle>
          <CardDescription>
            Map your internal fields to HubSpot contact properties
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMappings.mutate({})}
          disabled={resetMappings.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Contact Information</h3>
          {contactFields.map(([field, config]) => (
            <FieldMapping
              key={field}
              field={`contact.${field}`}
              config={config}
              defaultField={config.defaultHubspotField}
              mapping={mappingArray.find(
                (m) => m.internalField === `contact.${field}`,
              )}
              isLoading={isMappingsLoading}
              onMappingChange={(field, value) =>
                updateMapping.mutate({
                  internalField: field as ContactField,
                  hubspotField: value,
                })
              }
              properties={properties}
            />
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Lead Status Mappings</h3>
          {statusFields.map(([field, config]) => (
            <FieldMapping
              key={field}
              field={`status.${field}`}
              config={config}
              defaultField={config.defaultHubspotField}
              mapping={mappingArray.find(
                (m) => m.internalField === `status.${field}`,
              )}
              isLoading={isMappingsLoading}
              onMappingChange={(field, value) =>
                updateMapping.mutate({
                  internalField: field as StatusField,
                  hubspotField: value,
                })
              }
              isStatusField
              statusOptions={statusOptions}
              properties={properties}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
