import type { Plan, SearchModel } from '../enums'

export type Currency = 'usd' | 'eur'
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly'

export interface PricingTier {
  monthly: number
  quarterly: number
  yearly: number
}

export interface PlanFeatures {
  // Core features
  visualTerritoryManagement: boolean
  unlimitedSearches: boolean
  businessEnrichment: boolean
  emailVerifier: boolean
  prospectPipeline: boolean
  notesTracking: boolean
  csvExport: boolean
  emailSupport: boolean
  apiAccess: boolean
  priorityEmailSupport: boolean

  // Advanced features
  repeatSearch: boolean
  personalizedLists: boolean
  teamCollaboration: boolean
  onboardingSession: boolean

  // Enterprise features
  customLimits: boolean
  playbook: boolean
  accountManager: boolean
  whatsAppSupport: boolean
  slackChannel: boolean
}

export interface PlanConfig {
  id: Plan
  name: string
  displayName: string
  description: string
  tagline: string

  // Resource limits
  credits: number
  concurrency: number
  rateLimit: {
    perMinute: number
  }
  leadLimit: number
  searchModel: SearchModel

  // Pricing
  pricing: {
    usd: PricingTier
    eur: PricingTier
  }

  // Features
  features: PlanFeatures

  // UI metadata
  icon: 'Rocket' | 'Zap' | 'TrendingUp' | 'Search' | 'Target' | 'Building2'
  popular?: boolean
}

/**
 * Centralized plan configurations - SINGLE SOURCE OF TRUTH
 * All plan attributes including pricing, limits, features in one place
 */
