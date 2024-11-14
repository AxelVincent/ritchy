import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/theme-provider'
// import EnhancedSalesMapTool from './components/enhanced-sales-map-tool-with-gmap-and-places'
import { MapDisplay } from './features/MapDisplay/MapDisplay'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <MapDisplay />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
