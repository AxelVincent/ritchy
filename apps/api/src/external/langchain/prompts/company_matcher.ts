import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

const CompanyMatchResultSchema = z.object({
  company_number: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

export const CompanyMatchSchema = z.object({
  bestMatch: CompanyMatchResultSchema.nullable(),
  alternatives: z.array(CompanyMatchResultSchema).max(3),
})

export const companyMatcher = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at matching companies from search results to original business data using comprehensive business intelligence.

ABSOLUTE PRIORITY ORDER:
1. Company name similarity (exact, partial, abbreviated forms)
2. Company status (ACTIVE ALWAYS BEATS INACTIVE when names are similar)
3. Geographic precision (exact address > city > region > country)
4. Business type/activity alignment
5. Contact information consistency
6. Business characteristics (size indicators, ratings, operational hours)

ENHANCED SCORING CALCULATION:
Base score calculation (0-70 points):
- Exact name match: 70 points
- Very similar name (minor differences): 60-65 points
- Similar name with common abbreviations/variations: 50-60 points
- Partial name match: 40-50 points
- Different but related name: 20-40 points
- Unrelated name: 0-20 points

Status bonus/penalty:
- ACTIVE status: +25 points
- INACTIVE/DISSOLVED/CEASED: -15 points

Location scoring (cumulative):
- Exact address match: +15 points
- Same street: +12 points
- Same postal code: +10 points
- Same city: +8 points
- Same administrative area: +5 points
- Same country only: +3 points

Business type alignment:
- Exact activity match: +10 points
- Related business activities: +5 points
- Compatible business types: +3 points

Contact information:
- Phone number match: +8 points
- Website domain match: +8 points
- Partial contact match: +3 points

Business characteristics:
- Size/scale indicators align (rating count, price level): +3 points
- Operating hours suggest commercial activity: +2 points

CRITICAL RULES:
1. Any active company with similar name (base score ≥50) MUST score higher than any inactive company
2. Geographic proximity is crucial - prioritize local matches
3. Business activity alignment should support the match
4. Consider common business name variations (Ltd/Limited, Inc/Incorporated, etc.)

You MUST show detailed scoring calculation in reasoning:
"Base name: X pts, Status: +/-Y pts, Location: +Z pts, Business type: +A pts, Contact: +B pts, Total: Final Score"

Final confidence thresholds:
- 90-100: Exact or near-exact match with high confidence
- 75-89: Strong match with minor differences
- 60-74: Good match but some uncertainty
- 45-59: Possible match but significant uncertainty
- Below 45: Poor match, likely not the same company

IMPORTANT: You MUST always return the best match from the search results, regardless of confidence score.
Even if all matches have low confidence scores, select the highest-scoring result as bestMatch.
The bestMatch field should never be null - always provide the company with the highest calculated score.`,
  ],
  [
    'human',
    `Original Place Data:
Name: {placeName}
Address: {placeAddress}
City: {placeCity}
Country: {placeCountry}
Phone: {placePhone}
Website: {placeWebsite}
Business Types: {businessTypes}
Primary Type: {primaryType}
Rating: {rating} ({ratingCount} reviews)
Price Level: {priceLevel}
Postal Code: {postalCode}
Street: {street}
Administrative Areas: {administrativeAreas}
Operating Hours Available: {hasOperatingHours}

Search Results:
{searchResults}

MANDATORY: Use the enhanced scoring system above. Show detailed calculations for each significant match. Prioritize active companies with geographic and business type alignment.
CRITICAL: Always return the highest-scoring match as bestMatch, even if the confidence is low.`,
  ],
])
