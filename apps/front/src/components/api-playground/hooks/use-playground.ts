import { useCreateApiKey } from '@/api/mutations/api-keys/useCreateApiKey'
import { useApiKeySecret } from '@/api/queries/api-keys/useApiKeySecret'
import { useApiKeys } from '@/api/queries/api-keys/useApiKeys'
import { publicApiClient } from '@/hooks/useApi'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { type InputType, generateCodeSnippets } from '../utils'

/**
 * SSE Event types from the backend
 */
interface StreamProgressEvent {
  event: 'progress'
  step: string
  progress: number
  timestamp: number
}

interface StreamCompleteEvent {
  event: 'complete'
  data: unknown
  meta: {
    requestId: string
    processingTimeMs: number
    creditsUsed: number
    creditsRemaining: number
  }
}

interface StreamErrorEvent {
  event: 'error'
  code: string
  message: string
  meta: {
    requestId: string
    processingTimeMs: number
  }
}

type StreamEvent = StreamProgressEvent | StreamCompleteEvent | StreamErrorEvent

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

  // Streaming state - enabled by default
  const [streamingEnabled, setStreamingEnabled] = useState(() => {
    // Persist toggle state in localStorage, default to true
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('playground-streaming')
      return stored === null ? true : stored === 'true'
    }
    return true
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [steps, setSteps] = useState<
    Array<{ step: string; progress: number; timestamp: number }>
  >([])
  const [streamError, setStreamError] = useState<string | undefined>()
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  // Persist streaming toggle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('playground-streaming', String(streamingEnabled))
    }
  }, [streamingEnabled])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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

  /**
   * Start elapsed time timer
   */
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    setElapsedTime(0)
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current)
    }, 100)
  }, [])

  /**
   * Stop elapsed time timer
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Cancel ongoing streaming request
   */
  const handleCancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    stopTimer()
    setIsStreaming(false)
    setIsLoading(false)
  }, [stopTimer])

  /**
   * Handle streaming request with SSE
   */
  const handleStreamingSubmit = useCallback(async () => {
    if (!inputValue || !fullApiKey) return

    // Reset streaming state
    setIsLoading(true)
    setIsStreaming(true)
    setError(null)
    setResponse(null)
    setSteps([
      { step: 'Starting enrichment...', progress: 0, timestamp: Date.now() },
    ])
    setStreamError(undefined)

    // Start timer
    startTimer()

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const body =
        inputType === 'placeId'
          ? { googlePlaceId: inputValue }
          : { googleMapsUrl: inputValue }

      const apiBaseUrl =
        import.meta.env.VITE_RITCHY_API_BASE_URL || 'http://localhost:3030'
      const response = await fetch(
        `${apiBaseUrl}/api/v1/enrich/company?stream=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fullApiKey}`,
          },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()

          if (data === '[DONE]') {
            stopTimer()
            setIsStreaming(false)
            setIsLoading(false)
            continue
          }

          try {
            const event: StreamEvent = JSON.parse(data)

            // Use flushSync to force React to flush state updates to DOM immediately
            // This prevents batching and ensures UI updates in real-time
            flushSync(() => {
              switch (event.event) {
                case 'progress':
                  setSteps((prev) => [
                    ...prev,
                    {
                      step: event.step,
                      progress: event.progress,
                      timestamp: event.timestamp,
                    },
                  ])
                  break

                case 'complete':
                  setResponse({
                    success: true,
                    data: event.data,
                    meta: event.meta,
                  })
                  break

                case 'error':
                  setStreamError(event.message)
                  setError(new Error(event.message))
                  break
              }
            })
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setSteps((prev) => [
          ...prev,
          { step: 'Cancelled', progress: 0, timestamp: Date.now() },
        ])
        return
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Streaming failed'
      setStreamError(errorMessage)
      setError(new Error(errorMessage))
    } finally {
      stopTimer()
      setIsStreaming(false)
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [inputValue, fullApiKey, inputType, startTimer, stopTimer])

  /**
   * Handle non-streaming (synchronous) request
   */
  const handleSyncSubmit = useCallback(async () => {
    if (!inputValue) return
    if (!fullApiKey) {
      setError(new Error('Please select an API key to run requests'))
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)
    // Clear streaming state
    setSteps([])
    setStreamError(undefined)

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

  /**
   * Handle submit based on streaming toggle
   */
  const handleSubmit = useCallback(async () => {
    if (streamingEnabled) {
      await handleStreamingSubmit()
    } else {
      await handleSyncSubmit()
    }
  }, [streamingEnabled, handleStreamingSubmit, handleSyncSubmit])

  const handleInputTypeChange = useCallback((type: InputType) => {
    setInputType(type)
    setInputValue('')
    setIsInputTypeOpen(false)
  }, [])

  const handleCopyCode = useCallback(async () => {
    const apiKeyForCode = fullApiKey ?? 'YOUR_API_KEY'
    const snippets = generateCodeSnippets(
      inputType,
      inputValue,
      apiKeyForCode,
      streamingEnabled,
    )
    const code = snippets[activeCodeTab as keyof typeof snippets]
    await navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [fullApiKey, inputType, inputValue, activeCodeTab, streamingEnabled])

  // Memoized values
  const codeSnippets = useMemo(() => {
    const apiKeyForCode = fullApiKey ?? 'YOUR_API_KEY'
    return generateCodeSnippets(
      inputType,
      inputValue,
      apiKeyForCode,
      streamingEnabled,
    )
  }, [fullApiKey, inputType, inputValue, streamingEnabled])

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

    // Streaming state
    streamingEnabled,
    setStreamingEnabled,
    isStreaming,
    steps,
    streamError,
    elapsedTime,
    handleCancelStreaming,

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
