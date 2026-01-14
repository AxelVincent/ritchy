import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { Fragment, useCallback, useState } from 'react'
import { Button } from '../ui/button'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

interface JsonViewerProps {
  data: unknown
  className?: string
}

interface JsonNodeProps {
  keyName?: string
  value: JsonValue
  depth: number
  isLast: boolean
  defaultExpanded?: boolean
}

const getValueType = (value: JsonValue): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const getPreviewText = (value: JsonValue): string => {
  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value)
    return `{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`
  }
  return ''
}

// Generate a stable key for array items based on content
const getArrayItemKey = (item: JsonValue, index: number): string => {
  if (item === null) return `null-${index}`
  if (typeof item === 'object') {
    // For objects, use a hash of stringified content + index for uniqueness
    const str = JSON.stringify(item)
    let hash = 0
    for (let i = 0; i < Math.min(str.length, 100); i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return `obj-${hash}-${index}`
  }
  return `${typeof item}-${String(item).slice(0, 20)}-${index}`
}

const JsonNode = ({
  keyName,
  value,
  depth,
  isLast,
  defaultExpanded = true,
}: JsonNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && depth < 2)
  const type = getValueType(value)
  const isExpandable = type === 'object' || type === 'array'

  const toggleExpand = useCallback(() => {
    if (isExpandable) {
      setIsExpanded((prev) => !prev)
    }
  }, [isExpandable])

  const renderValue = () => {
    switch (type) {
      case 'string':
        return (
          <span className="text-emerald-600 dark:text-emerald-400">
            "{value as string}"
          </span>
        )
      case 'number':
        return (
          <span className="text-amber-600 dark:text-amber-400">
            {value as number}
          </span>
        )
      case 'boolean':
        return (
          <span className="text-purple-600 dark:text-purple-400">
            {(value as boolean).toString()}
          </span>
        )
      case 'null':
        return (
          <span className="text-gray-500 dark:text-gray-400 italic">null</span>
        )
      default:
        return null
    }
  }

  const renderExpandableContent = () => {
    if (!isExpandable) return null

    if (type === 'array') {
      const arr = value as JsonValue[]
      if (arr.length === 0) {
        return <span className="text-muted-foreground">[]</span>
      }

      return (
        <>
          <span className="text-muted-foreground">[</span>
          {!isExpanded && (
            <span className="text-muted-foreground text-xs ml-1">
              {getPreviewText(value)}
            </span>
          )}
          {isExpanded && (
            <div className="ml-4 border-l border-border/50 pl-2">
              {arr.map((item, idx) => (
                <Fragment key={getArrayItemKey(item, idx)}>
                  <JsonNode
                    keyName={String(idx)}
                    value={item}
                    depth={depth + 1}
                    isLast={idx === arr.length - 1}
                    defaultExpanded={depth < 1}
                  />
                </Fragment>
              ))}
            </div>
          )}
          {isExpanded && <span className="text-muted-foreground">]</span>}
          {!isExpanded && <span className="text-muted-foreground">]</span>}
        </>
      )
    }

    if (type === 'object') {
      const obj = value as { [key: string]: JsonValue }
      const entries = Object.entries(obj)

      if (entries.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>
      }

      return (
        <>
          <span className="text-muted-foreground">{'{'}</span>
          {!isExpanded && (
            <span className="text-muted-foreground text-xs ml-1">
              {getPreviewText(value)}
            </span>
          )}
          {isExpanded && (
            <div className="ml-4 border-l border-border/50 pl-2">
              {entries.map(([key, val], idx) => (
                <JsonNode
                  key={key}
                  keyName={key}
                  value={val}
                  depth={depth + 1}
                  isLast={idx === entries.length - 1}
                  defaultExpanded={depth < 1}
                />
              ))}
            </div>
          )}
          {isExpanded && <span className="text-muted-foreground">{'}'}</span>}
          {!isExpanded && <span className="text-muted-foreground">{'}'}</span>}
        </>
      )
    }

    return null
  }

  return (
    <div className="leading-6">
      <div className="flex items-start group">
        {isExpandable ? (
          <button
            onClick={toggleExpand}
            className="p-0.5 -ml-4 mr-1 hover:bg-muted rounded transition-colors flex-shrink-0"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4 mr-1 flex-shrink-0" />
        )}

        <span className="flex-1 min-w-0">
          {keyName !== undefined && (
            <>
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                {/^\d+$/.test(keyName) ? keyName : `"${keyName}"`}
              </span>
              <span className="text-muted-foreground mx-1">:</span>
            </>
          )}

          {isExpandable ? renderExpandableContent() : renderValue()}
          {!isLast && !isExpanded && (
            <span className="text-muted-foreground">,</span>
          )}
        </span>
      </div>
    </div>
  )
}

export const JsonViewer = ({ data, className }: JsonViewerProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('relative group', className)}>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs bg-background/80 backdrop-blur-sm"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="bg-muted/50 border rounded-lg p-4 pl-6 overflow-auto max-h-[500px] text-sm font-mono">
        <JsonNode
          value={data as JsonValue}
          depth={0}
          isLast={true}
          defaultExpanded={true}
        />
      </div>
    </div>
  )
}
