import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { actionsColumn } from './ActionsColumn'
import { nameColumn } from './NameColumn'
import { phoneColumn } from './PhoneColumn'
import { selectColumn } from './SelectColumn'
import { socialEmailColumn } from './SocialEmailColumn'
import { typesColumn } from './TypesColumn'
import { websiteColumn } from './WebsiteColumn'

export const columns: ColumnDef<SearchResult>[] = [
  selectColumn,
  nameColumn,
  typesColumn,
  websiteColumn,
  phoneColumn,
  socialEmailColumn,
  actionsColumn
]

export * from './CellWrapper'
