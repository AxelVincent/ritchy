import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import EnhancedSalesMapTool from './components/enhanced-sales-map-tool-with-gmap-and-places'
import { MapDisplay } from './features/MapDisplay/MapDisplay'

// Create a client
const queryClient = new QueryClient()

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<MapDisplay />
		</QueryClientProvider>
	)
}

export default App
