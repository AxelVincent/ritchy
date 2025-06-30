import { useMapStore } from '@/components/map-display/store/useMapStore'
import { StatusDropdown } from '@/components/status/status-dropdown'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { DragHandleDots2Icon } from '@radix-ui/react-icons'
import type { Place } from '@ritchy/types'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PlaceContactTab } from './tabs/PlaceContactTab'
import { PlaceInfoTab } from './tabs/PlaceInfoTab'
import { PlaceNotesTab } from './tabs/PlaceNotesTab'
import { PlaceReviewsTab } from './tabs/PlaceReviewsTab'

interface PlaceCardProps {
  places: Place[] | null
  displayedPlaceIds: Set<string>
}

export const PlaceCard = ({ places, displayedPlaceIds }: PlaceCardProps) => {
  const isMobile = useIsMobile()
  const { selectedPlaceId, setSelectedPlaceId, setCenterPlaceSpreadsheetId } =
    useMapStore()
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
                </div>
                <div className="flex items-center gap-2">
                  <StatusDropdown
                    placeId={currentPlace.id}
                    currentStatus={currentPlace.status?.status || 'NEW'}
                    searchId={currentPlace.searchId}
                    listId={currentPlace.listId}
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
              <Tabs defaultValue="details" className="flex flex-col h-full">
                <TabsList
                  className="p-0 flex flex-wrap h-auto min-h-[45px] shrink-0 items-center bg-transparent"
                  aria-label="Place details"
                >
                  <TabsTrigger
                    value="details"
                    aria-label="Informations"
                    className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Informations
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    aria-label="Reviews"
                    className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Top reviews
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    aria-label="Notes"
                    className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Notes
                  </TabsTrigger>
                  <TabsTrigger
                    value="contact"
                    aria-label="Contact"
                    className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
                  >
                    Contact
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <TabsContent
                    value="details"
                    className="mt-0 p-4 h-full flex-1 overflow-auto"
                  >
                    <PlaceInfoTab place={currentPlace} />
                  </TabsContent>

                  <TabsContent
                    value="notes"
                    className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <PlaceNotesTab place={currentPlace} />
                  </TabsContent>

                  <TabsContent
                    value="reviews"
                    className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <PlaceReviewsTab place={currentPlace} />
                  </TabsContent>

                  <TabsContent
                    value="contact"
                    className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <PlaceContactTab place={currentPlace} />
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
