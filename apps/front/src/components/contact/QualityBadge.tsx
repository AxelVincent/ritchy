import type { Email } from '@api/shared'
import { EmailQualityBadge } from '../common/EmailQualityBadge'

export const QualityBadge = (email: Email) => {
  return (
    <EmailQualityBadge quality={email.quality} isVerified={email.isVerified} />
  )
}
