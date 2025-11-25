import { CalButton } from '@/components/common/CalButton'
import { Button } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'
import { Calendar, Sparkles } from 'lucide-react'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export type UpgradeTrigger = 'insufficient_credits'

interface UpgradeModalProps {
  trigger: UpgradeTrigger
  onClose: () => void
  creditsRemaining?: number
}

export const UpgradeModal = ({
  trigger,
  onClose,
  creditsRemaining,
}: UpgradeModalProps) => {
  const router = useRouter()

  useEffect(() => {
    // Track modal shown
    posthog.capture('upgrade_modal_shown', {
      trigger,
      credits_remaining: creditsRemaining,
    })
  }, [trigger, creditsRemaining])

  const handleViewPricing = () => {
    posthog.capture('upgrade_modal_view_pricing_clicked', {
      trigger,
      credits_remaining: creditsRemaining,
    })
    router.navigate({ to: '/pricing' })
    onClose()
  }

  const handleClose = () => {
    posthog.capture('upgrade_modal_dismissed', {
      trigger,
      credits_remaining: creditsRemaining,
    })
    onClose()
  }

  const handleCalClick = () => {
    posthog.capture('upgrade_modal_book_meeting_clicked', {
      trigger,
      credits_remaining: creditsRemaining,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">Out of credits</h2>
          </div>
          <p className="text-blue-100 relative">
            You've used all your free credits to get verified emails, direct
            phone numbers, and AI-powered business intelligence to reach the
            right people.
            <br />
            <br />
            Want to keep exploring Ritchy?
          </p>
        </div>

        {/* Benefits section */}
        <div className="px-6 py-6 bg-white">
          {/* Primary CTA - Book Meeting */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 mb-4 border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Get free extra credits
                </h3>
                <p className="text-sm text-gray-600">
                  Book a quick call with our team and receive additional credits
                  to test our business intelligence enrichment.
                </p>
              </div>
            </div>
            <div
              onClick={handleCalClick}
              onKeyDown={(e) => e.key === 'Enter' && handleCalClick()}
            >
              <CalButton
                size="lg"
                className="w-full shadow-lg hover:shadow-xl transition-shadow"
              >
                Book a 15-minute call
              </CalButton>
            </div>
          </div>

          {/* Secondary CTA - View Pricing */}
          <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Ready to upgrade?
                </h3>
                <p className="text-sm text-gray-600">
                  Choose a plan and get instant access to all premium features.
                </p>
              </div>
            </div>
            <Button
              onClick={handleViewPricing}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              View Pricing Plans
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 bg-white">
          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            size="sm"
          >
            I'll continue later
          </Button>
        </div>
      </div>
    </div>
  )
}
