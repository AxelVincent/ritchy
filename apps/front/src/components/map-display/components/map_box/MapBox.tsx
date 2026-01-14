import './styles.css'
import { useTheme } from '@/providers/theme-provider'
import type { UserPlaceMarker } from '@api/shared'
import type { FC } from 'react'
import { useMemo, useRef } from 'react'
import { useMapMarkers } from './hooks/useMapMarkers'

interface MapBoxProps {
  markers?: UserPlaceMarker[]
  selectedPlaceId: string | null
  onMarkerClick: (placeId: string) => void
  initialCenter: { latitude: number; longitude: number }
}

export const MapBox: FC<MapBoxProps> = ({
  markers,
  selectedPlaceId,
  onMarkerClick,
  initialCenter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Resolve actual theme (handle 'system' preference)
  const isDarkMode = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme === 'dark'
  }, [theme])

  const center = useMemo(
    () => [initialCenter.longitude, initialCenter.latitude] as [number, number],
    [initialCenter.latitude, initialCenter.longitude],
  )

  useMapMarkers({
    containerRef,
    markers,
    selectedPlaceId,
    onMarkerClick,
    initialCenter: center,
    isDarkMode,
  })

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
