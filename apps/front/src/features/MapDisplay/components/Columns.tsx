import type { ColumnDef } from '@tanstack/react-table'
import { addressColumn } from './columns/AddressColumn'
import { nameColumn } from './columns/NameColumn'
import { phoneColumn } from './columns/PhoneColumn'
import { ratingColumn } from './columns/RatingColumn'
import { ratingCountColumn } from './columns/RatingCountColumn'
import { socialEmailColumn } from './columns/SocialEmailColumn'
import { websiteColumn } from './columns/WebsiteColumn'

export interface SearchResult {
  id: string
  displayName: string
  websiteUri: string
  googleMapsUri: string
  types: string[]
  internationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  formattedAddress?: string
}

// Compose the columns array
export const columns: ColumnDef<SearchResult>[] = [
  nameColumn,
  socialEmailColumn,
  ratingColumn,
  ratingCountColumn,
  addressColumn,
  websiteColumn,
  phoneColumn
  // TODO: Fix why they are breaking display
  // typesColumn,
  // actionsColumn
]
