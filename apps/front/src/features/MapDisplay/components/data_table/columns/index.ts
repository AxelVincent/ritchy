import type { ColumnDef } from '@tanstack/react-table'

import type { SearchResult } from '@ritchy/types'
import { actionsColumn } from './ActionsColumn'
import {
  administrativeAreaLevel1Column,
  administrativeAreaLevel2Column,
  formattedAddressColumn,
  neighborhoodColumn,
  plusCodeColumn,
  postalCodeColumn,
  postalCodeSuffixColumn,
  streetColumn,
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
  administrativeAreaLevel1Column,
  administrativeAreaLevel2Column,
  neighborhoodColumn,
  postalCodeColumn,
  postalCodeSuffixColumn,
  plusCodeColumn,
  streetColumn,
]
