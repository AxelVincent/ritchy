import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary specifically for enrichment-related errors in the DataTable.
 * Catches errors from enrichment mutations, status queries, and rendering issues.
 */
export class EnrichmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (e.g., Sentry)
    console.error('Enrichment error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Optionally clear query cache to ensure fresh state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Enrichment Error</h2>
          </div>
          <p className="text-muted-foreground text-center max-w-md">
            An error occurred while processing enrichment data. This might be
            due to a network issue or a problem with the enrichment service.
          </p>
          {this.state.error && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-2xl">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="default">
              Reload Page
            </Button>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              variant="outline"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
