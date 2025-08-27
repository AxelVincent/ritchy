import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const formattedAddressColumn: ColumnDef<SearchResult> = {
  id: 'formattedAddress',
  accessorKey: 'address.formattedAddress',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Address" />,
  enableSorting: false,
  cell: ({ row }) => {
    const address = row.original.address.formattedAddress
    if (!address) return null

    return <ColumnPinCopyCell id={row.original.id} content={address} />
  },
}

export const countryColumn: ColumnDef<SearchResult> = {
  id: 'country',
  accessorKey: 'address.country',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Country" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.country ?? null}
    />
  ),
}

export const localityColumn: ColumnDef<SearchResult> = {
  id: 'City',
  accessorKey: 'address.locality',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="City" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.locality ?? null}
    />
  ),
}

export const sublocalityColumn: ColumnDef<SearchResult> = {
  id: 'sublocality',
  accessorKey: 'address.sublocality',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Sublocality" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.sublocality ?? null}
    />
  ),
}

export const postalCodeColumn: ColumnDef<SearchResult> = {
  id: 'postalCode',
  accessorKey: 'address.postalCode',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Postal Code" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.postalCode ?? null}
    />
  ),
}

export const postalCodeSuffixColumn: ColumnDef<SearchResult> = {
  id: 'postalCodeSuffix',
  accessorKey: 'address.postalCodeSuffix',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Postal Code Suffix" />
  ),
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.postalCodeSuffix ?? null}
    />
  ),
}

export const plusCodeColumn: ColumnDef<SearchResult> = {
  id: 'plusCode',
  accessorKey: 'address.plusCode',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Plus Code" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.plusCode ?? null}
    />
  ),
}

export const streetColumn: ColumnDef<SearchResult> = {
  id: 'street',
  accessorKey: 'address.street',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Street" />,
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.street ?? null}
    />
  ),
}

export const neighborhoodColumn: ColumnDef<SearchResult> = {
  id: 'neighborhood',
  accessorKey: 'address.neighborhood',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Neighborhood" />
  ),
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.neighborhood ?? null}
    />
  ),
}

export const administrativeAreaLevel1Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel1',
  accessorKey: 'address.administrativeAreaLevel1',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Administ. Area Level 1" />
  ),
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.administrativeAreaLevel1 ?? null}
    />
  ),
}

export const administrativeAreaLevel2Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel2',
  accessorKey: 'address.administrativeAreaLevel2',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Administ. Area Level 2" />
  ),
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.administrativeAreaLevel2 ?? null}
    />
  ),
}

export const administrativeAreaLevel3Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel3',
  accessorKey: 'address.administrativeAreaLevel3',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Administ. Area Level 3" />
  ),
  cell: ({ row }) => (
    <ColumnPinCopyCell
      id={row.original.id}
      content={row.original.address.administrativeAreaLevel3 ?? null}
    />
  ),
}
