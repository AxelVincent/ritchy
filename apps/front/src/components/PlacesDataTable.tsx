import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import type { PlaceResult } from '@ritchy/types/places'

const columns: ColumnDef<PlaceResult>[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	},
	{
		accessorKey: 'business_status',
		header: 'Business Status'
	},
	{
		accessorKey: 'formatted_address',
		header: 'Formatted Address'
	},
	{
		accessorKey: 'geometry.location',
		header: 'Location',
		cell: ({ row }) => {
			const location = row.original.geometry.location
			return `${location.lat}, ${location.lng}`
		}
	},
	{
		accessorKey: 'icon',
		header: 'Icon'
	},
	{
		accessorKey: 'icon_background_color',
		header: 'Icon Background Color'
	},
	{
		accessorKey: 'icon_mask_base_uri',
		header: 'Icon Mask Base URI'
	},
	{
		accessorKey: 'opening_hours.open_now',
		header: 'Open Now',
		cell: ({ row }) => (row.original.opening_hours?.open_now ? 'Yes' : 'No')
	},
	{
		accessorKey: 'photos',
		header: 'Photos',
		cell: ({ row }) => `${row.original.photos?.length ?? 0} photos`
	},
	{
		accessorKey: 'place_id',
		header: 'Place ID'
	},
	{
		accessorKey: 'plus_code',
		header: 'Plus Code',
		cell: ({ row }) => {
			const plusCode = row.original.plus_code
			return `${plusCode.global_code} (${plusCode.compound_code})`
		}
	},
	{
		accessorKey: 'price_level',
		header: 'Price Level'
	},
	{
		accessorKey: 'rating',
		header: 'Rating'
	},
	{
		accessorKey: 'reference',
		header: 'Reference'
	},
	{
		accessorKey: 'types',
		header: 'Types',
		cell: ({ row }) => row.original.types.join(', ')
	},
	{
		accessorKey: 'user_ratings_total',
		header: 'User Ratings Total'
	}
]

interface PlacesDataTableProps {
	places: PlaceResult[]
	onPlaceClick: (place: PlaceResult) => void
	selectedPlace: string | null
}

export function PlacesDataTable({
	places,
	onPlaceClick,
	selectedPlace
}: PlacesDataTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	)
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})

	const table = useReactTable({
		data: places,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnFilters,
			columnVisibility
		}
	})

	return (
		<div className="w-full">
			<div className="flex items-center py-4">
				<Input
					placeholder="Filter names..."
					value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
					onChange={(event) =>
						table.getColumn('name')?.setFilterValue(event.target.value)
					}
					className="max-w-sm"
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="ml-auto">
							Columns <ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{table
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => {
								return (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) =>
											column.toggleVisibility(!!value)
										}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								)
							})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									onClick={() => onPlaceClick(row.original)}
									className={`cursor-pointer ${
										selectedPlace === row.original.place_id ? 'bg-blue-50' : ''
									}`}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="flex-1 text-sm text-muted-foreground">
					{table.getFilteredSelectedRowModel().rows.length} of{' '}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
				<div className="space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}
