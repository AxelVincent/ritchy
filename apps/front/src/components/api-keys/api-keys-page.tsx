import { useCreateApiKey } from '@/api/mutations/api-keys/useCreateApiKey'
import { useRevokeApiKey } from '@/api/mutations/api-keys/useRevokeApiKey'
import { useApiKeySecret } from '@/api/queries/api-keys/useApiKeySecret'
import { useApiKeys } from '@/api/queries/api-keys/useApiKeys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { internalApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import { Check, Copy, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'

export const ApiKeysPage = () => {
  const { data: keys, isLoading: keysLoading } = useApiKeys()
  const createMutation = useCreateApiKey()
  const revokeMutation = useRevokeApiKey()
  const { getToken } = useAuth()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null)
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null)
  const [keyCopiedMap, setKeyCopiedMap] = useState<Record<string, boolean>>({})
  const [copyingKeyId, setCopyingKeyId] = useState<string | null>(null)

  // Fetch the full key when a key is revealed
  const { data: fullApiKey, isLoading: keySecretLoading } =
    useApiKeySecret(revealedKeyId)

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return
    const result = await createMutation.mutateAsync({ name: newKeyName })
    setCreatedKey(result.data.key)
    setNewKeyName('')
  }, [newKeyName, createMutation])

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false)
    setCreatedKey(null)
    setNewKeyName('')
  }, [])

  const handleCopyCreatedKey = useCallback(async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    }
  }, [createdKey])

  const handleCopyRevealedKey = useCallback(
    async (keyId: string, fullKey: string) => {
      await navigator.clipboard.writeText(fullKey)
      setKeyCopiedMap((prev) => ({ ...prev, [keyId]: true }))
      setTimeout(() => {
        setKeyCopiedMap((prev) => ({ ...prev, [keyId]: false }))
      }, 2000)
    },
    [],
  )

  const handleCopyKey = useCallback(
    async (keyId: string) => {
      // If key is already revealed, use the cached value
      if (revealedKeyId === keyId && fullApiKey) {
        await handleCopyRevealedKey(keyId, fullApiKey)
        return
      }

      // Otherwise, fetch the key first
      setCopyingKeyId(keyId)
      try {
        const token = await getToken()
        const response = await internalApiClient.fetchWithAuth<{
          success: boolean
          data: { key: string }
        }>(`/api-keys/${keyId}/secret`, { method: 'GET' }, token)

        if (response.success && response.data.key) {
          await navigator.clipboard.writeText(response.data.key)
          setKeyCopiedMap((prev) => ({ ...prev, [keyId]: true }))
          setTimeout(() => {
            setKeyCopiedMap((prev) => ({ ...prev, [keyId]: false }))
          }, 2000)
        }
      } catch (error) {
        console.error('Failed to copy API key:', error)
      } finally {
        setCopyingKeyId(null)
      }
    },
    [revealedKeyId, fullApiKey, handleCopyRevealedKey, getToken],
  )

  const handleToggleReveal = useCallback((keyId: string) => {
    setRevealedKeyId((prev) => (prev === keyId ? null : keyId))
  }, [])

  const handleRevokeKey = useCallback(async () => {
    if (revokeKeyId) {
      await revokeMutation.mutateAsync({ id: revokeKeyId })
      setRevokeKeyId(null)
    }
  }, [revokeKeyId, revokeMutation])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto max-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-muted-foreground mt-1">
              Manage your API keys for accessing the Ritchy API.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* API Keys List */}
        <div className="border rounded-lg bg-card">
          {keysLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="text-center py-12 border-dashed border-t">
              <p className="text-sm text-muted-foreground mb-3">
                No API keys yet
              </p>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first key
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{key.name}</h3>
                        {key.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {revealedKeyId === key.id ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 font-mono text-xs bg-muted px-3 py-2 rounded break-all">
                              {keySecretLoading ? (
                                <span className="text-muted-foreground">
                                  Loading...
                                </span>
                              ) : fullApiKey ? (
                                fullApiKey
                              ) : (
                                <span className="text-muted-foreground">
                                  Unable to load key
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => handleToggleReveal(key.id)}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => {
                                if (fullApiKey) {
                                  handleCopyRevealedKey(key.id, fullApiKey)
                                }
                              }}
                              disabled={!fullApiKey || keySecretLoading}
                            >
                              {keyCopiedMap[key.id] ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm text-muted-foreground">
                              {key.prefix}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleToggleReveal(key.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Show key
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => handleCopyKey(key.id)}
                              disabled={copyingKeyId === key.id}
                            >
                              {copyingKeyId === key.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : keyCopiedMap[key.id] ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {formatDate(key.createdAt)}
                        </div>
                        {key.lastUsedAt && (
                          <div>
                            <span className="font-medium">Last used:</span>{' '}
                            {formatDate(key.lastUsedAt)}
                          </div>
                        )}
                        {key.revokedAt && (
                          <div>
                            <span className="font-medium">Revoked:</span>{' '}
                            {formatDate(key.revokedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    {key.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevokeKeyId(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Key Dialog */}
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={handleCloseCreateDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {createdKey ? 'API Key Created' : 'Create New API Key'}
              </DialogTitle>
              <DialogDescription>
                {createdKey
                  ? "Copy your API key now. You won't be able to see it again!"
                  : 'Give your API key a name to identify it later.'}
              </DialogDescription>
            </DialogHeader>
            {createdKey ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCreatedKey}
                    >
                      {keyCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Important:</p>
                  <p>
                    Make sure to copy your API key now. You won't be able to see
                    it again after closing this dialog.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newKeyName.trim()) {
                        handleCreateKey()
                      }
                    }}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {createdKey ? (
                <Button onClick={handleCloseCreateDialog}>Done</Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCloseCreateDialog}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Key'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Key Confirmation Dialog */}
        <Dialog
          open={revokeKeyId !== null}
          onOpenChange={(open) => !open && setRevokeKeyId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke API Key?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The API key will immediately stop
                working and all requests using it will be rejected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRevokeKeyId(null)}
                disabled={revokeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevokeKey}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  'Revoke Key'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
