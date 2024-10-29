'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable
} from '@tanstack/react-table'
import {
	Bed,
	Briefcase,
	Building,
	Coffee,
	Globe,
	GraduationCap,
	HeartPulse,
	Home,
	Landmark,
	Mail,
	Map as MapIcon,
	MapPin,
	Phone,
	ShoppingBag,
	ShoppingCart,
	Star,
	TreePalm,
	UtensilsCrossed
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup
} from './ui/resizable'

interface Place {
	name: string
	id: string
	types: string[]
	nationalPhoneNumber: string
	internationalPhoneNumber: string
	formattedAddress: string
	location: Location
	rating: number
	googleMapsUri: string
	websiteUri: string
	businessStatus: string
	userRatingCount: number
	primaryType: string
	shortFormattedAddress: string
}

interface Location {
	latitude: number
	longitude: number
}

const center = {
	lat: 40.7128,
	lng: -74.006
}

const placeholderData: Place[] = [
	// {
	//   name: "Central Park",
	//   id: "1",
	//   types: ["park", "tourist_attraction"],
	//   nationalPhoneNumber: "(212) 310-6600",
	//   internationalPhoneNumber: "+1 212-310-6600",
	//   formattedAddress: "Central Park, New York, NY, USA",
	//   location: { latitude: 40.7829, longitude: -73.9654 },
	//   rating: 4.8,
	//   googleMapsUri: "https://maps.google.com/?cid=11237658856807780687",
	//   websiteUri: "https://www.centralparknyc.org/",
	//   businessStatus: "OPERATIONAL",
	//   userRatingCount: 233101,
	//   primaryType: "park",
	//   shortFormattedAddress: "New York, NY, USA"
	// },
	// {
	//   name: "Empire State Building",
	//   id: "2",
	//   types: ["tourist_attraction", "landmark"],
	//   nationalPhoneNumber: "(212) 736-3100",
	//   internationalPhoneNumber: "+1 212-736-3100",
	//   formattedAddress: "20 W 34th St, New York, NY 10001, USA",
	//   location: { latitude: 40.7484, longitude: -73.9857 },
	//   rating: 4.7,
	//   googleMapsUri: "https://maps.google.com/?cid=15074921902713971043",
	//   websiteUri: "https://www.esbnyc.com/",
	//   businessStatus: "OPERATIONAL",
	//   userRatingCount: 79088,
	//   primaryType: "tourist_attraction",
	//   shortFormattedAddress: "20 W 34th St, New York, NY 10001"
	// },
	// {
	//   name: "Statue of Liberty",
	//   id: "3",
	//   types: ["tourist_attraction", "landmark"],
	//   nationalPhoneNumber: "(212) 363-3200",
	//   internationalPhoneNumber: "+1 212-363-3200",
	//   formattedAddress: "New York, NY 10004, USA",
	//   location: { latitude: 40.6892, longitude: -74.0445 },
	//   rating: 4.7,
	//   googleMapsUri: "https://maps.google.com/?cid=5463924558306935135",
	//   websiteUri: "https://www.nps.gov/stli/",
	//   businessStatus: "OPERATIONAL",
	//   userRatingCount: 78544,
	//   primaryType: "tourist_attraction",
	//   shortFormattedAddress: "New York, NY 10004"
	// }
]

const generateColdEmail = (place: Place): string => {
	return `
Subject: Enhancing ${place.name}'s ${place.primaryType} Operations

Dear ${place.name} Team,

I hope this email finds you well. My name is [Your Name] from [Your Company], and I recently came across ${place.name} while researching innovative businesses in the ${place.primaryType} sector.

Given your company's impressive presence at ${place.shortFormattedAddress} and your current rating of ${place.rating} stars from ${place.userRatingCount} reviews, I believe our solutions could significantly contribute to your continued success.

Our services have helped similar ${place.primaryType} businesses:
1. Increase customer satisfaction scores by 25%
2. Improve operational efficiency by 20%
3. Boost online visibility and ratings

I'd love the opportunity to discuss how we can tailor our solutions to ${place.name}'s specific needs and goals. Would you be available for a brief 15-minute call next week to explore this further?

Thank you for your time, and I look forward to potentially working together.

Best regards,
[Your Name]
[Your Company]
[Your Contact Information]

P.S. I noticed your business status is currently "${place.businessStatus}". With our solutions, we're confident we can help you optimize your operations and potentially improve this status.
  `.trim()
}

