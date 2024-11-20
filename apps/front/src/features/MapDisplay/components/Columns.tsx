import type { ColumnDef } from '@tanstack/react-table'
import { actionsColumn } from './columns/ActionsColumn'
import { nameColumn } from './columns/NameColumn'
import { phoneColumn } from './columns/PhoneColumn'
import { socialEmailColumn } from './columns/SocialEmailColumn'
import { typesColumn } from './columns/TypesColumn'
import { websiteColumn } from './columns/WebsiteColumn'

export interface SearchResult {
  id: string
  displayName: string
  websiteUri: string
  googleMapsUri: string
  types: string[]
  internationalPhoneNumber?: string
}

// Compose the columns array
export const columns: ColumnDef<SearchResult>[] = [
  nameColumn,
  websiteColumn,
  phoneColumn,
  socialEmailColumn,
  typesColumn,
  actionsColumn
]
