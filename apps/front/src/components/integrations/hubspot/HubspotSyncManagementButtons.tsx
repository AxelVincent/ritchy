import { useHubspotStatus } from '@/api/queries/integrations/hubspot/oauth'
import { HubspotSyncItemsDialog } from '@/components/integrations/hubspot/HubspotSyncItemsDialog'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Upload } from 'lucide-react'
import { useState } from 'react'

interface HubspotSyncManagementButtonsProps<TData extends SearchResult> {
  table: Table<TData>
}

export const HubspotSyncManagementButtons = <TData extends SearchResult>({
  table,
}: HubspotSyncManagementButtonsProps<TData>) => {
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const { data: hubspotStatus } = useHubspotStatus()

  // If HubSpot is not connected, don't render anything
  if (hubspotStatus !== 'connected') {
    return null
  }

  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const filteredRows = table.getFilteredRowModel().rows

  if (hasSelectedRows) {
    return (
      <>
        <HubspotSyncItemsDialog
          open={showSyncDialog}
          onOpenChange={setShowSyncDialog}
          selectedItems={selectedRows.map((row) => ({
            userPlaceId: row.original.id,
          }))}
        />
        <Button variant="default" onClick={() => setShowSyncDialog(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Sync {selectedRows.length} lead{selectedRows.length === 1 ? '' : 's'}{' '}
          to HubSpot
        </Button>
      </>
    )
  }

  // Show "Sync All" when no rows are selected
  return (
    <>
      <HubspotSyncItemsDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        selectedItems={filteredRows.map((row) => ({
          userPlaceId: row.original.id,
        }))}
      />
      <Button variant="default" onClick={() => setShowSyncDialog(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Sync {filteredRows.length} lead{filteredRows.length === 1 ? '' : 's'} to
        HubSpot
      </Button>
    </>
  )
}
