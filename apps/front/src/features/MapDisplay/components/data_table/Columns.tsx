import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { actionsColumn } from './columns/ActionsColumn'
import { addressColumn } from './columns/AddressColumn'
import { descriptionColumn } from './columns/DescriptionColumn'
import { nameColumn } from './columns/NameColumn'
import { openingHoursColumn } from './columns/OpeningHoursColumn'
import { phoneColumn } from './columns/PhoneColumn'
import { ratingColumn } from './columns/RatingColumn'
import { ratingCountColumn } from './columns/RatingCountColumn'
import { selectColumn } from './columns/SelectColumn'
import { socialEmailColumn } from './columns/SocialEmailColumn'
import { typesColumn } from './columns/TypesColumn'
import { websiteColumn } from './columns/WebsiteColumn'

// Compose the columns array
export const columns: ColumnDef<SearchResult>[] = [
  selectColumn,
  nameColumn,
  socialEmailColumn,
  websiteColumn,
  descriptionColumn,
  phoneColumn,
  ratingColumn,
  ratingCountColumn,
  addressColumn,
  openingHoursColumn,
  typesColumn,
  actionsColumn,
]
