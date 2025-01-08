import type { ColumnDef } from '@tanstack/react-table'

import type { SearchResult } from '@ritchy/types'
import { actionsColumn } from './ActionsColumn'
import {
  administrativeAreaLevel1Column,
  administrativeAreaLevel2Column,
  countryColumn,
  formattedAddressColumn,
  localityColumn,
  neighborhoodColumn,
  plusCodeColumn,
  postalCodeColumn,
  postalCodeSuffixColumn,
  streetColumn,
  sublocalityColumn,
} from './AddressColumns'
import { descriptionColumn } from './DescriptionColumn'
import { nameColumn } from './NameColumn'
import { phoneColumn } from './PhoneColumn'
import { selectColumn } from './SelectColumn'
import { socialEmailColumn } from './SocialEmailColumn'
import { typesColumn } from './TypesColumn'
import { websiteColumn } from './WebsiteColumn'

export const columns: ColumnDef<SearchResult>[] = [
  selectColumn,
  nameColumn,
  descriptionColumn,
  typesColumn,
  websiteColumn,
  phoneColumn,
  socialEmailColumn,
  actionsColumn,
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
]
