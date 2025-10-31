import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Loader2,
  PauseCircle,
  XCircle,
} from 'lucide-react'
import type { ImportStats } from './import'

interface ProcessingStatusProps {
  stats: ImportStats
  isPaused: boolean
  error?: string
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export const ProcessingStatus = ({
  stats,
  isPaused,
  error,
  onPause,
  onResume,
  onCancel,
}: ProcessingStatusProps) => {
  const progress = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0

  return (
    <div className="flex flex-col space-y-6 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Importing Places</h2>
        <p className="text-sm text-muted-foreground">
          {isPaused
            ? 'Import paused'
            : 'Processing rows one by one. This may take a few minutes.'}
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {stats.processed} / {stats.total} ({Math.round(progress)}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {error && (
          <div className="flex items-start space-x-3 p-3 rounded-md bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-semibold text-destructive text-sm">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold">{stats.successful}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Ambiguous</p>
              <p className="text-2xl font-bold">{stats.ambiguous}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <PauseCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Duplicate</p>
              <p className="text-2xl font-bold">{stats.duplicate}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {isPaused
          ? onResume && (
              <Button onClick={onResume}>
                <Loader2 className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )
          : onPause && (
              <Button variant="secondary" onClick={onPause}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
      </div>
    </div>
  )
}
