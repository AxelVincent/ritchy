import {
  type PlaceTabValue,
  useMapStore,
} from '@/components/map-display/store/useMapStore'
import { StatusDropdown } from '@/components/status/status-dropdown'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { Place } from '@ritchy/types'
import { ExternalLink, X } from 'lucide-react'
import { PlaceCompanyDetailsTab } from './tabs/PlaceCompanyDetailsTab'
import { PlaceContactTab } from './tabs/PlaceContactTab'
import { PlaceInfoTab } from './tabs/PlaceInfoTab'
import { PlaceNotesTab } from './tabs/PlaceNotesTab'

interface SelectedPlaceCardProps {
  places: Place[] | null
  displayedPlaceIds: Set<string>
}

export const EMPTY_MESSAGE =
  'Use the enrichment button in the table (top left) to enrich this place and get detailed information including short description, business analysis, verified emails, phone numbers, social media, and more.'

export const SelectedPlaceCard = ({ places }: SelectedPlaceCardProps) => {
  const {
    selectedPlaceId,
    setSelectedPlaceId,
    setCenterPlaceSpreadsheetId,
    activeTab,
    setActiveTab,
  } = useMapStore()

  const currentPlace = places?.find((place) => place.id === selectedPlaceId)

  const onClose = () => {
    setCenterPlaceSpreadsheetId(null)
    setSelectedPlaceId(null)
    setActiveTab(null)
  }

  if (!currentPlace || !selectedPlaceId) {
    return null
  }

  // Use activeTab from store, fallback to 'details' if not set
  const currentTab: PlaceTabValue = activeTab || 'details'

  return (
    <div className="flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="pb-2 pt-3 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="text-lg font-semibold truncate">
              {currentPlace.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusDropdown
              userPlaceId={currentPlace.id}
              currentStatus={currentPlace.status ?? 'NEW'}
              listId={currentPlace.listId}
            />
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
                  currentPlace.sourceUrl ||
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
      </div>

      {/* Content */}
      <div className="p-0 flex-1 flex flex-col overflow-hidden">
        <Tabs
          value={currentTab}
          onValueChange={(value) => setActiveTab(value as PlaceTabValue)}
          className="flex flex-col h-full"
        >
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
              value="company_details"
              aria-label="company_details"
              className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Company Details
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              aria-label="Contacts"
              className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Contacts
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              aria-label="Notes"
              className="flex-1 min-w-[120px] relative py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Notes
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
              value="company_details"
              className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
            >
              <PlaceCompanyDetailsTab place={currentPlace} />
            </TabsContent>

            <TabsContent
              value="contacts"
              className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
            >
              <PlaceContactTab place={currentPlace} />
            </TabsContent>

            <TabsContent
              value="notes"
              className="mt-0 px-4 h-full flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
            >
              <PlaceNotesTab place={currentPlace} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