const iconRegistry: { [key: string]: string } = {
	default: 'map-pin',
	park: 'tree',
	tourist_attraction: 'landmark',
	restaurant: 'utensils-crossed',
	cafe: 'coffee',
	store: 'shopping-bag',
	shopping_mall: 'shopping-cart',
	locality: 'home',
	sublocality: 'map',
	neighborhood: 'map',
	premise: 'building',
	business: 'briefcase',
	school: 'graduation-cap',
	health: 'heartbeat',
	lodging: 'bed'
}

function getIconForType(type: string): string {
	return iconRegistry[type] || iconRegistry.default
}

const renderIcon = (iconName: string) => {
	const IconComponent =
		{
			'map-pin': MapPin,
			tree: TreePalm,
			landmark: Landmark,
			'utensils-crossed': UtensilsCrossed,
			coffee: Coffee,
			'shopping-bag': ShoppingBag,
			'shopping-cart': ShoppingCart,
			home: Home,
			map: MapIcon,
			building: Building,
			briefcase: Briefcase,
			'graduation-cap': GraduationCap,
			heartbeat: HeartPulse,
			bed: Bed
		}[iconName] || MapPin

	return <IconComponent className="w-4 h-4 mr-2" />
}

// Add this new type definition
type PlaceColumn = ColumnDef<Place>

// Add this columns configuration
const columns: PlaceColumn[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	},
	{
		accessorKey: 'shortFormattedAddress',
		header: 'Address'
	},
	{
		accessorKey: 'primaryType',
		header: 'Type',
		cell: ({ row }) => {
			const type = row.getValue('primaryType') as string
			return (
				<div className="flex items-center">
					{renderIcon(getIconForType(type))}
					<span>{type}</span>
				</div>
			)
		}
	},
	{
		accessorKey: 'rating',
		header: 'Rating',
		cell: ({ row }) => {
			const rating = Number.parseFloat(row.getValue('rating'))
			const userRatingCount = row.original.userRatingCount
			return (
				<div className="flex items-center">
					<Star className="w-4 h-4 mr-1 text-yellow-400" />
					{rating.toFixed(1)} ({userRatingCount})
				</div>
			)
		}
	},
	{
		accessorKey: 'nationalPhoneNumber',
		header: 'Phone',
		cell: ({ row }) => {
			const phone = row.getValue('nationalPhoneNumber') as string
			return phone ? (
				<a href={`tel:${phone}`} className="flex items-center">
					<Phone className="w-4 h-4 mr-1" />
					{phone}
				</a>
			) : null
		}
	},
	{
		accessorKey: 'websiteUri',
		header: 'Website',
		cell: ({ row }) => {
			const website = row.getValue('websiteUri') as string
			return website ? (
				<a
					href={website}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center"
				>
					<Globe className="w-4 h-4 mr-1" />
					Website
				</a>
			) : null
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <EmailGeneratorButton place={row.original} />
	}
]

