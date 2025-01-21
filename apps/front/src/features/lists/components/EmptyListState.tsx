import { Button } from '@/components/ui/button'
import { useLists } from '@/features/map-display/hooks/useLists'
import { useNavigate } from '@tanstack/react-router'

interface EmptyListStateProps {
  listId: string
}

export const EmptyListState = ({ listId }: EmptyListStateProps) => {
  const navigate = useNavigate()
  const { lists } = useLists()
  const list = lists.find((list) => list.id === listId)

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 text-center">
      <h3 className="mb-2 text-lg font-semibold">
        {list?.emoji} {list?.name} is empty
      </h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Start exploring and add places to this list to build your collection
      </p>
      <Button onClick={() => navigate({ to: '/search' })}>
        Explore places
      </Button>
    </div>
  )
}
