import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

const PersonMatchResultSchema = z.object({
  profileUrl: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

export const PersonMatchSchema = z.object({
  bestMatch: PersonMatchResultSchema.nullable(),
  alternatives: z.array(PersonMatchResultSchema).max(2),
})

export const personMatcher = ChatPromptTemplate.fromMessages([
  [
    'system',
    [
      {
        type: 'text',
        text: `Match LinkedIn profiles to local business owners (restaurants, shops, service providers, family businesses).

SCORING (max 120pts):
Name (50pts): Exact match=50, Similar=40-45, Same last name=30-40, Phonetic=25-35, Nickname=15-25
Company (30pts): Business name match=30, Legal name=28, Similar=25, Website domain=20
Role (15pts): Exact=15, Similar seniority=12, Same department=8
Geography (10pts): Same city=10, region=7, country=5
Timeline (10pts): Appointment ≈ job start (±6mo)=10, After=7, Earlier=3, None=5
Age check (±10pts): Impossible timeline (40yrs exp at age 45)=-10, Matches=+3, Normal=0
Seniority (5pts): Headline matches=5, Company size=3, Industry=2

CRITICAL CONTEXT:
- LOCAL BUSINESSES: Any age can own/run. 25yo café owner is normal, 30yo restaurant director is expected
- Business name ≠ Legal name: LinkedIn shows public business name, not registered company name
- Website domain is strongest company verification signal
- Geography: Place location may differ from company HQ (e.g., chain franchise)

PRIORITY:
1. Name similarity caps confidence (low name match = max 60 confidence)
2. Company verification (name OR website domain must match)
3. Role consistency
4. Geography (helpful but not critical due to franchises/chains)
5. Age: ONLY penalize impossible timelines, NOT young owners

OUTPUT RULES:
- bestMatch: Return only if confidence ≥60, otherwise null
- alternatives: Return EMPTY ARRAY [] if no good alternatives. NEVER include entries with null values
- Scoring format: "Name: X, Company: Y, Role: Z, Geo: A, Timeline: B, Age: C, Total: N"`,
        cache_control: { type: 'ephemeral' },
      },
    ],
  ],
  [
    'human',
    `Officer Data:
Name: {officerFirstName} {officerLastName}
Role: {officerRole}
Appointment Date: {appointmentDate}
Date of Birth: {officerDateOfBirth}
Nationality: {officerNationality}
Address: {officerAddress}

Company Context:
Company Name: {companyName}
Company Number: {companyNumber}
Status: {companyStatus}
Country: {companyCountry}
City: {companyCity}
Workforce: {companyWorkforce}
Legal Form: {companyLegalForm}
Activities: {companyActivities}

Place Context:
Business Name: {placeName}
Address: {placeAddress}
City: {placeCity}
Country: {placeCountry}
Phone: {placePhone}
Website: {placeWebsite}
Business Types: {placeTypes}

Search Results from Icypeas (up to 25 people):
{searchResults}

MANDATORY: Use the enhanced scoring system above. Show detailed calculations for each significant match. Return null for bestMatch if all scores < 60.`,
  ],
])
