import { useCreateApiKey } from '@/api/mutations/api-keys/useCreateApiKey'
import { useApiKeySecret } from '@/api/queries/api-keys/useApiKeySecret'
import { useApiKeys } from '@/api/queries/api-keys/useApiKeys'
import { publicApiClient } from '@/hooks/useApi'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type InputType, generateCodeSnippets } from '../utils'

export const usePlayground = () => {
  // API Keys
  const { data: keys, isLoading: keysLoading } = useApiKeys()
  const createMutation = useCreateApiKey()
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  // Create key dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Fetch the full key when a key is selected
  const { data: fullApiKey, isLoading: keySecretLoading } =
    useApiKeySecret(selectedKeyId)

  // Request state
  const [inputType, setInputType] = useState<InputType>('url')
  const [inputValue, setInputValue] = useState('')
  const [response, setResponse] = useState<unknown | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isInputTypeOpen, setIsInputTypeOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [activeCodeTab, setActiveCodeTab] = useState<string>('curl')

  // Auto-select first active key
  useEffect(() => {
    if (keys && keys.length > 0 && !selectedKeyId) {
      const firstActive = keys.find((k) => k.isActive)
      if (firstActive) {
        setSelectedKeyId(firstActive.id)
      }
    }
  }, [keys, selectedKeyId])

  // Mask the API key for display
  const getMaskedKey = useCallback((key: string) => {
    if (key.length <= 16) return key
    return `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-8)}`
  }, [])

  const handleCopyKey = useCallback(async () => {
    if (fullApiKey) {
      await navigator.clipboard.writeText(fullApiKey)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    }
  }, [fullApiKey])

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return
    const result = await createMutation.mutateAsync({ name: newKeyName })
    setCreatedKey(result.data.key)
    setSelectedKeyId(result.data.id)
    setNewKeyName('')
  }, [newKeyName, createMutation])

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false)
    setCreatedKey(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!inputValue) return
    if (!fullApiKey) {
      setError(new Error('Please select an API key to run requests'))
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const body =
        inputType === 'placeId'
          ? { googlePlaceId: inputValue }
          : { googleMapsUrl: inputValue }

      const result = await publicApiClient.fetchWithAuth(
        '/v1/enrich/company',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        fullApiKey,
      )
      setResponse(result)
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError(new Error((err as { message: string }).message))
      } else {
        setError(err instanceof Error ? err : new Error('Request failed'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, fullApiKey, inputType])

  const handleInputTypeChange = useCallback((type: InputType) => {
    setInputType(type)
    setInputValue('')
    setIsInputTypeOpen(false)
  }, [])

  const handleCopyCode = useCallback(async () => {
    const apiKeyForCode = fullApiKey ?? 'YOUR_API_KEY'
    const snippets = generateCodeSnippets(inputType, inputValue, apiKeyForCode)
    const code = snippets[activeCodeTab as keyof typeof snippets]
    await navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [fullApiKey, inputType, inputValue, activeCodeTab])

  // Memoized values
  const codeSnippets = useMemo(() => {
    const apiKeyForCode = fullApiKey ?? 'YOUR_API_KEY'
    return generateCodeSnippets(inputType, inputValue, apiKeyForCode)
  }, [fullApiKey, inputType, inputValue])

  const isSuccess = useMemo((): boolean => {
    return Boolean(
      response &&
        typeof response === 'object' &&
        'success' in response &&
        response.success,
    )
  }, [response])

  const activeKeys = useMemo(() => {
    return keys?.filter((k) => k.isActive) ?? []
  }, [keys])

  return {
    // API Keys state
    keys,
    activeKeys,
    keysLoading,
    selectedKeyId,
    setSelectedKeyId,
    showKey,
    setShowKey,
    keyCopied,
    fullApiKey,
    keySecretLoading,
    getMaskedKey,
    handleCopyKey,

    // Create key dialog
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    newKeyName,
    setNewKeyName,
    createdKey,
    createMutation,
    handleCreateKey,
    handleCloseCreateDialog,

    // Request state
    inputType,
    inputValue,
    setInputValue,
    response,
    isLoading,
    error,
    isSuccess,
    handleSubmit,
    handleInputTypeChange,

    // UI state
    isDrawerOpen,
    setIsDrawerOpen,
    isInputTypeOpen,
    setIsInputTypeOpen,

    // Code snippets
    codeSnippets,
    activeCodeTab,
    setActiveCodeTab,
    codeCopied,
    handleCopyCode,
  }
}
