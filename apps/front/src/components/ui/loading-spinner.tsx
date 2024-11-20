export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      <div
        className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent animate-spin"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}
