import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertCircle, CheckCircle2, ChevronRight, FileUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ColumnMapping } from './import'

interface CsvPreviewProps {
  headers: string[]
  dataRows: string[][]
  listName: string
  listEmoji: string
  onListNameChange: (name: string) => void
  onListEmojiChange: (emoji: string) => void
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
  userCredits: number
}

export const CsvPreview = ({
  headers,
  dataRows,
  listName,
  listEmoji,
  onListNameChange,
  onListEmojiChange,
  onConfirm,
  onCancel,
  userCredits,
}: CsvPreviewProps) => {
  const [columnType, setColumnType] = useState<'name' | 'placeId'>('name')
  const [selectedColumn, setSelectedColumn] = useState<string>(headers[0] || '')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  const totalRows = dataRows.length
  const hasEnoughCredits = userCredits >= totalRows
  const selectedColumnIndex = headers.indexOf(selectedColumn)

  const handleConfirm = () => {
    const mapping: ColumnMapping = {}

    if (columnType === 'name') {
      mapping.nameColumn = selectedColumn
    } else {
      mapping.placeIdColumn = selectedColumn
    }

    onConfirm(mapping)
  }

  // Prepare data for TanStack Table (first 5 rows)
  const previewData = useMemo(
    () =>
      dataRows.slice(0, 5).map((row, idx) => ({
        _rowNum: idx + 1,
        ...Object.fromEntries(
          headers.map((header, i) => [header, row[i] || '']),
        ),
      })),
    [dataRows, headers],
  )

  // Create columns for TanStack Table
  const columns = useMemo<ColumnDef<Record<string, string | number>>[]>(
    () => [
      {
        accessorKey: '_rowNum',
        header: '#',
        size: 50,
        cell: ({ getValue }: { getValue: () => unknown }) => (
          <div className="font-mono text-xs text-muted-foreground">
            {getValue() as number}
          </div>
        ),
      },
      ...headers.map((header, idx) => ({
        accessorKey: header,
        header: () => (
          <div className="flex items-center gap-2">
            {idx === selectedColumnIndex && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
            )}
            <span className={idx === selectedColumnIndex ? 'font-bold' : ''}>
              {header || '(empty)'}
            </span>
          </div>
        ),
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue() as string
          const truncatedValue =
            value?.length > 50 ? `${value.slice(0, 50)}...` : value
          return (
            <div
              className={
                idx === selectedColumnIndex
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }
              title={value} // Show full text on hover
            >
              {truncatedValue || (
                <span className="text-muted-foreground/50">(empty)</span>
              )}
            </div>
          )
        },
      })),
    ],
    [headers, selectedColumnIndex],
  )

  const table = useReactTable({
    data: previewData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Configure Import
            </h2>
            <p className="text-sm text-muted-foreground">
              Review and configure your CSV import settings
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* List Settings Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">List Settings</CardTitle>
              <CardDescription>Configure your new list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                {/* Emoji Picker */}
                <div className="grid gap-1.5">
                  <Label>Emoji</Label>
                  <Popover
                    open={isEmojiPickerOpen}
                    onOpenChange={setIsEmojiPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-9 h-9 text-lg"
                      >
                        <span>{listEmoji}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-1"
                      side="right"
                      align="start"
                      sideOffset={4}
                    >
                      <EmojiPicker
                        className="flex flex-col emoji-picker-container w-full"
                        onEmojiSelect={({ emoji }) => {
                          onListEmojiChange(emoji)
                          setIsEmojiPickerOpen(false)
                        }}
                      >
                        <EmojiPickerSearch />
                        <div className="flex-1 min-h-0 emoji-picker-viewport">
                          <EmojiPickerContent />
                        </div>
                        <EmojiPickerFooter />
                      </EmojiPicker>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* List Name Input */}
                <div className="grid gap-1.5 flex-1">
                  <Label htmlFor="listName" className="ml-2">
                    Name
                  </Label>
                  <Input
                    id="listName"
                    placeholder="e.g., NYC Restaurants"
                    value={listName}
                    onChange={(e) => onListNameChange(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Column Mapping
              </CardTitle>
              <CardDescription>
                Select which column to import from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={columnType === 'name' ? 'default' : 'outline'}
                    className="h-auto flex-col gap-1 py-3"
                    onClick={() => setColumnType('name')}
                  >
                    <span className="text-xs font-medium">Place Name</span>
                  </Button>
                  <Button
                    variant={columnType === 'placeId' ? 'default' : 'outline'}
                    className="h-auto flex-col gap-1 py-3"
                    onClick={() => setColumnType('placeId')}
                  >
                    <span className="text-xs font-medium">Place ID</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="columnSelect">Select Column</Label>
                <Select
                  value={selectedColumn}
                  onValueChange={setSelectedColumn}
                >
                  <SelectTrigger id="columnSelect" className="font-medium">
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header) => (
                      <SelectItem
                        key={header}
                        value={header}
                        className="font-medium"
                      >
                        {header || '(empty header)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                {columnType === 'name' ? (
                  <p>
                    Place names will be searched using Google Autocomplete.
                    Unique results will be added automatically.
                  </p>
                ) : (
                  <p>
                    Google Place IDs (format: ChIJ...) will be imported directly
                    without search.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credits Card */}
          <Card
            className={
              hasEnoughCredits ? 'border-green-200' : 'border-destructive'
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {hasEnoughCredits ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                Credits Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total rows:</span>
                <span className="font-mono font-medium">{totalRows}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits required:</span>
                <span className="font-mono font-medium">{totalRows}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="font-medium">Available credits:</span>
                <span
                  className={`font-mono font-bold ${
                    hasEnoughCredits ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {userCredits}
                </span>
              </div>

              {!hasEnoughCredits && (
                <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                  <p className="font-medium mb-1">Insufficient Credits</p>
                  <p>
                    You need {totalRows - userCredits} more credits. Please
                    upgrade your plan to continue.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Data Preview</CardTitle>
                  <CardDescription>
                    Showing first 5 of {totalRows} rows
                    {selectedColumn && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <ChevronRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          "{selectedColumn}" selected
                        </span>
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="outline">{headers.length} columns</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                          key={headerGroup.id}
                          className="border-b bg-muted/50"
                        >
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className={`px-4 py-3 text-left text-sm font-medium ${
                                header.column.id !== '_rowNum' &&
                                headers.indexOf(header.column.id) ===
                                  selectedColumnIndex
                                  ? 'bg-primary/10'
                                  : ''
                              }`}
                              style={{ width: header.getSize() }}
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
                          className={`border-b transition-colors hover:bg-muted/50 ${
                            idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className={`px-4 py-3 text-sm ${
                                cell.column.id !== '_rowNum' &&
                                headers.indexOf(cell.column.id) ===
                                  selectedColumnIndex
                                  ? 'bg-primary/5'
                                  : ''
                              }`}
                            >
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

              {totalRows > 5 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  + {totalRows - 5} more rows will be imported
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!hasEnoughCredits || !listName.trim() || !selectedColumn}
          size="lg"
          className="gap-2"
        >
          Start Import
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
