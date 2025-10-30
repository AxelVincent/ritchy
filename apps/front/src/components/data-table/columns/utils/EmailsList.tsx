import { Badge } from '@/components/ui/badge'
import type { Email } from '@ritchy/types'
import { Mail, Star } from 'lucide-react'
import { CopyCell } from './ColumnCells'

export const EmailsList = ({
  emails,
}: {
  emails: Email[]
}) => {
  if (!emails?.length) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Emails</h3>
        <Badge variant="secondary">{emails.length}</Badge>
      </div>
      {emails.map((email) => (
        <div key={email.email} className="flex items-center gap-2 p-2 min-w-0">
          <div className="flex-1 min-w-0">
            <CopyCell content={email.email} href={`mailto:${email.email}`} />
          </div>
          {email.isPrimary && <Star className="h-4 w-4 fill-current" />}
        </div>
      ))}
    </div>
  )
}
