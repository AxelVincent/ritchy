import { Button } from '@/components/ui/button'
import type { ApiKeyListItem } from '@api/shared'
import { Check, Copy, Eye, EyeOff, Plus } from 'lucide-react'

interface ApiKeyListProps {
  keys: ApiKeyListItem[]
  keysLoading: boolean
  selectedKeyId: string | null
  onSelectKey: (id: string) => void
  showKey: boolean
  onToggleShowKey: () => void
  fullApiKey?: string
  keySecretLoading: boolean
  keyCopied: boolean
  onCopyKey: () => void
  getMaskedKey: (key: string) => string
  onCreateClick: () => void
}

export const ApiKeyList = ({
  keys,
  keysLoading,
  selectedKeyId,
  onSelectKey,
  showKey,
  onToggleShowKey,
  fullApiKey,
  keySecretLoading,
  keyCopied,
  onCopyKey,
  getMaskedKey,
  onCreateClick,
}: ApiKeyListProps) => {
  const activeKeys = keys.filter((k) => k.isActive)

  if (keysLoading) {
    return <div className="h-20 bg-muted animate-pulse rounded-md" />
  }

  if (!keys || keys.length === 0 || activeKeys.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">No API keys yet</p>
        <Button size="sm" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create your first key
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activeKeys.map((key) => {
        const isSelected = selectedKeyId === key.id
        return (
          <button
            type="button"
            key={key.id}
            className={`p-3 rounded-lg border text-left w-full ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } cursor-pointer transition-colors`}
            onClick={() => onSelectKey(key.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{key.name}</span>
              {isSelected && (
                <span className="text-xs text-primary">Selected</span>
              )}
            </div>

            {isSelected && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xs bg-muted px-3 py-2 rounded">
                    {keySecretLoading ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : fullApiKey ? (
                      showKey ? (
                        fullApiKey
                      ) : (
                        getMaskedKey(fullApiKey)
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Unable to load key
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleShowKey()
                    }}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCopyKey()
                    }}
                    disabled={!fullApiKey}
                  >
                    {keyCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created on{' '}
                  {new Date(key.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </>
            )}

            {!isSelected && (
              <p className="font-mono text-xs text-muted-foreground">
                {key.prefix}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
