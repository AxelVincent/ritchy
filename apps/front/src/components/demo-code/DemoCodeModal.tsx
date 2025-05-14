import { useValidateDemoCode } from '@/api/mutations/users/useValidateDemoCode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCalApi } from '@calcom/embed-react'
import { useAuth } from '@clerk/clerk-react'
import type {
  ApiErrorResponse,
  ValidateDemoCodeApiResponse,
} from '@ritchy/types'
import { useRouter } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'

interface DemoCodeModalProps {
  onCodeValidated: () => void
  initialError?: string | null
}

export const DemoCodeModal = ({
  onCodeValidated,
  initialError,
}: DemoCodeModalProps) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(initialError || null)

  const { mutate: validateCode, isPending } = useValidateDemoCode()
  const router = useRouter()
  const { signOut } = useAuth()

  // Initialize Cal.com popup
  useEffect(() => {
    ;(async () => {
      const cal = await getCalApi()
      cal('ui', {
        theme: 'light',
        styles: {
          branding: { brandColor: '#2563eb' }, // Tailwind blue-600
        },
      })
    })()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    validateCode(
      { code },
      {
        onSuccess: (data: ValidateDemoCodeApiResponse) => {
          if ('success' in data && data.success) {
            localStorage.setItem('demoCodeValidated', 'true')
            onCodeValidated()
          } else if ('success' in data && !data.success) {
            setError(data.message || 'An unknown error occurred.')
          } else if ('error' in data) {
            setError(data.message || 'An API error occurred.')
          } else {
            setError('Received an unexpected response from the server.')
          }
        },
        onError: (err: ApiErrorResponse) => {
          setError(err?.message || 'Failed to validate code. Please try again.')
        },
      },
    )
  }

  useEffect(() => {
    if (initialError && code) {
      setError(null)
    }
  }, [code, initialError])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl text-center">
        <h2 className="mb-2 text-lg font-semibold text-gray-800">
          Unlock Ritchy
        </h2>
        <p className="mb-3 text-xs text-gray-600">
          To continue exploring Ritchy, you have a couple of options
        </p>

        <div className="space-y-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Option 1: Schedule a demo & Get a free trial code
            </h3>
            <Button
              data-cal-link="ryan-baissaut-799ndn/30min"
              data-cal-config='{"theme":"light"}'
              type="button"
              size="sm"
            >
              Book a demo
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Option 2: Choose a plan
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Ready to get started? Explore our subscription plans to get access
              to all features right away.
            </p>
            <Button
              onClick={() => {
                router.navigate({ to: '/pricing' })
              }}
              className="w-full sm:w-auto"
              size="sm"
            >
              View Plans
            </Button>
          </div>
        </div>

        <hr className="my-3" />

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            Already have a trial code?
          </h3>
          <p className="mb-2 text-xs text-gray-600">
            Enter the code provided by our team below:
          </p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label htmlFor="demoCode" className="sr-only">
                Demo Code
              </label>
              <Input
                id="demoCode"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER YOUR CODE"
                className="w-full text-center text-base tracking-wider"
                disabled={isPending}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-center text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={isPending}
              size="sm"
            >
              {isPending ? 'Validating...' : 'Unlock trial'}
            </Button>
          </form>
        </div>

        <hr className="my-4" />

        <Button
          onClick={() => signOut()}
          variant="ghost"
          className="w-full text-xs text-gray-500 hover:text-gray-700"
          size="sm"
        >
          Logout
        </Button>
      </div>
    </div>
  )
}
