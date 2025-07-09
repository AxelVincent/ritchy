import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

export const HeaderWrapper = ({
  title,
  helper,
}: {
  title: string
  helper?: React.ReactNode
}) => {
  return (
    <div className="w-full flex flex-col gap-2 p-2">
      <div className="w-full flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger className="flex-1 truncate">
            <div className="w-full h-8 px-4 py-2 text-left flex items-center justify-between">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium truncate">{title}</span>
              </div>
            </div>
          </TooltipTrigger>
        </Tooltip>
        {helper && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2 cursor-help text-muted-foreground flex-shrink-0">
                <HelpCircle className="h-4 w-4" aria-label="Help" />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs p-0 bg-transparent border-none shadow-none"
            >
              {helper}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
