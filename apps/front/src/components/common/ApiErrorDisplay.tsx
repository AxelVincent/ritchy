import type { ApiErrorResponse } from '@api/shared'

interface ApiErrorDisplayProps {
  error: ApiErrorResponse | unknown
}

export const ApiErrorDisplay = ({ error }: ApiErrorDisplayProps) => {
  // Handle ApiErrorResponse
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as ApiErrorResponse

    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800">{apiError.error}</h3>
        {apiError.message && (
          <p className="mt-1 text-red-700">{apiError.message}</p>
        )}
        {apiError.details && apiError.details.length > 0 && (
          <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
            {apiError.details.map((detail) => (
              <li key={`${detail.path.join('.')}-${detail.message}`}>
                {detail.message} (at {detail.path.join('.')})
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800">Error</h3>
        <p className="mt-1 text-red-700">{error.message}</p>
      </div>
    )
  }

  // Fallback for unknown error types
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h3 className="text-lg font-medium text-red-800">Unknown Error</h3>
      <p className="mt-1 text-red-700">An unexpected error occurred</p>
    </div>
  )
}
