import { ApiPlayground } from '@/components/api-playground'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/api-playground')({
  component: ApiPlayground,
})
