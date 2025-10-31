import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@tanstack/react-router'
import { CheckCircle, List, XCircle } from 'lucide-react'
import type { CsvRow, ImportStats } from './import'

interface ImportSummaryProps {
  rows: CsvRow[]
  stats: ImportStats
  listId: string
  listName: string
  onNewImport: () => void
}

export const ImportSummary = ({
  rows,
  stats,
  listId,
  listName,
  onNewImport,
}: ImportSummaryProps) => {
  const failedRows = rows.filter((row) => row.status === 'failed')
  const skippedRows = rows.filter((row) => row.status === 'skipped')

  return (
    <div className="flex flex-col space-y-6 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Import Complete!</h2>
        <p className="text-sm text-muted-foreground">
          Your places have been imported to "{listName}"
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                Successfully Added
              </p>
              <p className="text-2xl font-bold">{stats.successful}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                Duplicates Skipped
              </p>
              <p className="text-2xl font-bold">{stats.duplicate}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-sm text-muted-foreground">Skipped</p>
              <p className="text-2xl font-bold">{stats.skipped}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Credits Info */}
      <Card className="p-4 bg-muted">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Processed:</span>
            <span>{stats.processed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Credits Used:</span>
            <span>{stats.successful}</span>
          </div>
        </div>
      </Card>

      {/* Failed Rows Table */}
      {failedRows.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            Failed Rows ({failedRows.length})
          </h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Place Name</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedRows.map((row) => (
                  <TableRow key={row.rowIndex}>
                    <TableCell className="font-medium">
                      {row.rowIndex + 1}
                    </TableCell>
                    <TableCell>{row.placeName || row.placeId}</TableCell>
                    <TableCell className="text-red-600 text-sm">
                      {row.error || 'Unknown error'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Skipped Rows Table */}
      {skippedRows.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            Skipped Rows ({skippedRows.length})
          </h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Place Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skippedRows.map((row) => (
                  <TableRow key={row.rowIndex}>
                    <TableCell className="font-medium">
                      {row.rowIndex + 1}
                    </TableCell>
                    <TableCell>{row.placeName || row.placeId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onNewImport}>
          New Import
        </Button>
        <Button asChild>
          <Link to="/lists/$listId" params={{ listId }}>
            <List className="mr-2 h-4 w-4" />
            View List
          </Link>
        </Button>
      </div>
    </div>
  )
}
