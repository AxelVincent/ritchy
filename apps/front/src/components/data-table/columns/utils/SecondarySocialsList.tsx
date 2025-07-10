import { ColumnPinCopyCell } from './ColumnCells'

export const SecondarySocialsList = ({
  links,
  id,
}: { links: string[]; id: string }) => {
  if (!links || links.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <ColumnPinCopyCell key={link} id={id} content={link} href={link} />
      ))}
    </div>
  )
}
