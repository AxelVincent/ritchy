import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import {
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
import { associatedListsColumn } from './columns/AssociatedListsColumn'
import { nameColumn } from './columns/NameColumn'
import { notesColumn } from './columns/NotesColumns'
import { openingHoursColumn } from './columns/OpeningHoursColumn'
import { phoneColumn } from './columns/PhoneColumn'
import { priceLevelColumn } from './columns/PriceLevelColumn'
import { priceRangeColumn } from './columns/PriceRangeColumn'
import { primaryTypeColumn } from './columns/PrimaryTypeColumn'
import { ratingColumn } from './columns/RatingColumn'
import { ratingCountColumn } from './columns/RatingCountColumn'

import { actionColumn } from './columns/ActionColumn'
import { activitiesColumn } from './columns/ActivitiesColumn'
import { dateOfCreationColumn } from './columns/DateOfCreationColumn'
import { domainRegistrationDateColumn } from './columns/DomainRegistrationDateColumn'
import { emailsColumn } from './columns/EmailsColumn'
import { facebookSocialsColumn } from './columns/FacebookSocialsColumn'
import { instagramSocialsColumn } from './columns/InstagramSocialsColumn'
import { linkedinSocialsColumn } from './columns/LinkedinSocialsColumn'
import { officersColumn } from './columns/OfficersColumn'
import { shortDescriptionColumn } from './columns/ShortDescriptionColumn'
import { sourceColumn } from './columns/SourceColumn'
import { sourceIdColumn } from './columns/SourceIdColumn'
import { sourceUrlColumn } from './columns/SourceUrlColumn'
import { statusColumn } from './columns/StatusColumn'
import { typesColumn } from './columns/TypesColumn'
import { websiteColumn } from './columns/WebsiteColumn'
import { workforceRangeColumn } from './columns/WorkforceRangeColumn'

// Compose the columns array
export const columns: ColumnDef<SearchResult>[] = [
  actionColumn,
  nameColumn,
  statusColumn,
  notesColumn,
  websiteColumn,
  phoneColumn,
  shortDescriptionColumn,
  workforceRangeColumn,
  dateOfCreationColumn,
  activitiesColumn,
  officersColumn,
  emailsColumn,
  instagramSocialsColumn,
  linkedinSocialsColumn,
  facebookSocialsColumn,
  domainRegistrationDateColumn,
  associatedListsColumn,
  primaryTypeColumn,
  typesColumn,
  priceLevelColumn,
  priceRangeColumn,
  ratingColumn,
  ratingCountColumn,
  openingHoursColumn,
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
  sourceColumn,
  sourceIdColumn,
  sourceUrlColumn,
  // actionsColumn,
]
