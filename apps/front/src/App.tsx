import './App.css'
// import EnhancedSalesMapTool from './components/enhanced-sales-map-tool-with-gmap-and-places'
import GmapTest from './components/gmap-test'

function App() {
	return (
		<div className="h-screen">
			<GmapTest center={{ lat: 48.8566, lng: 2.3522 }} />
		</div>
	)
}

export default App
