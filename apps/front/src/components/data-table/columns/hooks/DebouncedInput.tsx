import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
}

export const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: DebouncedInputProps) => {
  const [value, setValue] = useState(initialValue)
  const isFirstRender = useRef(true)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // Skip onChange on initial render to prevent setting default filter values
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  const handleClear = () => {
    setValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`placeholder:text-xs font-medium ${props.className || ''} h-8 ${value ? 'pr-8' : ''} `}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 p-0"
          onClick={handleClear}
          aria-label="Clear input"
        >
          <X className="h-4 w-4 opacity-50 hover:opacity-100 shrink-0" />
        </Button>
      )}
    </div>
  )
}
