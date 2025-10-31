import { useUpsertList } from '@/api/mutations/lists/useUpsertList'
import { useUserMe } from '@/api/queries/users/useUserMe'
import { AmbiguousPlaceModal } from '@/components/import/ambiguous-place-modal'
import { CsvPreview } from '@/components/import/csv-preview'
import { FileUpload } from '@/components/import/file-upload'
import { useCsvParser } from '@/components/import/hooks/use-csv-parser'
import { useImportProcessor } from '@/components/import/hooks/use-import-processor'
import type {
  ColumnMapping,
  CsvRow,
  ImportState,
} from '@/components/import/import'
import { ImportSummary } from '@/components/import/import-summary'
import { ProcessingStatus } from '@/components/import/processing-status'
import { useToast } from '@/hooks/use-toast'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/_auth/import')({
  component: ImportComponent,
})

function ImportComponent() {
  const { toast } = useToast()
  const { data: userData } = useUserMe()
  const { parseFile, mapRowsToImportFormat } = useCsvParser()
  const { processRow } = useImportProcessor()
  const upsertListMutation = useUpsertList()

  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    rows: [],
    columnMapping: {},
    listName: 'Imported Places',
    listEmoji: '📍',
    stats: {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      ambiguous: 0,
      skipped: 0,
      duplicate: 0,
    },
    isPaused: false,
  })

  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([])
  const isProcessingRef = useRef(false)
  const shouldStopRef = useRef(false)

  // Auto-resume processing when ambiguous rows are resolved
  useEffect(() => {
    // Only auto-resume if we're in processing step and not currently processing
    if (state.step !== 'processing' || isProcessingRef.current) return

    // Check if we have pending rows but no ambiguous rows (just resolved one)
    const hasPending = state.rows.some((r) => r.status === 'pending')
    const hasAmbiguous = state.rows.some((r) => r.status === 'ambiguous')

    if (hasPending && !hasAmbiguous && state.listId) {
      // Resume processing
      isProcessingRef.current = false
      startProcessing(state.rows, state.listId)
    } else if (!hasPending && !hasAmbiguous && state.rows.length > 0) {
      // All done, go to summary
      setState((prev) => ({ ...prev, step: 'summary' }))
    }
  }, [state.rows, state.step, state.listId])

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setState((prev) => ({ ...prev, file }))

    const { headers, dataRows, error } = await parseFile(file)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error parsing CSV',
        description: error,
      })
      return
    }

    setCsvHeaders(headers)
    setCsvDataRows(dataRows)
    setState((prev) => ({ ...prev, step: 'preview' }))
  }

  // Handle preview confirmation
  const handleConfirmPreview = async (mapping: ColumnMapping) => {
    const mappedRows = mapRowsToImportFormat(
      csvDataRows,
      csvHeaders,
      mapping.nameColumn,
      mapping.placeIdColumn,
    )

    // Create the list
    try {
      const listResult = await upsertListMutation.mutateAsync({
        name: state.listName,
        emoji: state.listEmoji,
      })

      if ('error' in listResult) {
        toast({
          variant: 'destructive',
          title: 'Error creating list',
          description:
            typeof listResult.error === 'string'
              ? listResult.error
              : 'Failed to create list',
        })
        return
      }

      setState((prev) => ({
        ...prev,
        rows: mappedRows,
        columnMapping: mapping,
        listId: listResult.id,
        step: 'processing',
        stats: {
          ...prev.stats,
          total: mappedRows.length,
        },
      }))

      // Start processing
      startProcessing(mappedRows, listResult.id)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating list',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Start processing rows
  const startProcessing = async (rows: CsvRow[], listId: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    shouldStopRef.current = false

    for (let i = 0; i < rows.length; i++) {
      if (shouldStopRef.current) {
        break
      }

      const row = rows[i]

      // Skip already processed rows
      if (row.status !== 'pending') {
        continue
      }

      // Update status to processing
      setState((prev) => {
        const updatedRows = [...prev.rows]
        updatedRows[i] = { ...updatedRows[i], status: 'processing' }
        return { ...prev, rows: updatedRows }
      })

      try {
        const result = await processRow(row, listId)

        // Handle result
        setState((prev) => {
          const updatedRows = [...prev.rows]
          const newStats = { ...prev.stats }

          if (result.status === 'success') {
            updatedRows[i] = { ...updatedRows[i], status: 'success' }
            newStats.successful++
            newStats.processed++
          } else if (result.status === 'failed') {
            updatedRows[i] = {
              ...updatedRows[i],
              status: 'failed',
              error: result.error,
            }
            newStats.failed++
            newStats.processed++
          } else if (result.status === 'duplicate') {
            updatedRows[i] = { ...updatedRows[i], status: 'duplicate' }
            newStats.duplicate++
            newStats.processed++
          } else if (result.status === 'ambiguous') {
            updatedRows[i] = {
              ...updatedRows[i],
              status: 'ambiguous',
              predictions: result.predictions,
            }
            newStats.ambiguous++
            newStats.processed++
            // Pause processing to wait for user resolution
            shouldStopRef.current = true
            return {
              ...prev,
              rows: updatedRows,
              stats: newStats,
              isPaused: false, // Don't mark as paused, just waiting for resolution
            }
          } else if (result.status === 'paused') {
            // Stop processing
            shouldStopRef.current = true
            return {
              ...prev,
              rows: updatedRows,
              stats: newStats,
              isPaused: true,
              error: result.error,
            }
          }

          return { ...prev, rows: updatedRows, stats: newStats }
        })

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        // Handle unexpected errors
        setState((prev) => {
          const updatedRows = [...prev.rows]
          const newStats = { ...prev.stats }
          updatedRows[i] = {
            ...updatedRows[i],
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          }
          newStats.failed++
          newStats.processed++
          return { ...prev, rows: updatedRows, stats: newStats }
        })
      }
    }

    isProcessingRef.current = false

    // Check if there are ambiguous rows - use setState to access fresh state
    setState((prev) => {
      const hasAmbiguous = prev.rows.some((row) => row.status === 'ambiguous')
      const hasPending = prev.rows.some((row) => row.status === 'pending')

      // Only go to summary if no ambiguous and no pending rows
      if (!hasAmbiguous && !hasPending) {
        return { ...prev, step: 'summary' }
      }

      // Otherwise stay in processing (waiting for user input or more processing)
      return prev
    })
  }

  // Handle ambiguous place resolution
  const handleResolveAmbiguous = async (rowIndex: number, placeId: string) => {
    const row = state.rows[rowIndex]
    if (!row || !state.listId) return

    // Update row status to processing
    setState((prev) => {
      const updatedRows = [...prev.rows]
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        status: 'processing',
        selectedPlaceId: placeId,
      }
      return { ...prev, rows: updatedRows }
    })

    try {
      // Create a temporary row with the selected place ID
      const tempRow: CsvRow = {
        ...row,
        placeId,
      }

      const result = await processRow(tempRow, state.listId)

      // Update the resolved row's status - useEffect will handle resumption
      setState((prev) => {
        const updatedRows = [...prev.rows]
        const newStats = { ...prev.stats }

        if (result.status === 'success') {
          updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            status: 'success',
          }
          newStats.successful++
          newStats.ambiguous--
        } else if (result.status === 'duplicate') {
          updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            status: 'duplicate',
          }
          newStats.duplicate++
          newStats.ambiguous--
        } else {
          updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            status: 'failed',
            error: result.error,
          }
          newStats.failed++
          newStats.ambiguous--
        }

        return {
          ...prev,
          rows: updatedRows,
          stats: { ...newStats, ambiguous: 0 },
        }
      })
    } catch (error) {
      // Update row as failed - useEffect will handle resumption
      setState((prev) => {
        const updatedRows = [...prev.rows]
        const newStats = { ...prev.stats }
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        newStats.failed++
        newStats.ambiguous--

        return {
          ...prev,
          rows: updatedRows,
          stats: { ...newStats, ambiguous: 0 },
        }
      })
    }
  }

  // Handle skip ambiguous
  const handleSkipAmbiguous = (rowIndex: number) => {
    // Update row as skipped - useEffect will handle resumption
    setState((prev) => {
      const updatedRows = [...prev.rows]
      const newStats = { ...prev.stats }
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], status: 'skipped' }
      newStats.skipped++
      newStats.ambiguous--

      return {
        ...prev,
        rows: updatedRows,
        stats: { ...newStats, ambiguous: 0 },
      }
    })
  }

  // Handle new import
  const handleNewImport = () => {
    setState({
      step: 'upload',
      file: null,
      rows: [],
      columnMapping: {},
      listName: 'Imported Places',
      listEmoji: '📍',
      stats: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        ambiguous: 0,
        skipped: 0,
        duplicate: 0,
      },
      isPaused: false,
    })
    setCsvHeaders([])
    setCsvDataRows([])
  }

  // Get current ambiguous row to show in modal
  const currentAmbiguousRow = state.rows.find(
    (row) => row.status === 'ambiguous',
  )
  const currentAmbiguousIndex = currentAmbiguousRow
    ? state.rows.indexOf(currentAmbiguousRow)
    : -1
  const totalAmbiguous = state.rows.filter(
    (row) => row.status === 'ambiguous',
  ).length

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      {state.step === 'upload' && (
        <FileUpload onFileSelect={handleFileSelect} />
      )}

      {state.step === 'preview' && (
        <CsvPreview
          headers={csvHeaders}
          dataRows={csvDataRows}
          listName={state.listName}
          listEmoji={state.listEmoji}
          onListNameChange={(name) =>
            setState((prev) => ({ ...prev, listName: name }))
          }
          onListEmojiChange={(emoji) =>
            setState((prev) => ({ ...prev, listEmoji: emoji }))
          }
          onConfirm={handleConfirmPreview}
          onCancel={() => setState((prev) => ({ ...prev, step: 'upload' }))}
          userCredits={userData?.credits.credits ?? 0}
        />
      )}

      {state.step === 'processing' && (
        <>
          <ProcessingStatus
            stats={state.stats}
            isPaused={state.isPaused}
            error={state.error}
            onPause={() => {
              shouldStopRef.current = true
              setState((prev) => ({ ...prev, isPaused: true }))
            }}
            onResume={() => {
              setState((prev) => ({
                ...prev,
                isPaused: false,
                error: undefined,
              }))
              if (state.listId) {
                startProcessing(state.rows, state.listId)
              }
            }}
            onCancel={() => setState((prev) => ({ ...prev, step: 'summary' }))}
          />
          {currentAmbiguousRow &&
            currentAmbiguousIndex !== -1 &&
            currentAmbiguousRow.predictions &&
            currentAmbiguousRow.predictions.length > 0 && (
              <AmbiguousPlaceModal
                row={currentAmbiguousRow}
                currentIndex={
                  state.rows
                    .filter((r) => r.status === 'ambiguous')
                    .indexOf(currentAmbiguousRow) + 1
                }
                totalAmbiguous={totalAmbiguous}
                onResolve={(placeId) =>
                  handleResolveAmbiguous(currentAmbiguousIndex, placeId)
                }
                onSkip={() => handleSkipAmbiguous(currentAmbiguousIndex)}
              />
            )}
        </>
      )}

      {state.step === 'summary' && state.listId && (
        <ImportSummary
          rows={state.rows}
          stats={state.stats}
          listId={state.listId}
          listName={state.listName}
          onNewImport={handleNewImport}
        />
      )}
    </div>
  )
}
