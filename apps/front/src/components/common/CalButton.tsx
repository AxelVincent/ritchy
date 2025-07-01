import { Button } from '@/components/ui/button'
import { getCalApi } from '@calcom/embed-react'
import { type ReactNode, useEffect } from 'react'

interface CalButtonProps {
  children: ReactNode
  calLink?: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
}

export const CalButton = ({
  children,
  calLink = 'ryan-baissaut-799ndn/ritchydemo',
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
}: CalButtonProps) => {
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

  return (
    <Button
      data-cal-link={calLink}
      data-cal-config='{"theme":"light"}'
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
