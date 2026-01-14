'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  MoreHorizontal,
} from 'lucide-react'
import * as React from 'react'

type JsonViewerProps = {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  data: any
  rootName?: string
  defaultExpanded?: boolean
  className?: string
  showRoot?: boolean
}

export function JsonTreeViewer({
  data,
  rootName = 'root',
  defaultExpanded = true,
  className,
  showRoot = true,
}: JsonViewerProps) {
  // When showRoot is false and data is an object/array, render children directly
  if (!showRoot && data !== null && typeof data === 'object') {
    const keys = Object.keys(data)
    const isArray = Array.isArray(data)
    return (
      <TooltipProvider>
        <div className={cn('font-mono text-sm', className)}>
          {keys.map((key) => (
            <JsonNode
              key={key}
              name={isArray ? `[${key}]` : key}
              data={data[key]}
              isRoot={false}
              defaultExpanded={defaultExpanded}
              level={0}
            />
          ))}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('font-mono text-sm', className)}>
        <JsonNode
          name={rootName}
          data={data}
          isRoot={true}
          defaultExpanded={defaultExpanded}
        />
      </div>
    </TooltipProvider>
  )
}

type JsonNodeProps = {
  name: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  data: any
  isRoot?: boolean
  defaultExpanded?: boolean
  level?: number
}

function JsonNode({
  name,
  data,
  isRoot = false,
  defaultExpanded = true,
  level = 0,
}: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const [isCopied, setIsCopied] = React.useState(false)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation()

    // For primitive values, copy the raw value without JSON formatting
    if (data === null) {
      navigator.clipboard.writeText('null')
    } else if (data === undefined) {
      navigator.clipboard.writeText('undefined')
    } else if (typeof data === 'string') {
      navigator.clipboard.writeText(data) // Copy string without quotes
    } else if (typeof data === 'number' || typeof data === 'boolean') {
      navigator.clipboard.writeText(String(data)) // Copy number/boolean as string
    } else if (data instanceof Date) {
      navigator.clipboard.writeText(data.toISOString())
    } else {
      // For objects/arrays, use JSON.stringify
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    }

    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const dataType =
    data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data
  const isExpandable =
    data !== null &&
    data !== undefined &&
    !(data instanceof Date) &&
    (dataType === 'object' || dataType === 'array')
  const itemCount =
    isExpandable && data !== null && data !== undefined
      ? Object.keys(data).length
      : 0

  return (
    <div
      className={cn('pl-4 group/object', level > 0 && 'border-l border-border')}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
      <div
        className={cn(
          'flex items-center gap-1 py-1 hover:bg-muted/50 rounded px-1 -ml-4 cursor-pointer group/property',
          isRoot && 'text-primary font-semibold',
        )}
        onClick={isExpandable ? handleToggle : undefined}
      >
        {isExpandable ? (
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        ) : (
          <div className="w-4" />
        )}

        <span className="text-primary">{name}</span>

        <span className="text-muted-foreground">
          {isExpandable ? (
            <>
              {dataType === 'array' ? '[' : '{'}
              {!isExpanded && (
                <span className="text-muted-foreground">
                  {' '}
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}{' '}
                  {dataType === 'array' ? ']' : '}'}
                </span>
              )}
            </>
          ) : (
            ':'
          )}
        </span>

        {!isExpandable && <JsonValue data={data} />}

        {!isExpandable && <div className="w-3.5" />}

        {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
        <button
          onClick={copyToClipboard}
          className="ml-auto opacity-0 group-hover/property:opacity-100 hover:bg-muted p-1 rounded"
          title="Copy to clipboard"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpandable && isExpanded && data !== null && data !== undefined && (
        <div className="pl-4">
          {Object.keys(data).map((key) => (
            <JsonNode
              key={key}
              name={dataType === 'array' ? `${key}` : key}
              data={data[key]}
              level={level + 1}
              defaultExpanded={level < 1}
            />
          ))}
          <div className="text-muted-foreground pl-4 py-1">
            {dataType === 'array' ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  )
}

// Update the JsonValue function to make the entire row clickable with an expand icon
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function JsonValue({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const dataType = typeof data
  const TEXT_LIMIT = 80 // Character limit before truncation

  if (data === null) {
    return <span className="text-rose-500">null</span>
  }

  if (data === undefined) {
    return <span className="text-muted-foreground">undefined</span>
  }

  if (data instanceof Date) {
    return <span className="text-purple-500">{data.toISOString()}</span>
  }

  switch (dataType) {
    case 'string':
      if (data.length > TEXT_LIMIT) {
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
          <div
            className="text-emerald-500 flex-1 flex items-center relative group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {`"`}
            {isExpanded ? (
              <span className="inline-block max-w-full">{data}</span>
            ) : (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="inline-block max-w-full">
                    {data.substring(0, TEXT_LIMIT)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-md text-xs p-2 break-words"
                >
                  {data}
                </TooltipContent>
              </Tooltip>
            )}
            {`"`}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+4px)] opacity-0 group-hover:opacity-100 transition-opacity">
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        )
      }
      return <span className="text-emerald-500">{`"${data}"`}</span>
    case 'number':
      return <span className="text-amber-500">{data}</span>
    case 'boolean':
      return <span className="text-blue-500">{data.toString()}</span>
    default:
      return <span>{String(data)}</span>
  }
}
