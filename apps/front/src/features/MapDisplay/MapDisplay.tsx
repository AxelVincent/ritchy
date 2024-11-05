import type { ApiResponse } from '@/api/queries/googleMaps/mock/mockTextSearch'
import { MapBox } from './components/MapBox'
import { PlaceSearch } from './components/PlacesTextSearch'

export const MapDisplay = () => {
	const handleResults = (results: ApiResponse) => {
		console.log('Search results:', results)
		// Handle the results
	}

	return (
		<div className="relative h-screen w-screen flex">
			<div className="w-1/2">
				<MapBox />
			</div>
			<div className="w-1/2">
				<PlaceSearch
					location={{
						latitude: 37.7749,
						longitude: -122.4194,
						radius: 1000
					}}
					onResultsChange={handleResults}
				/>
			</div>
		</div>
	)
}
