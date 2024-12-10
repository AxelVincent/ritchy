import type { ColumnDef } from '@tanstack/react-table'

import type { SearchResult } from '@ritchy/types'
import { actionsColumn } from './ActionsColumn'
import { nameColumn } from './NameColumn'
import { phoneColumn } from './PhoneColumn'
import { socialEmailColumn } from './SocialEmailColumn'
import { typesColumn } from './TypesColumn'
import { websiteColumn } from './WebsiteColumn'

export const columns: ColumnDef<SearchResult>[] = [
  nameColumn,
  typesColumn,
  websiteColumn,
  phoneColumn,
  socialEmailColumn,
  actionsColumn,
]
