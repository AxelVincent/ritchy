import { MapPin } from 'lucide-react'

interface Address {
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  countryCode: string | null
}

interface AddressDisplayProps {
  address: Address | null
  label?: string
  showIcon?: boolean
}

export const AddressDisplay = ({
  address,
  label = 'Address',
  showIcon = true,
}: AddressDisplayProps) => {
  if (!address) return null

  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.postalCode,
    address.city,
    address.country,
  ].filter(Boolean)

  if (parts.length === 0) return null

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-start gap-2">
        {showIcon && (
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p>{parts.join(', ')}</p>
          {address.countryCode && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Country Code: {address.countryCode}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
