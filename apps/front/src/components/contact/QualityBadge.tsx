import { Badge } from "../ui/badge"
import type { Email } from "@ritchy/types"

export const QualityBadge = (email: Email) => {
    if (!email.isVerified) {
      return (
        <Badge variant="outline" className="text-xs">
          Unverified
        </Badge>
      )
    }

    switch (email.quality) {
        case 'good':
            return (
              <Badge variant="outline" className="border-green-600 text-green-600">
                Good
              </Badge>
            )
          case 'risky':
            return (
              <Badge variant="outline" className="border-orange-400 text-orange-400">
                Risky
              </Badge>
            )
          case 'bad':
            return (
              <Badge variant="outline" className="border-red-600 text-red-600">
                Bad
              </Badge>
            )
          case 'unknown':
            return (
              <Badge variant="outline" className="border-gray-500 text-gray-600">
                Unknown
              </Badge>
            )
          default:
            return (
              <Badge variant="outline" className="border-gray-500 text-gray-600">
                Unknown
              </Badge>
            )
    }
  }