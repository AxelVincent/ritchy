import { JsonTreeViewer } from '@/components/ui/json-tree-viewer'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import { CheckCircle, XCircle } from 'lucide-react'
import { PlaygroundResponseTabs } from './response-tabs'

interface ResponseSectionProps {
  response: unknown | null
  error: Error | null
  isSuccess: boolean
}

// Type guard to check if response is a valid success response
export const isValidSuccessResponse = (
  response: unknown,
): response is ApiV1CompanyEnrichmentSuccessResponse => {
  return (
    response !== null &&
    typeof response === 'object' &&
    'success' in response &&
    response.success === true &&
    'data' in response &&
    'meta' in response
  )
}

export const ResponseSection = ({
  response,
  error,
  isSuccess,
}: ResponseSectionProps) => {
  if (response === null && !error) {
    return null
  }

  const validResponse = isValidSuccessResponse(response) ? response : null

  return (
    <div className="border rounded-lg bg-card">
      <div className="border-b px-4 py-3 flex items-center gap-2">
        <span className="font-medium">Response</span>
        {response !== null && (
          <span
            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${
              isSuccess
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {isSuccess ? '200' : 'Error'}
          </span>
        )}
      </div>

      <div className="p-4">
        {error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-medium">Request Failed</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : isSuccess && validResponse ? (
          <PlaygroundResponseTabs response={validResponse} />
        ) : response !== null ? (
          // Fallback to JSON viewer for non-success responses
          <JsonTreeViewer data={response} showRoot={false} />
        ) : null}
      </div>
    </div>
  )
}
