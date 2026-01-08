export interface ProviderConfig {
  readonly name: string
  readonly enabled: boolean
  readonly priority: number // Lower = try first
  readonly description?: string
}

export const EMAIL_PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'icypeas_email',
    enabled: true,
    priority: 1,
    description: 'Icypeas Email Search - Fast and reliable',
  },
  {
    name: 'contactout_email',
    enabled: false,
    priority: 2,
    description: 'ContactOut Email Search - Comprehensive fallback',
  },
  // Future providers can be added here
  // {
  //   name: 'hunter',
  //   enabled: false,
  //   priority: 3,
  //   description: 'Hunter.io - Good for generic domains',
  // },
  // {
  //   name: 'snov',
  //   enabled: false,
  //   priority: 4,
  //   description: 'Snov.io - Comprehensive search',
  // },
] as const

export const PHONE_PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'forager_phone',
    enabled: true,
    priority: 1,
    description:
      'Forager Phone Search - LinkedIn-based phone lookup with cache',
  },
  {
    name: 'contactout_phone',
    enabled: false,
    priority: 2,
    description: 'ContactOut Phone Search - Comprehensive fallback',
  },
  // Future providers can be added here
  // {
  //   name: 'rocketreach_phone',
  //   enabled: false,
  //   priority: 3,
  //   description: 'RocketReach - Premium phone search',
  // },
  // {
  //   name: 'apollo_phone',
  //   enabled: false,
  //   priority: 4,
  //   description: 'Apollo.io - B2B phone search',
  // },
] as const

export const LINKEDIN_PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'icypeas_find_people',
    enabled: true,
    priority: 1,
    description: 'Icypeas Find People with LLM matching',
  },
  {
    name: 'contactout_people_search',
    enabled: false,
    priority: 2,
    description: 'ContactOut People Search',
  },
  // Future providers can be added here
  // {
  //   name: 'rocketreach',
  //   enabled: false,
  //   priority: 3,
  //   description: 'RocketReach - Premium search',
  // },
  // {
  //   name: 'apollo',
  //   enabled: false,
  //   priority: 4,
  //   description: 'Apollo.io - B2B focused',
  // },
] as const

export const getEnabledProviders = (
  providers: readonly ProviderConfig[],
): readonly ProviderConfig[] => {
  return providers
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority)
}
