import { ColumnPinCopyCell } from './ColumnCells'

export const SecondarySocialsList = ({
  links,
  platform,
  id,
}: { links: string[]; platform: string; id: string }) => {
  if (!links || links.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No secondary {platform} links
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <ColumnPinCopyCell key={link} id={id} content={link} href={link} />
      ))}
    </div>
  )
}
