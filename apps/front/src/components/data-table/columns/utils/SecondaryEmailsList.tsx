import { ContactEmailCell } from './ColumnCells'

export const SecondaryEmailsList = ({
  emails,
  id,
}: { emails: string[]; id: string }) => {
  return emails && emails.length > 0 ? (
    <div className="flex flex-col gap-2">
      {emails.map((email) => (
        <ContactEmailCell key={email} id={id} content={email} />
      ))}
    </div>
  ) : null
}
