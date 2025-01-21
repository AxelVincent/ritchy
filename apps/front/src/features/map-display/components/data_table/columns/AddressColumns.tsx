import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const formattedAddressColumn: ColumnDef<SearchResult> = {
  id: 'formattedAddress',
  accessorKey: 'address.formattedAddress',
  size: 150,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Address" width="150px" />
  ),
  enableSorting: false,
  cell: ({ row, table }) => {
    const address = row.original.address.formattedAddress
    if (!address) return null

    return <ColumnPinCopyCell row={row} table={table} content={address} />
  },
}

export const countryColumn: ColumnDef<SearchResult> = {
  id: 'country',
  accessorKey: 'address.country',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Country" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.country}
    />
  ),
}

export const localityColumn: ColumnDef<SearchResult> = {
  id: 'locality',
  accessorKey: 'address.locality',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="City" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.locality}
    />
  ),
}

export const sublocalityColumn: ColumnDef<SearchResult> = {
  id: 'sublocality',
  accessorKey: 'address.sublocality',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Sublocality" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.sublocality}
    />
  ),
}

export const postalCodeColumn: ColumnDef<SearchResult> = {
  id: 'postalCode',
  accessorKey: 'address.postalCode',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Postal Code" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.postalCode}
    />
  ),
}

export const postalCodeSuffixColumn: ColumnDef<SearchResult> = {
  id: 'postalCodeSuffix',
  accessorKey: 'address.postalCodeSuffix',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Postal Code Suffix" />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.postalCodeSuffix}
    />
  ),
}

export const plusCodeColumn: ColumnDef<SearchResult> = {
  id: 'plusCode',
  accessorKey: 'address.plusCode',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Plus Code" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.plusCode}
    />
  ),
}

export const streetColumn: ColumnDef<SearchResult> = {
  id: 'street',
  accessorKey: 'address.street',
  size: 150,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Street" />,
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.street}
    />
  ),
}

export const neighborhoodColumn: ColumnDef<SearchResult> = {
  id: 'neighborhood',
  accessorKey: 'address.neighborhood',
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Neighborhood" />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.neighborhood}
    />
  ),
}

export const administrativeAreaLevel1Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel1',
  accessorKey: 'address.administrativeAreaLevel1',
  size: 250,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper
      column={column}
      title="Administrative Area Level 1"
      width="250px"
    />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.administrativeAreaLevel1}
    />
  ),
}

export const administrativeAreaLevel2Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel2',
  accessorKey: 'address.administrativeAreaLevel2',
  size: 250,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper
      column={column}
      title="Administrative Area Level 2"
      width="250px"
    />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.administrativeAreaLevel2}
    />
  ),
}

export const administrativeAreaLevel3Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel3',
  accessorKey: 'address.administrativeAreaLevel3',
  size: 250,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper
      column={column}
      title="Administrative Area Level 3"
      width="250px"
    />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCopyCell
      row={row}
      table={table}
      content={row.original.address.administrativeAreaLevel3}
    />
  ),
}

export const addressComponentsColumn: ColumnDef<SearchResult> = {
  id: 'addressComponents',
  accessorKey: 'address.addressComponents',
  size: 250,
  enableSorting: false,
  enableColumnFilter: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Address Components" width="250px" />
  ),
  cell: ({ row, table }) => {
    const components = row.original.addressComponents
    if (!components?.length) return null

    return (
      <ColumnPinCopyCell
        row={row}
        table={table}
        content={row.original.address.administrativeAreaLevel3}
      />
    )
  },
}
