import { ApiKeysPage } from '@/components/api-keys'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/api-keys')({
  component: ApiKeysPage,
})
