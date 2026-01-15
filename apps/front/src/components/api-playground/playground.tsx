import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Link } from '@tanstack/react-router'
import { AlertCircle, Code, Loader2, Radio, X } from 'lucide-react'
import {
  ActivityLog,
  CodeDrawer,
  CreateKeyDialog,
  InputTypePopover,
  ResponseSection,
} from './components'
import { StreamingProgress } from './components/streaming-progress'
import { usePlayground } from './hooks'
import { inputTypeConfig } from './utils'

export const ApiPlayground = () => {
  const {
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
  } = usePlayground()

  const currentConfig = inputTypeConfig[inputType]

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto max-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* No API Key Warning */}
        {!keysLoading && activeKeys.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No API key configured</AlertTitle>
            <AlertDescription>
              You need an API key to use the playground.{' '}
              <Link
                to="/api-keys"
                className="font-medium underline underline-offset-4 hover:text-primary"
              >
                Create an API key
              </Link>{' '}
              to get started.
            </AlertDescription>
          </Alert>
        )}

        {/* Endpoint Tabs */}
        <div className="border rounded-lg bg-card">
          <div className="border-b px-4 py-3">
            <Tabs defaultValue="company">
              <TabsList className="bg-transparent p-0 h-auto gap-2">
                <TabsTrigger
                  value="company"
                  className="rounded-md px-3 py-1.5 text-sm"
                >
                  Enrich a company
                </TabsTrigger>
                <TabsTrigger
                  value="batch"
                  disabled
                  className="rounded-md px-3 py-1.5 text-sm opacity-50"
                >
                  Search
                  <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    Coming soon
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Input section */}
          <div className="p-4 space-y-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentConfig.placeholder}
              className="w-full"
            />

            {/* Options row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <InputTypePopover
                  inputType={inputType}
                  isOpen={isInputTypeOpen}
                  onOpenChange={setIsInputTypeOpen}
                  onTypeChange={handleInputTypeChange}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    POST /v1/enrich/company
                    {streamingEnabled ? '?stream=true' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Streaming Toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="streaming-toggle"
                          checked={streamingEnabled}
                          onCheckedChange={setStreamingEnabled}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor="streaming-toggle"
                          className="text-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Radio className="h-3.5 w-3.5" />
                          Stream
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">
                        Enable real-time streaming to see progress and
                        discovered data as the enrichment runs. Uses Server-Sent
                        Events (SSE).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Developer tools
                </Button>

                {isStreaming ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9"
                    onClick={handleCancelStreaming}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={handleSubmit}
                    disabled={!inputValue || isLoading || !fullApiKey}
                  >
                    {isLoading && !isStreaming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      'Start enriching'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Streaming Progress */}
        {streamingEnabled && (isStreaming || steps.length > 0) && (
          <StreamingProgress
            isStreaming={isStreaming}
            steps={steps}
            error={streamError}
            elapsedTime={elapsedTime}
          />
        )}

        {/* Response Section */}
        <ResponseSection
          response={response}
          error={error}
          isSuccess={isSuccess}
        />

        {/* Activity Log */}
        <ActivityLog />

        {/* Code & API Key Drawer */}
        <CodeDrawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          keys={keys ?? []}
          keysLoading={keysLoading}
          selectedKeyId={selectedKeyId}
          onSelectKey={setSelectedKeyId}
          showKey={showKey}
          onToggleShowKey={() => setShowKey(!showKey)}
          fullApiKey={fullApiKey}
          keySecretLoading={keySecretLoading}
          keyCopied={keyCopied}
          onCopyKey={handleCopyKey}
          getMaskedKey={getMaskedKey}
          onCreateClick={() => setIsCreateDialogOpen(true)}
          codeSnippets={codeSnippets}
          activeCodeTab={activeCodeTab}
          onCodeTabChange={setActiveCodeTab}
          codeCopied={codeCopied}
          onCopyCode={handleCopyCode}
        />

        {/* Create Key Dialog */}
        <CreateKeyDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          newKeyName={newKeyName}
          onNewKeyNameChange={setNewKeyName}
          createdKey={createdKey}
          isPending={createMutation.isPending}
          onCreateKey={handleCreateKey}
          onClose={handleCloseCreateDialog}
        />
      </div>
    </div>
  )
}
