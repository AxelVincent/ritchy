import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
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

    return (
      <TextWrapper
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
          {
            icon: 'Copy',
            onClick: () => {
              navigator.clipboard.writeText(row.original.displayName)
              toast({
                title: row.original.displayName,
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        {address}
      </TextWrapper>
    )
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.country}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.locality}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.sublocality}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.postalCode}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.postalCodeSuffix}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.plusCode}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.street}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.neighborhood}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.administrativeAreaLevel1}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.administrativeAreaLevel2}
    </TextWrapper>
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
    <TextWrapper
      actions={[
        {
          icon: 'MapPinned',
          onClick: () => {
            table.options.meta?.setSelectedPlaceId?.(row.original.id)
          },
          label: 'Pin to map',
        },
        {
          icon: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(row.original.displayName)
            toast({
              title: row.original.displayName,
              description: 'Copied to clipboard',
            })
          },
          label: 'Copy',
        },
      ]}
    >
      {row.original.address.administrativeAreaLevel3}
    </TextWrapper>
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
      <TextWrapper
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
          {
            icon: 'Copy',
            onClick: () => {
              navigator.clipboard.writeText(row.original.displayName)
              toast({
                title: row.original.displayName,
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {`${components.length} components`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Address Components</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {components.map((component) => (
                <div
                  key={component.longText}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <span className="text-sm font-medium">
                    {component.longText}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {component.types?.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
