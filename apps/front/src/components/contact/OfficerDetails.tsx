import {
  Briefcase,
  Building2,
  Calendar,
  Flag,
  MapPin,
  User2,
} from 'lucide-react'

interface OfficerDetailsProps {
  role?: string | null
  mention?: string | null
  dateOfAppointment?: string | null
  firstName?: string | null
  lastName?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  dateOfBirthFormat?: string | null
  nationality?: string | null
  nationalityCode?: string | null
  companyName?: string | null
  companyNumber?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  postalCode?: string | null
  city?: string | null
  country?: string | null
  countryCode?: string | null
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return null

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

const formatGender = (gender: string | null) => {
  if (!gender) return null
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

export const OfficerDetails = ({
  role,
  mention,
  dateOfAppointment,
  gender,
  dateOfBirth,
  nationality,
  nationalityCode,
  companyName,
  companyNumber,
  addressLine1,
  addressLine2,
  postalCode,
  city,
  country,
  countryCode,
}: OfficerDetailsProps) => {
  // Check if we have any officer data to display
  const hasOfficerData =
    role ||
    dateOfAppointment ||
    gender ||
    dateOfBirth ||
    nationality ||
    companyName ||
    addressLine1

  if (!hasOfficerData) return null

  const fullAddress = [addressLine1, addressLine2, postalCode, city, country]
    .filter(Boolean)
    .join(', ')

  const hasAddress = Boolean(fullAddress)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Role & Appointment */}
        {(role || dateOfAppointment) && (
          <div className="space-y-2">
            {role && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">{role}</p>
                  {mention && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {mention}
                    </p>
                  )}
                </div>
              </div>
            )}
            {dateOfAppointment && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Appointed</p>
                  <p className="text-sm">{formatDate(dateOfAppointment)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Personal Information */}
        {(gender || dateOfBirth || nationality) && (
          <div className="space-y-2">
            {gender && (
              <div className="flex items-start gap-2">
                <User2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm">{formatGender(gender)}</p>
                </div>
              </div>
            )}
            {dateOfBirth && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm">{formatDate(dateOfBirth)}</p>
                </div>
              </div>
            )}
            {nationality && (
              <div className="flex items-start gap-2">
                <Flag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="text-sm">
                    {nationality}
                    {nationalityCode && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({nationalityCode})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Company Affiliation */}
        {(companyName || companyNumber) && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{companyName}</p>
                {companyNumber && (
                  <p className="text-xs text-muted-foreground mt-1">
                    #{companyNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address with HoverCard */}
        {hasAddress && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 -ml-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-1">Address</p>
                <div className="text-sm space-y-0.5">
                  {addressLine1 && <p>{addressLine1}</p>}
                  {addressLine2 && (
                    <p className="text-muted-foreground">{addressLine2}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {postalCode && <span>{postalCode}</span>}
                    {city && <span>{city}</span>}
                  </div>
                  {country && (
                    <p className="">
                      {country}
                      {countryCode && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({countryCode})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