// Add this new component
function EmailGeneratorButton({ place }: { place: Place }) {
	const [generatedEmail, setGeneratedEmail] = useState('')

	const handleGenerateEmail = () => {
		const email = generateColdEmail(place)
		setGeneratedEmail(email)
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" onClick={handleGenerateEmail}>
					<Mail className="mr-2 h-4 w-4" />
					Generate Email
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[800px] w-[90vw]">
				<DialogHeader>
					<DialogTitle>Generated Cold Email for {place.name}</DialogTitle>
					<DialogDescription>
						This email is generated based on the place's data. You can use this
						as a template for your outreach.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-[400px] w-full rounded-md border p-4">
					<pre className="whitespace-pre-wrap font-mono text-sm">
						{generatedEmail}
					</pre>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}

export default function EnhancedSalesMapTool() {
	const [searchQuery, setSearchQuery] = useState('')
	const [results, setResults] = useState<Place[]>(placeholderData)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const mapRef = useRef<google.maps.Map | null>(null)
	const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: 'AIzaSyDr2HD-EFi8dhuuchPePV41hgR6aK2Fhlc',
		libraries: ['places']
	})

	const onMapLoad = useCallback((map: google.maps.Map) => {
		mapRef.current = map
	}, [])

	const handleSearch = useCallback(() => {
		if (searchBoxRef.current && mapRef.current) {
			const places = searchBoxRef.current.getPlaces()
			if (places && places.length > 0) {
				const newResults: Place[] = places.map((place) => ({
					name: place.name || '',
					id: place.place_id || '',
					types: place.types || [],
					nationalPhoneNumber: place.formatted_phone_number || '',
					internationalPhoneNumber: place.international_phone_number || '',
					formattedAddress: place.formatted_address || '',
					location: {
						latitude: place.geometry?.location?.lat() || 0,
						longitude: place.geometry?.location?.lng() || 0
					},
					rating: place.rating || 0,
					googleMapsUri: place.url || '',
					websiteUri: place.website || '',
					businessStatus: place.business_status || '',
					userRatingCount: place.user_ratings_total || 0,
					primaryType: place.types?.[0] || '',
					shortFormattedAddress: place.vicinity || ''
				}))
				setResults(newResults)
				if (places[0].geometry?.location) {
					mapRef.current.panTo(places[0].geometry.location)
					mapRef.current.setZoom(14)
				}
			}
		}
	}, [])

	useEffect(() => {
		if (isLoaded && inputRef.current) {
			const searchBox = new google.maps.places.SearchBox(inputRef.current)
			searchBoxRef.current = searchBox

			searchBox.addListener('places_changed', handleSearch)

			return () => {
				google.maps.event.clearInstanceListeners(searchBox)
			}
		}
	}, [isLoaded, handleSearch])

	const handleItemSelect = (id: string) => {
		setSelectedId(id === selectedId ? null : id)
		const selected = results.find((result) => result.id === id)
		if (selected && mapRef.current) {
			mapRef.current.panTo({
				lat: selected.location.latitude,
				lng: selected.location.longitude
			})
			mapRef.current.setZoom(14)
		}
	}

	const table = useReactTable({
		data: results,
		columns,
		getCoreRowModel: getCoreRowModel()
	})

	if (loadError) return <div>Error loading maps</div>
	if (!isLoaded) return <div>Loading maps</div>

	return (
		<div className="flex flex-col h-screen w-screen">
			<header className="flex items-center justify-between p-4 bg-primary text-primary-foreground w-full">
				<h1 className="text-2xl font-bold">Enhanced Sales Map Tool</h1>
				<div className="flex w-full max-w-sm items-center space-x-2">
					<Input
						ref={inputRef}
						type="text"
						placeholder="Search locations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-grow"
					/>
					<Button onClick={handleSearch}>Search</Button>
				</div>
			</header>
			<main className="flex-grow flex flex-col md:flex-row w-full">
				<ResizablePanelGroup direction="horizontal" className="w-full">
					<ResizablePanel defaultSize={50} minSize={30}>
						<div className="h-full p-4 bg-muted">
							<GoogleMap
								mapContainerStyle={{ width: '100%', height: '100%' }}
								center={center}
								zoom={10}
								onLoad={onMapLoad}
							>
								{results.map((result) => (
									<Marker
										key={result.id}
										position={{
											lat: result.location.latitude,
											lng: result.location.longitude
										}}
										onClick={() => handleItemSelect(result.id)}
										icon={{
											url: `data:image/svg+xml,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${result.id === selectedId ? '#ff0000' : '#000000'}" width="32px" height="32px">
                          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                        </svg>
                      `)}`,
											scaledSize: new google.maps.Size(32, 32)
										}}
									/>
								))}
							</GoogleMap>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={50} minSize={30}>
						<div className="h-full p-4 overflow-hidden">
							<div className="rounded-md border h-full overflow-auto">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<TableHead key={header.id}>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext()
																)}
													</TableHead>
												))}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										{table.getRowModel().rows?.length ? (
											table.getRowModel().rows.map((row) => (
												<TableRow
													key={row.id}
													data-state={row.getIsSelected() && 'selected'}
													className={
														selectedId === row.original.id
															? 'bg-secondary/20'
															: ''
													}
													onClick={() => handleItemSelect(row.original.id)}
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
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</main>
		</div>
	)
}
