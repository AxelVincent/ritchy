import {
  useResetCompanyMappings,
  useUpdateCompanyMapping,
} from '@/api/mutations/integrations/hubspot/mappings'
import {
  useCompanyMappings,
  useCompanyProperties,
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
import { type CompanyField, FIELD_CONFIGS } from '@ritchy/types'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { FieldMapping } from './shared/OptimizedSelect'

export const CompanyMapping = () => {
  const { data: mappings, isLoading, error } = useCompanyMappings()
  const { data: properties } = useCompanyProperties()
  const updateMapping = useUpdateCompanyMapping()
  const resetMappings = useResetCompanyMappings()

  const mappingArray = Array.isArray(mappings) ? mappings : []
  const fields = Object.entries(FIELD_CONFIGS.company)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load company mappings</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Company Mappings</CardTitle>
          <CardDescription>
            Map your internal fields to HubSpot company properties
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
      <CardContent className="space-y-4">
        {fields.map(([field, config]) => (
          <FieldMapping
            key={field}
            field={`company.${field}`}
            config={config}
            defaultField={config.defaultHubspotField}
            mapping={mappingArray.find(
              (m) => m.internalField === `company.${field}`,
            )}
            isLoading={isLoading}
            onMappingChange={(field, value) =>
              updateMapping.mutate({
                internalField: field as CompanyField,
                hubspotField: value,
              })
            }
            properties={properties}
          />
        ))}
      </CardContent>
    </Card>
  )
}
