import { AddItemsToListDialog } from '@/components/lists/add-items-to-list-dialog'
import { getStatusLabel } from '@/components/status/status-label'
import { cn } from '@/lib/utils'
import {
  faFacebook,
  faInstagram,
  faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { SearchResult, StatusType } from '@ritchy/types'
import {
  Building2,
  Globe,
  ListPlus,
  Mail,
  MapPin,
  Phone,
  Star,
  StickyNote,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'

// Get border color class based on status
const getStatusBorderColor = (
  status: StatusType | null | undefined,
): string => {
  switch (status) {
    case 'NEW':
      return 'border-l-blue-400'
    case 'NO_ANSWER':
      return 'border-l-gray-400'
    case 'CONTACTED':
      return 'border-l-amber-400'
    case 'FOLLOW_UP':
      return 'border-l-orange-400'
    case 'MEETING':
      return 'border-l-violet-400'
    case 'INTERESTED':
      return 'border-l-cyan-400'
    case 'WON':
      return 'border-l-green-400'
    case 'LOST':
      return 'border-l-red-400'
    default:
      return 'border-l-gray-300'
  }
}

interface MobileCardListProps {
  data: SearchResult[]
  selectedPlaceId?: string | null
  onRowClick?: (placeId: string) => void
  isLoading?: boolean
  listId?: string
}

const PlaceCard = ({
  place,
  isSelected,
  onClick,
  onAddToList,
}: {
  place: SearchResult
  isSelected: boolean
  onClick?: () => void
  onAddToList?: () => void
}) => {
  const location = [place.address.locality, place.address.country]
    .filter(Boolean)
    .join(', ')

  const status = place.status as StatusType | null

  // Contact metrics (enriched data)
  const emailCount = place.contactEmails?.length ?? 0
  const phoneCount = place.contactPhones?.length ?? 0

  // Primary contact info for quick actions (prefer enriched, fallback to basic)
  const primaryEmailObj = place.contactEmails?.find((e) => e.isPrimary)
  const primaryPhoneObj = place.contactPhones?.find((p) => p.isPrimary)

  const primaryEmail = primaryEmailObj?.email ?? place.contactEmails?.[0]?.email
  const primaryPhone =
    primaryPhoneObj?.phone ?? place.contactPhones?.[0]?.phone ?? place.phone

  // Show indicator only when user has explicitly set a primary contact
  const hasPrimaryEmail = !!primaryEmailObj
  const hasPrimaryPhone = !!primaryPhoneObj

  // Social media links (first available from each platform)
  const linkedinUrl = place.contactLinkedins?.[0]?.url
  const facebookUrl = place.contactFacebooks?.[0]?.url
  const instagramUrl = place.contactInstagrams?.[0]?.url

  // Place contacts (physical contacts)
  const contactCount = place.placeContacts?.length ?? 0

  // Notes
  const notesCount = place.notes?.length ?? 0
  const latestNote = place.notes?.[0]

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.()
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      className={cn(
        'p-4 border-b border-border/60 bg-background transition-colors',
        'border-l-4',
        getStatusBorderColor(status),
        'active:bg-accent/50',
        onClick && 'cursor-pointer',
        isSelected && 'bg-primary/5',
      )}
    >
      {/* Header: Name + Status label */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
          {place.name}
        </h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {getStatusLabel(status || 'NEW')}
        </span>
      </div>

      {/* Type */}
      {place.primaryType && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatType(place.primaryType)}</span>
        </div>
      )}

      {/* Location */}
      {location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Short Description (only shown if available - enriched data) */}
      {place.shortDescription && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
          {place.shortDescription}
        </p>
      )}

      {/* Enriched Data Badges (contacts, workforce) */}
      {(emailCount > 0 ||
        phoneCount > 0 ||
        contactCount > 0 ||
        place.companyWorkforceRange) && (
        <div className="flex items-center flex-wrap gap-2 mb-2">
          {place.companyWorkforceRange && (
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{place.companyWorkforceRange}</span>
            </div>
          )}
          {contactCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-3 w-3" />
              <span>
                {contactCount} contact{contactCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {phoneCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>
                {phoneCount} phone{phoneCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {emailCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>
                {emailCount} email{emailCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes hint */}
      {notesCount > 0 && latestNote && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
          <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="line-clamp-1">{latestNote.note}</span>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 font-medium">
            {notesCount}
          </span>
        </div>
      )}

      {/* Bottom row: Rating + Action buttons */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
        {/* Rating */}
        {place.rating !== undefined && place.rating > 0 ? (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{place.rating.toFixed(1)}</span>
            {place.ratingCount !== undefined && place.ratingCount > 0 && (
              <span className="text-muted-foreground">
                ({formatCount(place.ratingCount)})
              </span>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Action buttons with larger touch targets */}
        <div className="flex items-center gap-1">
          {/* Website */}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Visit website"
            >
              <Globe className="h-4 w-4" />
            </a>
          )}

          {/* Email - uses primary enriched email if available */}
          {primaryEmail && (
            <a
              href={`mailto:${primaryEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`Email ${primaryEmail}`}
            >
              <Mail className="h-4 w-4" />
              {hasPrimaryEmail && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </a>
          )}

          {/* Phone - uses primary enriched phone, falls back to basic phone */}
          {primaryPhone && (
            <a
              href={`tel:${primaryPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`Call ${primaryPhone}`}
            >
              <Phone className="h-4 w-4" />
              {hasPrimaryPhone && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </a>
          )}

          {/* LinkedIn */}
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-[#0A66C2] transition-colors"
              aria-label="View LinkedIn"
            >
              <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4" />
            </a>
          )}

          {/* Facebook */}
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-[#1877F2] transition-colors"
              aria-label="View Facebook"
            >
              <FontAwesomeIcon icon={faFacebook} className="h-4 w-4" />
            </a>
          )}

          {/* Instagram */}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-[#E4405F] transition-colors"
              aria-label="View Instagram"
            >
              <FontAwesomeIcon icon={faInstagram} className="h-4 w-4" />
            </a>
          )}

          {/* Add to List button */}
          {onAddToList && (
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onAddToList()
              }}
              aria-label="Add to list"
            >
              <ListPlus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Format type string (e.g., "restaurant" -> "Restaurant")
const formatType = (type: string): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Format count (e.g., 1234 -> "1.2K")
const formatCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export const MobileCardList = ({
  data,
  selectedPlaceId,
  onRowClick,
  isLoading,
  listId,
}: MobileCardListProps) => {
  const [showAddToListDialog, setShowAddToListDialog] = useState(false)
  const [selectedPlaceForList, setSelectedPlaceForList] = useState<
    string | null
  >(null)

  const handleAddToList = (placeId: string) => {
    setSelectedPlaceForList(placeId)
    setShowAddToListDialog(true)
  }

  // Don't show "Add" button if already viewing a list (would be redundant)
  const showAddButton = !listId

  if (isLoading && data.length === 0) {
    return (
      <div className="flex-1 overflow-auto">
        {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
          <div
            key={key}
            className="p-4 border-b border-border/60 border-l-4 border-l-gray-300 animate-pulse"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-10" />
            </div>
            <div className="h-3 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2 mb-2" />
            <div className="h-3 bg-muted rounded w-full mb-1" />
            <div className="h-3 bg-muted rounded w-2/3 mb-2" />
            <div className="flex gap-3 mt-3 pt-2 border-t border-border/40">
              <div className="h-3 bg-muted rounded w-12" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">No places found</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto">
        {data.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            isSelected={selectedPlaceId === place.id}
            onClick={() => onRowClick?.(place.id)}
            onAddToList={
              showAddButton ? () => handleAddToList(place.id) : undefined
            }
          />
        ))}
      </div>

      {/* Add to List Dialog */}
      <AddItemsToListDialog
        open={showAddToListDialog}
        onOpenChange={setShowAddToListDialog}
        selectedItems={
          selectedPlaceForList ? [{ userPlaceId: selectedPlaceForList }] : []
        }
      />
    </>
  )
}
