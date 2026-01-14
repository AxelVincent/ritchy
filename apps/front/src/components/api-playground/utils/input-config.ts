import { Link, MapPin } from 'lucide-react'
import type { InputType } from './code-snippets'

export const inputTypeConfig = {
  url: {
    label: 'Google Maps URL',
    icon: Link,
    placeholder: 'https://www.google.com/maps/place/Example+Business',
  },
  placeId: {
    label: 'Place ID',
    icon: MapPin,
    placeholder: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  },
} as const satisfies Record<
  InputType,
  { label: string; icon: typeof Link; placeholder: string }
>
