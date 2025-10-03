import { ChatPromptTemplate } from '@langchain/core/prompts'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { getMainDomain } from '../../../services/enrichment/scraper/utils/get_main_domain'
import { anthropic_haiku } from '../../langchain/llms'
import { vectorStore } from '../../langchain/utils/vector_store'
import { getWebsiteVectors } from './get_website_vectors'

const CompanyIdentifierSchema = z.object({
  companyNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  sirenNumber: z.string().optional().nullable(),
  siretNumber: z.string().optional().nullable(),
  // NEW: Add business operated name extraction
  operatedByName: z
    .string()
    .optional()
    .nullable()
    .describe(
      'The business name when mentioned as "operated by", "managed by", "owned by", etc.',
    ),
  tradingName: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Trading name or commercial name if different from operated name',
    ),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

const enhancedCompanyIdentifierExtractor = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at extracting company registration numbers, VAT numbers, and business names from website content.

Your task is to find and extract:
1. Company registration numbers (varies by country)
2. VAT numbers (EU VAT, TVA numbers, etc.)
3. SIREN numbers (France - 9 digits)
4. SIRET numbers (France - 14 digits)
5. Business operated names (e.g., "operated by", "managed by", "owned by")
6. Trading names or commercial names

SEARCH PRIORITY LOCATIONS:
1. Legal mentions (mentions légales) - HIGHEST PRIORITY
2. Footer information - HIGH PRIORITY  
3. Contact/About pages - MEDIUM PRIORITY
4. Terms and conditions - MEDIUM PRIORITY
5. Privacy policy - LOW PRIORITY

EXTRACTION RULES:
- Only extract numbers that clearly belong to the website owner
- Ignore supplier, partner, or client registration numbers
- Validate format: SIREN (9 digits), SIRET (14 digits), VAT numbers with country codes
- If multiple numbers found, choose the one from the most authoritative location

BUSINESS NAME EXTRACTION:
- Look for phrases like:
  * "operated by [COMPANY NAME]"
  * "managed by [COMPANY NAME]"
  * "owned by [COMPANY NAME]"
  * "trading as [COMPANY NAME]"
  * "doing business as [COMPANY NAME]"
  * "exploité par [COMPANY NAME]" (French)
  * "géré par [COMPANY NAME]" (French)
  * "betrieben von [COMPANY NAME]" (German)
  * "gestionado por [COMPANY NAME]" (Spanish)
- Extract the clean company name without legal suffixes unless they're clearly part of the name
- Prioritize names found in legal mentions or official sections

Common formats:
- France: SIREN (9 digits), SIRET (14 digits), TVA FR + 11 digits
- UK: Company number (8 digits), VAT number GB + 9 digits
- Germany: Handelsregisternummer (HRB), USt-IdNr. DE + 9 digits
- Spain: CIF, NIF, VAT ES + 10 characters

CONFIDENCE SCORING:
- 95-100: Business name (operatedByName/tradingName) found in legal mentions or footer - HIGHEST VALUE
- 90-94: Registration numbers found in legal mentions or footer with clear company ownership
- 85-89: Business name found in contact/about pages with clear context
- 75-84: Registration numbers found in contact/about pages with clear context
- 60-74: Registration numbers found but uncertain context or ownership
- 50-59: Business names found but uncertain context
- 0-49: Not found or very uncertain

IMPORTANT: 
1. Business names that clearly refer to the actual business operating the website should receive the highest confidence scores (95-100) as they directly identify the company, even more valuable than registration numbers.
2. Return null for any field you cannot find - never use placeholder strings.

Set confidence to 0 if no valid identifiers or business names found.`,
  ],
  [
    'human',
    `Website Domain: {domain}

Website Content (prioritized by relevance):
{content}

Extract any company registration numbers, VAT numbers, and business operated names. Focus on the most authoritative sources first.`,
  ],
])

// Add this function to generate language-specific search queries
const getMultilingualSearchQuery = (countryCodes: string[]): string => {
  const searchTermsByCountry = {
    FR: 'SIRET SIREN numéro immatriculation mentions légales conditions générales TVA FR RCS exploité par géré par',
    UK: 'company number registration VAT number GB Companies House legal notice operated by managed by owned by',
    DE: 'Handelsregisternummer HRB USt-IdNr Impressum Geschäftsbedingungen VAT DE betrieben von',
    ES: 'CIF NIF número registro mercantil aviso legal condiciones generales IVA ES gestionado por',
    BE: 'numéro entreprise BTW TVA BE mentions légales voorwaarden beheerd door',
    CH: 'Handelsregister MWST CHE Impressum Geschäftsbedingungen betrieben von',
    NL: 'KvK nummer BTW nummer handelsregister algemene voorwaarden beheerd door',
    LU: 'numéro matricule TVA LU mentions légales conditions générales géré par',
  }

  // Combine terms for all supported countries
  const allTerms = countryCodes
    .map(
      (code) =>
        searchTermsByCountry[code as keyof typeof searchTermsByCountry] || '',
    )
    .filter((terms) => terms.length > 0)
    .join(' ')

  // Add generic terms including business operation phrases
  const genericTerms =
    'company registration number VAT number legal mentions footer contact immatriculation operated by managed by owned by trading as doing business as'

  return `${allTerms} ${genericTerms}`
}

export const extractCompanyIdentifiers = async (website: string) => {
  try {
    const domain = getMainDomain(website)

    logger.debug({
      msg: '[pappers] Extracting company identifiers and business names from website vectors',
      event: 'extract_company_identifiers_start',
      metadata: { domain, website },
    })

    // Generate multilingual search query
    const supportedCountries = ['FR', 'UK', 'DE', 'ES', 'BE', 'CH', 'NL', 'LU']
    const searchQuery = getMultilingualSearchQuery(supportedCountries)

    logger.debug({
      msg: '[pappers] Using multilingual search query with business name terms',
      event: 'extract_company_identifiers_search_query',
      metadata: { domain, searchQuery },
    })

    // ENHANCEMENT 1: Use semantic search for targeted content with multilingual terms
    const relevantDocs = await vectorStore.similaritySearch(
      searchQuery,
      15, // Increased to get more relevant chunks
      {
        must: [
          {
            key: 'metadata.domain',
            match: { value: domain },
          },
        ],
      },
    )

    // Add detailed debugging for what was found
    logger.debug({
      msg: '[pappers] Semantic search results',
      event: 'extract_company_identifiers_semantic_results',
      metadata: {
        domain,
        relevantDocsCount: relevantDocs.length,
        foundDocs: relevantDocs.slice(0, 3).map((doc) => ({
          contentPreview: doc.pageContent.substring(0, 300),
          url: doc.metadata?.url,
          hasRegistrationTerms: hasRegistrationTerms(doc.pageContent),
          hasBusinessNameTerms: hasBusinessNameTerms(doc.pageContent),
        })),
      },
    })

    if (relevantDocs.length === 0) {
      logger.debug({
        msg: '[pappers] No relevant documents found, trying direct vector search',
        event: 'extract_company_identifiers_no_relevant_docs',
        metadata: { domain },
      })

      // Fallback: Check what vectors exist and if any contain registration or business name terms
      const allVectors = await getWebsiteVectors(domain)
      const vectorsWithTerms = allVectors.filter((point) => {
        const payload = point.payload as { pageContent?: string }
        const content = payload?.pageContent?.toLowerCase() || ''
        return hasRegistrationTerms(content) || hasBusinessNameTerms(content)
      })

      logger.debug({
        msg: '[pappers] Direct vector search results',
        event: 'extract_company_identifiers_direct_search',
        metadata: {
          domain,
          totalVectors: allVectors.length,
          vectorsWithTerms: vectorsWithTerms.length,
          samples: vectorsWithTerms.slice(0, 2).map((point) => {
            const payload = point.payload as { pageContent?: string }
            return payload?.pageContent?.substring(0, 300)
          }),
        },
      })

      if (vectorsWithTerms.length === 0) {
        return null
      }
    }

    // ENHANCEMENT 2: Prioritize semantically relevant content
    const semanticContent = relevantDocs
      .map((doc) => doc.pageContent)
      .join('\n\n')

    logger.debug({
      msg: '[pappers] Found semantically relevant content',
      event: 'extract_company_identifiers_semantic_content',
      metadata: {
        domain,
        relevantDocsCount: relevantDocs.length,
        semanticContentLength: semanticContent.length,
      },
    })

    let contentToAnalyze: string
    let methodUsed: string

    // ENHANCEMENT 3: Better fallback strategy that looks for legal content specifically
    if (semanticContent.length < 500) {
      logger.debug({
        msg: '[pappers] Semantic content insufficient, searching for legal content',
        event: 'extract_company_identifiers_searching_legal_content',
        metadata: { domain, semanticContentLength: semanticContent.length },
      })

      const websiteVectors = await getWebsiteVectors(domain)

      // Filter vectors that likely contain legal/registration information or business names
      const legalVectors = websiteVectors.filter((point) => {
        const payload = point.payload as { pageContent?: string }
        const content = payload?.pageContent?.toLowerCase() || ''
        return hasRegistrationTerms(content) || hasBusinessNameTerms(content)
      })

      let additionalContent = ''
      if (legalVectors.length > 0) {
        logger.debug({
          msg: '[pappers] Found legal content vectors',
          event: 'extract_company_identifiers_found_legal_vectors',
          metadata: { domain, legalVectorsCount: legalVectors.length },
        })

        additionalContent = legalVectors
          .map((point) => {
            const payload = point.payload as { pageContent?: string }
            return payload?.pageContent || ''
          })
          .join('\n\n')

        methodUsed = 'legal_content_focused'
      } else {
        // Final fallback to all content
        additionalContent = websiteVectors
          .map((point) => {
            const payload = point.payload as { pageContent?: string }
            return payload?.pageContent || ''
          })
          .filter((content) => content.length > 0)
          .join('\n\n')

        methodUsed = 'all_content_fallback'
      }

      // Combine semantic + legal/all content
      const combinedContent =
        semanticContent.length > 0
          ? `${semanticContent}\n\n--- Additional Legal Content ---\n\n${additionalContent}`
          : additionalContent

      const MAX_CONTENT_LENGTH = 50000
      contentToAnalyze =
        combinedContent.length > MAX_CONTENT_LENGTH
          ? `${combinedContent.substring(0, MAX_CONTENT_LENGTH)}...[truncated]`
          : combinedContent
    } else {
      const MAX_CONTENT_LENGTH = 50000
      contentToAnalyze =
        semanticContent.length > MAX_CONTENT_LENGTH
          ? `${semanticContent.substring(0, MAX_CONTENT_LENGTH)}...[truncated]`
          : semanticContent

      methodUsed = 'semantic_search'
    }

    logger.debug({
      msg: '[pappers] Content prepared for analysis',
      event: 'extract_company_identifiers_content_prepared',
      metadata: {
        domain,
        methodUsed,
        finalContentLength: contentToAnalyze.length,
      },
    })

    const structuredOutput = anthropic_haiku.withStructuredOutput(
      CompanyIdentifierSchema,
    )

    const prompt = await enhancedCompanyIdentifierExtractor.invoke({
      domain,
      content: contentToAnalyze,
    })

    const result = await structuredOutput.invoke(prompt)

    // Clean identification numbers by removing all spaces
    const adjustedResult = {
      ...result,
      companyNumber: result.companyNumber?.replace(/\s+/g, '') || null,
      vatNumber: result.vatNumber?.replace(/\s+/g, '') || null,
      sirenNumber: result.sirenNumber?.replace(/\s+/g, '') || null,
      siretNumber: result.siretNumber?.replace(/\s+/g, '') || null,
      // Keep business names as-is (don't remove spaces from names)
      operatedByName: result.operatedByName,
      tradingName: result.tradingName,
    }

    logger.info({
      msg: '[pappers] Company identifier and business name extraction completed',
      event: 'extract_company_identifiers_result',
      metadata: {
        domain: getMainDomain(website),
        companyNumber: adjustedResult.companyNumber,
        vatNumber: adjustedResult.vatNumber,
        sirenNumber: adjustedResult.sirenNumber,
        siretNumber: adjustedResult.siretNumber,
        operatedByName: adjustedResult.operatedByName,
        tradingName: adjustedResult.tradingName,
        confidence: adjustedResult.confidence,
        originalConfidence: result.confidence,
        methodUsed,
        relevantDocsFound: relevantDocs.length,
      },
    })

    return adjustedResult.confidence > 70 ? adjustedResult : null
  } catch (error) {
    logger.error({
      msg: '[pappers] Error extracting company identifiers and business names',
      event: 'extract_company_identifiers_error',
      metadata: {
        website,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}

// Helper function to detect registration terms in content
const hasRegistrationTerms = (content: string): boolean => {
  const lowerContent = content.toLowerCase()

  const registrationTerms = [
    // French
    'siret',
    'siren',
    'immatriculation',
    'mentions légales',
    'conditions générales',
    'tva fr',
    'rcs',
    'numéro',

    // English/UK
    'company number',
    'vat number',
    'registration',
    'companies house',
    'gb',
    'legal notice',
    'terms and conditions',

    // German
    'handelsregisternummer',
    'hrb',
    'ust-idnr',
    'impressum',
    'geschäftsbedingungen',
    'vat de',
    'handelsregister',

    // Spanish
    'cif',
    'nif',
    'registro mercantil',
    'aviso legal',
    'condiciones generales',
    'iva es',

    // Dutch
    'kvk nummer',
    'btw nummer',
    'handelsregister',
    'algemene voorwaarden',

    // Belgian
    'numéro entreprise',
    'btw',
    'tva be',
    'voorwaarden',

    // Swiss
    'che',
    'mwst',
    'handelsregister',

    // Luxembourg
    'numéro matricule',
    'tva lu',
  ]

  return registrationTerms.some((term) => lowerContent.includes(term))
}

// NEW: Helper function to detect business name operation terms
const hasBusinessNameTerms = (content: string): boolean => {
  const lowerContent = content.toLowerCase()

  const businessNameTerms = [
    // English
    'operated by',
    'managed by',
    'owned by',
    'trading as',
    'doing business as',
    'dba',
    'trading name',
    'business name',
    'company name',

    // French
    'exploité par',
    'géré par',
    'détenu par',
    'nom commercial',
    'raison sociale',
    'dénomination sociale',

    // German
    'betrieben von',
    'geführt von',
    'im besitz von',
    'handelsname',
    'firmenname',

    // Spanish
    'operado por',
    'gestionado por',
    'propiedad de',
    'nombre comercial',
    'razón social',

    // Dutch
    'beheerd door',
    'eigendom van',
    'handelsnaam',

    // Italian
    'gestito da',
    'di proprietà di',
    'denominazione sociale',
  ]

  return businessNameTerms.some((term) => lowerContent.includes(term))
}
