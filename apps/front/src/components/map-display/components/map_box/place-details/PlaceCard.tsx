import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { DragHandleDots2Icon } from '@radix-ui/react-icons'

import { StatusDropdown } from '@/components/status/status-dropdown'
import { useIsMobile } from '@/hooks/use-mobile'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PlaceHoursTab } from './tabs/PlaceHoursTab'
import { PlaceInfoTab } from './tabs/PlaceInfoTab'
import { PlaceNotesTab } from './tabs/PlaceNotesTab'

export const PlaceCard = ({
  listId,
}: {
  listId: string | null
}) => {
  const {
    selectedPlaceId,
    displayedPlaceIds,
    places,
    setSelectedPlaceId,
    setCenterPlaceSpreadsheetId,
  } = useMapStore()
  const isMobile = useIsMobile()
  const displayedIds = Array.from(displayedPlaceIds)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentPlace = places?.find((place) => place.id === selectedPlaceId)
  const [cardHeight, setCardHeight] = useState(() => {
    const savedHeight = localStorage.getItem('placeCardHeight')
    return savedHeight ? Number.parseInt(savedHeight, 10) : 350
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedPlaceId) {
      const index = displayedIds.indexOf(selectedPlaceId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [selectedPlaceId, displayedIds])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeRef.current) {
        const containerRect = resizeRef.current.getBoundingClientRect()
        const newHeight = Math.max(250, containerRect.bottom - e.clientY)
        setCardHeight(newHeight)
        localStorage.setItem('placeCardHeight', newHeight.toString())
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isResizing && resizeRef.current && e.touches.length > 0) {
        const containerRect = resizeRef.current.getBoundingClientRect()
        const touch = e.touches[0]
        const newHeight = Math.max(250, containerRect.bottom - touch.clientY)
        setCardHeight(newHeight)
        localStorage.setItem('placeCardHeight', newHeight.toString())
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    const handleTouchEnd = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const onClose = () => {
    setCenterPlaceSpreadsheetId(null)
    setSelectedPlaceId(null)
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % displayedIds.length
    setCurrentIndex(nextIndex)
    const nextId = displayedIds[nextIndex]
    setCenterPlaceSpreadsheetId(nextId)
    setSelectedPlaceId(nextId)
  }

  const handlePrevious = () => {
    const prevIndex =
      (currentIndex - 1 + displayedIds.length) % displayedIds.length
    setCurrentIndex(prevIndex)
    const prevId = displayedIds[prevIndex]
    setCenterPlaceSpreadsheetId(prevId)
    setSelectedPlaceId(prevId)
  }

  if (!currentPlace || !selectedPlaceId) {
    return null
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={`absolute ${
          isMobile ? 'bottom-20' : 'bottom-4'
        } left-4 right-4 mx-auto z-10`}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        ref={resizeRef}
      >
        <div className="relative">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-ns-resize"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <div className="flex h-4 w-6 items-center justify-center rounded-sm border bg-border  hover:bg-gray-300 transition-colors">
              <DragHandleDots2Icon className="h-4 w-3.5 rotate-90" />
            </div>
          </div>
          <Card
            className="shadow-lg flex flex-col"
            style={{ height: `${cardHeight}px` }}
          >
            <CardHeader className="pb-2 pt-3 px-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CardTitle className="text-lg truncate max-w-[200px] md:max-w-[300px]">
                    {currentPlace.name}
                  </CardTitle>
                  |
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    {currentPlace.rating ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {currentPlace.rating.toFixed(1)}
                        </span>
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-muted-foreground">
                          ({currentPlace.ratingCount?.toLocaleString() ?? 0})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        No reviews
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2">
                  <StatusDropdown
                    placeId={currentPlace.id}
                    currentStatus={currentPlace.status?.status || 'NEW'}
                    listId={listId}
                    searchId={currentPlace.searchId}
                  />
                  {currentPlace.website && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        window.open(currentPlace.website, '_blank')
                      }
                      title="Visit website"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const mapsUrl =
                        currentPlace.googleMapsUri ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${currentPlace.name} ${currentPlace.address.formattedAddress || ''}`,
                        )}`
                      window.open(mapsUrl, '_blank')
                    }}
                    title="Open in Google Maps"
                  >
                    <FontAwesomeIcon icon={faGoogle} className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="info" className="flex flex-col h-full">
                <TabsList
                  className="p-0 grid grid-cols-3 h-[45px] shrink-0 items-center bg-transparent"
                  aria-label="Place details"
                >
                  <TabsTrigger
                    value="info"
                    aria-label="Information"
                    className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="hours"
                    aria-label="Opening hours"
                    className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Opening hours
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    aria-label="Notes"
                    className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Notes
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <TabsContent
                    value="info"
                    className="mt-0 p-4 h-full flex-1 overflow-auto"
                  >
                    <PlaceInfoTab place={currentPlace} />
                  </TabsContent>

                  <TabsContent
                    value="hours"
                    className="mt-0 px-4 h-full flex-1 overflow-auto"
                  >
                    <PlaceHoursTab place={currentPlace} />
                  </TabsContent>

                  <TabsContent
                    value="notes"
                    className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <PlaceNotesTab place={currentPlace} />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>

            <CardFooter className="flex justify-between shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePrevious}
                disabled={displayedIds.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {/* Navigation indicator */}
              {displayedIds.length > 1 && (
                <div className="text-sm text-muted-foreground text-center py-2 shrink-0">
                  {currentIndex + 1} of {displayedIds.length} displayed places
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleNext}
                disabled={displayedIds.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
