import { Button } from '@/components/ui/button'
import { validateAndExportToCsv } from '@/lib/exportToCsv'
import { type SearchResult, searchResultSchema } from '@ritchy/types'

export const DataExport = ({ data }: { data: SearchResult[] }) => {
  const handleExport = () => {
    validateAndExportToCsv<SearchResult>({
      data,
      filename: 'places.csv',
      schema: searchResultSchema,
      columns: [
        {
          header: 'ID',
          accessor: (row) => row.id,
        },
        {
          header: 'Name',
          accessor: (row) => row.displayName,
        },
        {
          header: 'Website',
          accessor: (row) => row.websiteUri || 'N/A',
        },
        {
          header: 'Google Maps',
          accessor: (row) => row.googleMapsUri,
        },
        {
          header: 'Categories',
          accessor: (row) => row.types.join(', '),
        },
        {
          header: 'Phone',
          accessor: (row) => row.internationalPhoneNumber || 'N/A',
        },
        {
          header: 'Rating',
          accessor: (row) => row.rating?.toString() || 'N/A',
        },
        {
          header: 'Number of Reviews',
          accessor: (row) => row.userRatingCount?.toString() || 'N/A',
        },
        {
          header: 'Address',
          accessor: (row) => row.formattedAddress || 'N/A',
        },
      ],
    })
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      Export to CSV
    </Button>
  )
}
