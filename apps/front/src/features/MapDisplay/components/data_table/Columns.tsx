import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { actionsColumn } from './columns/ActionsColumn'
import {
  addressComponentsColumn,
  administrativeAreaLevel1Column,
  administrativeAreaLevel2Column,
  administrativeAreaLevel3Column,
  countryColumn,
  formattedAddressColumn,
  localityColumn,
  neighborhoodColumn,
  plusCodeColumn,
  postalCodeColumn,
  postalCodeSuffixColumn,
  streetColumn,
  sublocalityColumn,
} from './columns/AddressColumns'
import { descriptionColumn } from './columns/DescriptionColumn'
import { nameColumn } from './columns/NameColumn'
import { openingHoursColumn } from './columns/OpeningHoursColumn'
import { phoneColumn } from './columns/PhoneColumn'
import { priceLevelColumn } from './columns/PriceLevelColumn'
import { priceRangeColumn } from './columns/PriceRangeColumn'
import { primaryTypeColumn } from './columns/PrimaryTypeColumn'
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
  typesColumn,
  primaryTypeColumn,
  priceLevelColumn,
  priceRangeColumn,
  ratingColumn,
  ratingCountColumn,
  websiteColumn,
  phoneColumn,
  socialEmailColumn,
  formattedAddressColumn,
  countryColumn,
  localityColumn,
  sublocalityColumn,
  postalCodeColumn,
  postalCodeSuffixColumn,
  plusCodeColumn,
  streetColumn,
  neighborhoodColumn,
  administrativeAreaLevel1Column,
  administrativeAreaLevel2Column,
  administrativeAreaLevel3Column,
  openingHoursColumn,
  descriptionColumn,
  addressComponentsColumn,
  actionsColumn,
]
