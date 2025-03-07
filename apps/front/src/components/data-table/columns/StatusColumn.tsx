import { StatusDropdown } from '@/components/status/status-dropdown'
import { getStatusLabel } from '@/components/status/status-label'
import { useMapStore } from '@/features/map-display/store/useMapStore'
import type { SearchResult, StatusType } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import posthog from 'posthog-js'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const statusColumn: ColumnDef<SearchResult> = {
  id: 'status',
  accessorKey: 'status',
  accessorFn: (row) => {
    const status = row.status?.status || 'NEW'
    return getStatusLabel(status)
  },
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Status" />,
  cell: ({ row, table }) => {
    const updatePlaceStatus = useMapStore((state) => state.updatePlaceStatus)

    const handleStatusChange = (newStatus: StatusType) => {
      posthog.capture('change_place_status', {
        property: 'value',
        place_id: row.original.id,
        new_status: newStatus,
      })
      // Access the setData function from table meta
      const setData = table.options.meta?.setData

      if (setData) {
        // Update the data immutably
        setData((prevData: SearchResult[]) => {
          return prevData.map((item) => {
            if (item.id === row.original.id) {
              // Create a new object with the updated status
              return {
                ...item,
                status: {
                  ...item.status,
                  status: newStatus,
                },
              }
            }
            return item
          })
        })

        // Update the place status in the store
        // This will update both the status map and the places array
        updatePlaceStatus(row.original.id, newStatus)
      }
    }

    return (
      <ColumnPinCell
        row={row}
        table={table}
        content={
          <StatusDropdown
            placeId={row.original.id}
            currentStatus={row.original.status?.status || 'NEW'}
            onStatusChange={handleStatusChange}
          />
        }
      />
    )
  },
}
