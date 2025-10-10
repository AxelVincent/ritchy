import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { createTextColumn } from './utils/createTextColumn'

export const formattedAddressColumn: ColumnDef<SearchResult> = createTextColumn(
  {
    id: 'formattedAddress',
    accessorKey: 'address.formattedAddress',
    title: 'Address',
    size: 200,
    filterVariant: 'text',
    enableSorting: false,
  },
)

export const countryColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'country',
  accessorKey: 'address.country',
  title: 'Country',
  size: 200,
  filterVariant: 'multi-select',
})

export const localityColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'City',
  accessorKey: 'address.locality',
  title: 'City',
  size: 200,
  filterVariant: 'multi-select',
})

export const sublocalityColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'sublocality',
  accessorKey: 'address.sublocality',
  title: 'Sublocality',
  size: 200,
  filterVariant: 'multi-select',
})

export const postalCodeColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'postalCode',
  accessorKey: 'address.postalCode',
  title: 'Postal Code',
  size: 200,
  filterVariant: 'multi-select',
})

export const postalCodeSuffixColumn: ColumnDef<SearchResult> = createTextColumn(
  {
    id: 'postalCodeSuffix',
    accessorKey: 'address.postalCodeSuffix',
    title: 'Postal Code Suffix',
    size: 200,
    filterVariant: 'multi-select',
  },
)

export const plusCodeColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'plusCode',
  accessorKey: 'address.plusCode',
  title: 'Plus Code',
  size: 200,
  filterVariant: 'multi-select',
})

export const streetColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'street',
  accessorKey: 'address.street',
  title: 'Street',
  size: 200,
  filterVariant: 'text',
})

export const neighborhoodColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'neighborhood',
  accessorKey: 'address.neighborhood',
  title: 'Neighborhood',
  size: 200,
  filterVariant: 'multi-select',
})

export const administrativeAreaLevel1Column: ColumnDef<SearchResult> =
  createTextColumn({
    id: 'administrativeAreaLevel1',
    accessorKey: 'address.administrativeAreaLevel1',
    title: 'Administ. Area Level 1',
    size: 200,
    filterVariant: 'multi-select',
  })

export const administrativeAreaLevel2Column: ColumnDef<SearchResult> =
  createTextColumn({
    id: 'administrativeAreaLevel2',
    accessorKey: 'address.administrativeAreaLevel2',
    title: 'Administ. Area Level 2',
    size: 200,
    filterVariant: 'multi-select',
  })

export const administrativeAreaLevel3Column: ColumnDef<SearchResult> =
  createTextColumn({
    id: 'administrativeAreaLevel3',
    accessorKey: 'address.administrativeAreaLevel3',
    title: 'Administ. Area Level 3',
    size: 200,
    filterVariant: 'multi-select',
  })
