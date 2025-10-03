import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

export const CompanyNameCleanerSchema = z.object({
  cleanedName: z
    .string()
    .describe('The cleaned company name without locality or extra information'),
  reasoning: z.string().describe('Explanation of what was removed and why'),
})

export const companyNameCleaner = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at cleaning company names for business searches.

Your task is to remove geographic locations, unnecessary descriptors, and extra information from company names while preserving the core business identity.

Common patterns to remove:
- Geographic locations (cities, neighborhoods, regions)
- Descriptive suffixes that aren't part of the legal name
- Extra context like "Restaurant", "Store", "Shop" when they're not part of the actual name
- Address information mixed into the name

Examples:
- "McDonald's Paris" → "McDonald's"
- "Pizza Hut Restaurant Downtown" → "Pizza Hut"
- "Apple Store Champs-Élysées" → "Apple"
- "Café de la Paix Place Vendôme" → "Café de la Paix"
- "Boulangerie Paul Montmartre" → "Boulangerie Paul" (if Paul is the business name)

Keep legal entity suffixes (SARL, SAS, Ltd, LLC, etc.) if they appear to be part of the official name.

Return only the essential business name that would be used in official business registries.`,
  ],
  ['human', 'Company name to clean: {companyName}\nAddress context: {address}'],
])
