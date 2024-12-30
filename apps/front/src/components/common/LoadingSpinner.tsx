import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  className?: string
}

export const LoadingSpinner = ({
  message = 'Loading...',
  className = 'h-full w-full',
}: LoadingSpinnerProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
