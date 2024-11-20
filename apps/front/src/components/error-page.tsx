interface ErrorPageProps {
  error: Error
}

export const ErrorPage = ({ error }: ErrorPageProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Oops! Something went wrong
      </h1>
      <p className="text-gray-600 mb-2">Error message:</p>
      <pre className="bg-gray-100 p-4 rounded-lg text-sm">
        {error.message || 'An unexpected error occurred'}
      </pre>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Refresh Page
      </button>
    </div>
  )
}
