import * as Sentry from '@sentry/react'
import { Copy, MessageCircle, Phone, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

interface GlobalErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  copied: boolean
}

const SUPPORT_PHONE = '+33 5 54 54 70 66'
const SUPPORT_WHATSAPP = `https://wa.me/${SUPPORT_PHONE.replace(/\s|\+/g, '')}`

const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RIT-${timestamp}-${random}`
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null, copied: false }
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<GlobalErrorBoundaryState> {
    return { hasError: true, error, errorId: generateErrorId() }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Global error boundary caught an error:', error, errorInfo)

    Sentry.captureException(error, {
      tags: {
        component: 'GlobalErrorBoundary',
        type: 'unhandled_render_error',
        errorId: this.state.errorId || 'unknown',
      },
      extra: {
        errorId: this.state.errorId,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
      level: 'fatal',
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleCopyErrorId = async (): Promise<void> => {
    if (this.state.errorId) {
      await navigator.clipboard.writeText(this.state.errorId)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const whatsappMessage = encodeURIComponent(
        `Hi! I encountered an error on Ritchy.\nError ID: ${this.state.errorId}\nURL: ${window.location.href}`,
      )

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🐛</div>

            <h1 className="text-xl font-semibold text-foreground mb-2">
              Oops! A wild bug appeared!
            </h1>

            <p className="text-muted-foreground mb-4">
              Don't worry, we've already been notified and are on it. A quick
              reload usually does the trick!
            </p>

            {this.state.errorId && (
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-1">
                  Reference code (share this with support)
                </p>
                <button
                  onClick={this.handleCopyErrorId}
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm font-mono text-foreground hover:bg-muted/80 transition-colors"
                >
                  {this.state.errorId}
                  <Copy className="w-3 h-3" />
                </button>
                {this.state.copied && (
                  <p className="text-xs text-green-600 mt-1">Copied!</p>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              type="button"
              className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 py-2 mb-4 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <RefreshCw className="w-4 h-4" />
              Reload page
            </button>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Still stuck? We're here to help:
              </p>
              <div className="flex gap-2 justify-center">
                <a
                  href={`${SUPPORT_WHATSAPP}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40 text-destructive">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
