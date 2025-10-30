import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'

interface ContactListSkeletonProps {
  count?: number
}

export const ContactListSkeleton = ({
  count = 3,
}: ContactListSkeletonProps) => {
  const skeletonKeys = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => `skeleton-${i}-${Math.random()}`),
    [count],
  )

  return (
    <div className="space-y-4 p-4">
      {skeletonKeys.map((key: string) => (
        <Card key={key} className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-24 w-full max-w-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-24 w-full max-w-lg" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
