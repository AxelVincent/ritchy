import { Badge } from '@/components/ui/badge'
import type { Phone } from '@ritchy/types'
import { Phone as PhoneIcon, Star } from 'lucide-react'
import { ContactPhoneCell } from './ColumnCells'

export const PhonesList = ({
  phones,
  id,
}: {
  phones: Phone[]
  id: string
}) => {
  if (!phones?.length) return null

  const getPhoneTypeVariant = (type: Phone['type']) => {
    switch (type) {
      case 'MOBILE':
      case 'PERSONAL_NUMBER':
        return 'default'
      case 'FIXED_LINE':
      case 'FIXED_LINE_OR_MOBILE':
        return 'secondary'
      case 'TOLL_FREE':
      case 'SHARED_COST':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatPhoneType = (type: string) => {
    return type
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PhoneIcon className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Phones</h3>
        <Badge variant="secondary">{phones.length}</Badge>
      </div>
      {phones.map((phoneObj) => (
        <div
          key={phoneObj.phone}
          id={id}
          className="flex items-center gap-2 truncate"
        >
          <ContactPhoneCell
            id={`${id}-${phoneObj.phone}`}
            content={phoneObj.phone}
            isPin={false}
          />
          <Badge
            variant={getPhoneTypeVariant(phoneObj.type)}
            className="ml-2 text-[10px]"
          >
            {formatPhoneType(phoneObj.type)}
          </Badge>
          {phoneObj.isPrimary && (
            <Star
              className="h-4 w-4 flex-shrink-0 text-yellow-400"
              fill="currentColor"
              aria-label="Primary phone"
            />
          )}
        </div>
      ))}
    </div>
  )
}
