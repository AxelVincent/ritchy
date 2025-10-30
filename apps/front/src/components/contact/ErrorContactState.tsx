import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorContactStateProps {
  error?: string
  onRetry?: () => void
  isRetrying?: boolean
}

export const ErrorContactState = ({
  error,
  onRetry,
  isRetrying = false,
}: ErrorContactStateProps) => {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-md w-full border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Failed to Load Contacts</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {error ||
                  'Unable to fetch contact information for this place. Please try again.'}
              </p>
            </div>

            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                variant="outline"
                className="w-full max-w-xs"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