export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'FREE',
    displayName: 'Free',
    description: 'Get started with basic features',
    tagline: 'Try before you buy',

    // Limits - Updated per spec
    credits: 100,
    concurrency: 5,
    rateLimit: {
      perMinute: 10,
    },
    leadLimit: 500,
    searchModel: 'BASIC',

    // Pricing
    pricing: {
      usd: { monthly: 0, quarterly: 0, yearly: 0 },
      eur: { monthly: 0, quarterly: 0, yearly: 0 },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: false,
      repeatSearch: true,
      apiAccess: true,
      personalizedLists: true,
      teamCollaboration: false,
      onboardingSession: false,
      customLimits: false,
      playbook: false,
      accountManager: false,
      priorityEmailSupport: false,
      whatsAppSupport: false,
      slackChannel: false,
    },

    // UI
    icon: 'Rocket',
  },

  STARTER: {
    id: 'STARTER',
    name: 'STARTER',
    displayName: 'Starter',
    description: 'Perfect for solo entrepreneurs',
    tagline: 'Start prospecting',

    // Limits - Per spec: 29EUR, 200 credits, 5 concurrency, 20/min
    credits: 200,
    concurrency: 5,
    rateLimit: {
      perMinute: 20,
    },
    leadLimit: 500,
    searchModel: 'BASIC',

    // Pricing
    pricing: {
      usd: {
        monthly: 34,
        quarterly: 91,
        yearly: 325,
      },
      eur: {
        monthly: 29,
        quarterly: 78,
        yearly: 278,
      },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: true,
      repeatSearch: true,
      apiAccess: false,
      personalizedLists: true,
      teamCollaboration: false,
      onboardingSession: false,
      customLimits: false,
      playbook: false,
      accountManager: false,
      priorityEmailSupport: false,
      whatsAppSupport: false,
      slackChannel: false,
    },

    // UI
    icon: 'Zap',
  },

  GROWTH: {
    id: 'GROWTH',
    name: 'GROWTH',
    displayName: 'Growth',
    description: 'Accelerate your pipeline',
    tagline: 'Scale your outreach',

    // Limits - Per spec: 69EUR, 500 credits, 15 concurrency, 40/min
    credits: 500,
    concurrency: 15,
    rateLimit: {
      perMinute: 40,
    },
    leadLimit: 2000,
    searchModel: 'ENHANCED',

    // Pricing
    pricing: {
      usd: {
        monthly: 81,
        quarterly: 217,
        yearly: 772,
      },
      eur: {
        monthly: 69,
        quarterly: 186,
        yearly: 662,
      },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: true,
      repeatSearch: true,
      apiAccess: false,
      personalizedLists: true,
      teamCollaboration: false,
      onboardingSession: false,
      customLimits: false,
      playbook: false,
      accountManager: false,
      priorityEmailSupport: true,
      whatsAppSupport: false,
      slackChannel: false,
    },

    // UI
    icon: 'TrendingUp',
    popular: true,
  },

  ESSENTIALS: {
    id: 'ESSENTIALS',
    name: 'ESSENTIALS',
    displayName: 'Essential',
    description: 'Perfect for entrepreneurs',
    tagline: 'Prospecting made easy',

    // Limits - Per spec: 129EUR, 1000 credits, 30 concurrency, 60/min
    credits: 1000,
    concurrency: 30,
    rateLimit: {
      perMinute: 60,
    },
    leadLimit: 5000,
    searchModel: 'ENHANCED',

    // Pricing
    pricing: {
      usd: {
        monthly: 149,
        quarterly: 406,
        yearly: 1445,
      },
      eur: {
        monthly: 129,
        quarterly: 348,
        yearly: 1238,
      },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: true,
      repeatSearch: true,
      apiAccess: false,
      personalizedLists: true,
      teamCollaboration: true,
      onboardingSession: false,
      customLimits: false,
      playbook: false,
      accountManager: false,
      priorityEmailSupport: false,
      whatsAppSupport: true,
      slackChannel: false,
    },

    // UI
    icon: 'Search',
  },

  PRO: {
    id: 'PRO',
    name: 'PRO',
    displayName: 'Pro',
    description: 'Built for small sales teams',
    tagline: 'Fuel your growth',

    // Limits - Per spec: 229EUR, 3000 credits, 60 concurrency, 120/min
    credits: 3000,
    concurrency: 60,
    rateLimit: {
      perMinute: 120,
    },
    leadLimit: 10000,
    searchModel: 'ADVANCED',

    // Pricing
    pricing: {
      usd: {
        monthly: 267,
        quarterly: 723,
        yearly: 2570,
      },
      eur: {
        monthly: 229,
        quarterly: 619,
        yearly: 2198,
      },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: true,
      repeatSearch: true,
      apiAccess: false,
      personalizedLists: true,
      teamCollaboration: true,
      onboardingSession: true,
      customLimits: false,
      playbook: false,
      accountManager: false,
      priorityEmailSupport: false,
      whatsAppSupport: false,
      slackChannel: true,
    },

    // UI
    icon: 'Target',
  },

  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    description: 'Scale across your organization',
    tagline: 'Dominate your market',

    // Limits - Per spec: 599EUR, 10000 credits, 100 concurrency, 300/min
    credits: 10000,
    concurrency: 100,
    rateLimit: {
      perMinute: 300,
    },
    leadLimit: 25000,
    searchModel: 'EXPERT',

    // Pricing
    pricing: {
      usd: {
        monthly: 699,
        quarterly: 1890,
        yearly: 6723,
      },
      eur: {
        monthly: 599,
        quarterly: 1617,
        yearly: 5750,
      },
    },

    // Features
    features: {
      visualTerritoryManagement: true,
      unlimitedSearches: true,
      businessEnrichment: true,
      emailVerifier: true,
      prospectPipeline: true,
      notesTracking: true,
      csvExport: true,
      emailSupport: true,
      repeatSearch: true,
      apiAccess: false,
      personalizedLists: true,
      teamCollaboration: true,
      onboardingSession: true,
      customLimits: true,
      playbook: true,
      accountManager: true,
      priorityEmailSupport: true,
      whatsAppSupport: true,
      slackChannel: true,
    },

    // UI
    icon: 'Building2',
  },
} as const

/**
 * Plan hierarchy for comparison operations (higher = more advanced)
 */
export const PLAN_HIERARCHY: Record<Plan, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  ESSENTIALS: 3,
  PRO: 4,
  ENTERPRISE: 5,
} as const

/**
 * Array of all plans in order
 */
export const ALL_PLANS: Plan[] = [
  'FREE',
  'STARTER',
  'GROWTH',
  'ESSENTIALS',
  'PRO',
  'ENTERPRISE',
] as const
