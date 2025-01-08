import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const formattedAddressColumn: ColumnDef<SearchResult> = {
  id: 'formattedAddress',
  accessorKey: 'address.formattedAddress',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Address" />,
  enableSorting: false,
  cell: ({ row }) => {
    const address = row.original.address.formattedAddress
    if (!address) return null

    return (
      <TextWrapper truncate={true} width="150px" copyValue={address}>
        {address}
      </TextWrapper>
    )
  },
}

export const countryColumn: ColumnDef<SearchResult> = {
  id: 'country',
  accessorKey: 'address.country',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Country" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.country}
    </TextWrapper>
  ),
}

export const localityColumn: ColumnDef<SearchResult> = {
  id: 'locality',
  accessorKey: 'address.locality',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="City" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.locality}
    </TextWrapper>
  ),
}

export const sublocalityColumn: ColumnDef<SearchResult> = {
  id: 'sublocality',
  accessorKey: 'address.sublocality',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Sublocality" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.sublocality}
    </TextWrapper>
  ),
}

export const postalCodeColumn: ColumnDef<SearchResult> = {
  id: 'postalCode',
  accessorKey: 'address.postalCode',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Postal Code" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="100px">
      {row.original.address.postalCode}
    </TextWrapper>
  ),
}

export const postalCodeSuffixColumn: ColumnDef<SearchResult> = {
  id: 'postalCodeSuffix',
  accessorKey: 'address.postalCodeSuffix',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Postal Code Suffix" />
  ),
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="100px">
      {row.original.address.postalCodeSuffix}
    </TextWrapper>
  ),
}

export const plusCodeColumn: ColumnDef<SearchResult> = {
  id: 'plusCode',
  accessorKey: 'address.plusCode',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Plus Code" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="100px">
      {row.original.address.plusCode}
    </TextWrapper>
  ),
}

export const streetColumn: ColumnDef<SearchResult> = {
  id: 'street',
  accessorKey: 'address.street',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Street" />,
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="200px">
      {row.original.address.street}
    </TextWrapper>
  ),
}

export const neighborhoodColumn: ColumnDef<SearchResult> = {
  id: 'neighborhood',
  accessorKey: 'address.neighborhood',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Neighborhood" />
  ),
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.neighborhood}
    </TextWrapper>
  ),
}

export const administrativeAreaLevel1Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel1',
  accessorKey: 'address.administrativeAreaLevel1',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Administrative Area Level 1" />
  ),
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.administrativeAreaLevel1}
    </TextWrapper>
  ),
}

export const administrativeAreaLevel2Column: ColumnDef<SearchResult> = {
  id: 'administrativeAreaLevel2',
  accessorKey: 'address.administrativeAreaLevel2',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Administrative Area Level 2" />
  ),
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.address.administrativeAreaLevel2}
    </TextWrapper>
  ),
}
