import { cn } from '@/lib/utils'
import { X } from 'lucide-react' // Assuming you're using lucide-react for icons
import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, onClear, ...props }, ref) => {
    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (onChange) {
        // Create a synthetic event to maintain compatibility
        const event = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(event)
      }
      onClear?.()
    }

    return (
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            // Add padding-right to accommodate the clear button
            value ? 'pr-8' : '',
            className,
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Clear input"
          >
            {!props.readOnly && <X className="h-4 w-4" />}
          </button>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input }
