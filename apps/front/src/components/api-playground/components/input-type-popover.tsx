import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronDown, X } from 'lucide-react'
import { type InputType, inputTypeConfig } from '../utils'

interface InputTypePopoverProps {
  inputType: InputType
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTypeChange: (type: InputType) => void
}

export const InputTypePopover = ({
  inputType,
  isOpen,
  onOpenChange,
  onTypeChange,
}: InputTypePopoverProps) => {
  const currentConfig = inputTypeConfig[inputType]
  const CurrentIcon = currentConfig.icon

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-2.5 text-xs">
          <CurrentIcon className="h-3.5 w-3.5 mr-1.5" />
          {currentConfig.label}
          <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-medium text-sm">Input type</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-2">
          {(Object.keys(inputTypeConfig) as InputType[]).map((type) => {
            const config = inputTypeConfig[type]
            const Icon = config.icon
            const isSelected = inputType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${
                  isSelected ? 'bg-muted' : ''
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-input'
                  }`}
                >
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{config.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
