import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import { useCallback, useState } from 'react'

const SEARCH_LIMIT = {
  MIN: 1,
  MAX: 240,
} as const

const PRESETS = [25, 50, 100, 200] as const

interface LimitSelectorProps {
  value: number
  onChange: (limit: number) => void
  disabled?: boolean
  className?: string
}

export const LimitSelector = ({
  value,
  onChange,
  disabled,
  className,
}: LimitSelectorProps) => {
  const [inputValue, setInputValue] = useState(value.toString())

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      setInputValue(rawValue)

      const parsed = Number.parseInt(rawValue, 10)
      if (
        !Number.isNaN(parsed) &&
        parsed >= SEARCH_LIMIT.MIN &&
        parsed <= SEARCH_LIMIT.MAX
      ) {
        onChange(parsed)
      }
    },
    [onChange],
  )

  const handleInputBlur = useCallback(() => {
    const parsed = Number.parseInt(inputValue, 10)
    if (Number.isNaN(parsed) || parsed < SEARCH_LIMIT.MIN) {
      setInputValue(SEARCH_LIMIT.MIN.toString())
      onChange(SEARCH_LIMIT.MIN)
    } else if (parsed > SEARCH_LIMIT.MAX) {
      setInputValue(SEARCH_LIMIT.MAX.toString())
      onChange(SEARCH_LIMIT.MAX)
    } else {
      setInputValue(parsed.toString())
    }
  }, [inputValue, onChange])

  const handlePresetClick = useCallback(
    (preset: number) => {
      setInputValue(preset.toString())
      onChange(preset)
    },
    [onChange],
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Number of companies
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Choose how many companies to find (1-240). More companies
                  means broader coverage of your search area.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <input
          type="number"
          min={SEARCH_LIMIT.MIN}
          max={SEARCH_LIMIT.MAX}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={cn(
            'w-20 h-9 text-center text-sm font-medium rounded-md border border-input bg-background px-2',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          )}
        />
      </div>

      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
            className={cn(
              'flex-1 h-8 text-xs font-medium rounded-md border transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              value === preset
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-muted hover:border-muted-foreground/20',
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
