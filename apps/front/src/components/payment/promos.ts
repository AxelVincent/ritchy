// Define the promo type
export interface PromoOffer {
  code: string
  discount: number
  planId: string
  validUntil: string // ISO date string
}

// Define the annual offer type
export interface AnnualOffer {
  discount: number
  validUntil: string // ISO date string
}

// Centralized active promotions
const activePromos: PromoOffer[] = [
  {
    code: 'SUMMER25',
    discount: 25,
    planId: 'PRO',
    validUntil: '2025-08-31T23:59:59Z', // March 31, 2025
  },
  // Add more promos as needed
]

// Centralized annual offer
export const annualOffer: AnnualOffer = {
  discount: 40,
  validUntil: '2025-03-30T23:59:59Z', // February 28, 2025
}

// Helper function to get valid promos
export const getValidPromos = (planId?: string) => {
  return activePromos.filter(
    (promo) =>
      new Date(promo.validUntil) > new Date() &&
      (!planId || promo.planId === planId),
  )
}

// Helper function to check if annual offer is valid
export const isAnnualOfferValid = () => {
  return new Date(annualOffer.validUntil) > new Date()
}
