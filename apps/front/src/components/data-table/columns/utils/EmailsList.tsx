import type { Email } from '@ritchy/types'
import { Star } from 'lucide-react'
import { CopyCell } from './ColumnCells'

export const EmailsList = ({
  emails,
  id,
}: {
  emails: Email[]
  id: string
}) => {
  if (!emails?.length) return null

  return (
    <div className="flex flex-col gap-2">
      {emails.map((emailObj) => (
        <div
          key={emailObj.email}
          id={id}
          className="flex items-center gap-2 truncate"
        >
          <CopyCell id={`${id}-${emailObj.email}`} content={emailObj.email} />
          {emailObj.isPrimary && (
            <Star
              className="h-4 w-4 flex-shrink-0 text-yellow-400"
              fill="currentColor"
              aria-label="Primary email"
            />
          )}
        </div>
      ))}
    </div>
  )
}
