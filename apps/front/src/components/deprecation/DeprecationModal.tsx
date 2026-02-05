import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { SHUTDOWN_DATE } from './constants'

interface DeprecationModalProps {
  onClose: () => void
}

export const DeprecationModal = ({ onClose }: DeprecationModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deprecation-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-white to-orange-50 shadow-2xl border border-orange-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-orange-600 to-red-500 px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 id="deprecation-title" className="text-2xl font-bold">
              Important Service Notice
            </h2>
          </div>
          <p className="text-orange-100 relative">
            Ritchy will be shutting down on {SHUTDOWN_DATE}.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 bg-white space-y-4">
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              We want to inform you that the Ritchy service will be
              discontinued at the end of February 2026.
            </p>
            <p className="font-medium">
              Please save any important data before this date:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Export your contact lists</li>
              <li>Download any enriched data</li>
              <li>Save custom list configurations</li>
            </ul>
            <p>
              All subscriptions will be automatically cancelled, and you will
              not be charged after the shutdown date.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <Button
              onClick={onClose}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
            >
              I understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
