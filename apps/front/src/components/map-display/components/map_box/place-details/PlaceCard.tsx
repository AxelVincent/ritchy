import { StatusIndicator } from '@/components/common/StatusIndicator'
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
import type { Place } from '@ritchy/types'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PlaceHoursTab } from './tabs/PlaceHoursTab'
import { PlaceInfoTab } from './tabs/PlaceInfoTab'
import { PlaceNotesTab } from './tabs/PlaceNotesTab'

interface PlaceCardProps {
  places: Place[] | null
  displayedPlaceIds: Set<string>
}

export const PlaceCard = ({ places, displayedPlaceIds }: PlaceCardProps) => {
  const { selectedPlaceId, setSelectedPlaceId, setCenterPlaceSpreadsheetId } =
    useMapStore()
  const displayedIds = Array.from(displayedPlaceIds)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentPlace = places?.find((place) => place.id === selectedPlaceId)

  useEffect(() => {
    if (selectedPlaceId) {
      const index = displayedIds.indexOf(selectedPlaceId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [selectedPlaceId, displayedIds])

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
        className="absolute bottom-4 left-4 right-4 mx-auto z-10"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <Card className="shadow-lg h-[350px] flex flex-col">
          <CardHeader className="pb-2 pt-3 px-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{currentPlace.name}</CardTitle>|
                <div className="flex items-center gap-2 text-sm">
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
                  {currentPlace.openingHours && (
                    <StatusIndicator
                      isOpen={currentPlace.openingHours.openNow}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentPlace.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(currentPlace.website, '_blank')}
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
      </motion.div>
    </AnimatePresence>
  )
}
