import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { Separator } from '@/components/ui/separator'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertTriangle, ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CREDIT_COST_PER_ENRICHMENT,
  ENRICHMENT_FEATURES,
  TEST_SIZE,
} from './constants'

interface PreviewRow {
  name: string
  address: string
  type: string
}

interface EnrichmentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemCount: number
  currentCredits: number
  onConfirm: (mode: 'test' | 'full') => void
  isProcessing: boolean
  previewRows: PreviewRow[]
}

export const EnrichmentConfirmDialog = ({
  open,
  onOpenChange,
  itemCount,
  currentCredits,
  onConfirm,
  isProcessing,
  previewRows,
}: EnrichmentConfirmDialogProps) => {
  const fullCost = itemCount * CREDIT_COST_PER_ENRICHMENT
  const testCost = Math.min(TEST_SIZE, itemCount) * CREDIT_COST_PER_ENRICHMENT
  const remainingAfterFull = currentCredits - fullCost
  // Fix division by zero
  const creditsUsagePercentage =
    currentCredits > 0 ? (fullCost / currentCredits) * 100 : 100
  const hasEnoughCreditsForFull = currentCredits >= fullCost
  const hasEnoughCreditsForTest = currentCredits >= testCost
  const isHighCostOperation = creditsUsagePercentage > 20
  const canShowTestOption = itemCount > TEST_SIZE && hasEnoughCreditsForTest
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Calculate credit deficit for better UX
  const creditDeficit = hasEnoughCreditsForFull ? 0 : fullCost - currentCredits

  // TanStack Table columns
  const columns = useMemo<ColumnDef<PreviewRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => (
          <div className="text-xs font-medium truncate max-w-[180px]">
            {getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 100,
        cell: ({ getValue }) => (
          <Badge variant="outline">{getValue() as string}</Badge>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ getValue }) => (
          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            {getValue() as string}
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: previewRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Determine credit status color
  const getCreditStatusColor = () => {
    if (!hasEnoughCreditsForFull) return 'text-destructive'
    if (isHighCostOperation) return 'text-yellow-600'
    return 'text-green-600'
  }

  // Get progress bar color
  const getProgressBarColor = () => {
    if (!hasEnoughCreditsForFull) return 'bg-destructive'
    if (isHighCostOperation) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Enrich {itemCount} Place{itemCount === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Unlock comprehensive company data and decision-maker contacts for
            your selected prospects
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
          {/* Cost Summary Card - More Prominent */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">Total Cost</div>
                <div className="text-xs text-muted-foreground">
                  {itemCount} place{itemCount === 1 ? '' : 's'} ×{' '}
                  {CREDIT_COST_PER_ENRICHMENT} credits
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getCreditStatusColor()}`}>
                  {fullCost.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">credits</div>
              </div>
            </div>

            {/* Credit Usage Progress Bar */}
            {currentCredits > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Credit Usage</span>
                  <span className={getCreditStatusColor()}>
                    {creditsUsagePercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className={`h-full transition-all ${getProgressBarColor()}`}
                    style={{
                      width: `${Math.min(creditsUsagePercentage, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Current: {currentCredits.toLocaleString()} credits
                  </span>
                  {hasEnoughCreditsForFull && (
                    <span className="text-muted-foreground">
                      Remaining:{' '}
                      <span className="font-medium">
                        {remainingAfterFull.toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Insufficient Credits Warning */}
            {!hasEnoughCreditsForFull && (
              <div
                className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Insufficient Credits</p>
                    <p>
                      You need{' '}
                      <span className="font-semibold">
                        {creditDeficit.toLocaleString()} more credits
                      </span>{' '}
                      to enrich all selected places. Please{' '}
                      <Link
                        to="/pricing"
                        className="font-semibold underline underline-offset-2 hover:no-underline"
                        onClick={() => onOpenChange(false)}
                      >
                        upgrade your plan
                      </Link>{' '}
                      or reduce the selection.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* High Cost Warning */}
            {hasEnoughCreditsForFull && isHighCostOperation && (
              <div
                className="mt-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Large Selection Detected</p>
                    <p>
                      This will use {creditsUsagePercentage.toFixed(0)}% of your
                      available credits. Consider being selective and enriching
                      only your highest-priority prospects first.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enrichment Benefits - Prominent Display */}
          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-foreground">
                Enrichment Benefits
              </h3>
            </div>
            <ul className="space-y-2">
              {ENRICHMENT_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Helpful Tip - Always Visible */}
          <div className="rounded-lg border border-blue-200/50 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-950/20 p-3 text-xs">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <p className="text-foreground">
                <span className="font-medium">Pro Tip:</span> Enrich prospects
                individually using the{' '}
                <Sparkles className="inline h-3 w-3 align-middle mx-0.5 text-blue-600 dark:text-blue-400" />{' '}
                button in each row to focus on your highest-value targets.
              </p>
            </div>
          </div>

          {/* Accordion for Additional Details */}
          <Accordion type="multiple" className="mb-2" defaultValue={[]}>
            <AccordionItem value="breakdown">
              <AccordionTrigger className="text-sm">
                Detailed credit breakdown
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Places to enrich:
                    </span>
                    <span className="font-mono font-medium">{itemCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Cost per place:
                    </span>
                    <span className="font-mono font-medium">
                      {CREDIT_COST_PER_ENRICHMENT} credits
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total cost:</span>
                    <span className="font-mono font-bold">
                      {fullCost.toLocaleString()} credits
                    </span>
                  </div>
                  {hasEnoughCreditsForFull && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          After enrichment:
                        </span>
                        <span className="font-mono font-medium">
                          {remainingAfterFull.toLocaleString()} credits
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Preview Section - Improved UX */}
          {previewRows.length > 0 && (
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                aria-expanded={isPreviewOpen}
                aria-controls="preview-table"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1 py-0.5"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    isPreviewOpen ? 'rotate-180' : ''
                  }`}
                />
                Preview{' '}
                {previewRows.length < itemCount && (
                  <span className="text-muted-foreground">
                    (first {previewRows.length} of {itemCount})
                  </span>
                )}
              </button>
              {isPreviewOpen && (
                <div
                  id="preview-table"
                  className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="rounded-md border overflow-hidden">
                    <div className="max-h-[200px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b">
                              {headerGroup.headers.map((header) => (
                                <th
                                  key={header.id}
                                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody>
                          {table.getRowModel().rows.map((row, idx) => (
                            <tr
                              key={row.id}
                              className={`border-b last:border-0 transition-colors ${
                                idx % 2 === 0
                                  ? 'bg-background hover:bg-muted/30'
                                  : 'bg-muted/10 hover:bg-muted/40'
                              }`}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-3 py-2">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {itemCount > previewRows.length && (
                    <div className="text-[10px] text-muted-foreground text-center py-1">
                      + {itemCount - previewRows.length} more place
                      {itemCount - previewRows.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty Preview State */}
          {previewRows.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground pb-2">
              No preview available
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-background">
          {/* Buttons Container - Side by Side When Both Visible */}
          <div className="flex gap-3 w-full min-w-0">
            {/* Test Button - Primary */}
            {canShowTestOption && (
              <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
                <Button
                  onClick={() => onConfirm('test')}
                  disabled={isProcessing || !hasEnoughCreditsForTest}
                  className="w-full"
                  variant="outline"
                  size="lg"
                  aria-label={`Enrich first ${TEST_SIZE} places for ${testCost} credits`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 shrink-0" />
                      Enrich First {TEST_SIZE} Places
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {testCost} credits
                </span>
              </div>
            )}

            {/* Enrich All Button - Secondary */}
            <div
              className={`${canShowTestOption ? 'flex-1' : 'w-full'} min-w-0 flex flex-col items-center gap-1.5`}
            >
              <Button
                onClick={() => onConfirm('full')}
                disabled={isProcessing || !hasEnoughCreditsForFull}
                className="w-full"
                size="lg"
                aria-label={`Enrich all ${itemCount} places for ${fullCost} credits`}
                aria-describedby={
                  !hasEnoughCreditsForFull
                    ? 'insufficient-credits-warning'
                    : undefined
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 shrink-0" />
                    Enrich All Selected
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                {fullCost.toLocaleString()} credits
              </span>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
