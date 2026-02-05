import { SHUTDOWN_DATE } from '@/components/deprecation/constants'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export const NavDeprecation = () => {
  return (
    <div className="px-2 py-2">
      <Alert variant="destructive" className="py-3">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">
          Service Ending
        </AlertTitle>
        <AlertDescription className="text-xs mt-1">
          Ritchy will shut down on {SHUTDOWN_DATE}. Please save your data.
        </AlertDescription>
      </Alert>
    </div>
  )
}
