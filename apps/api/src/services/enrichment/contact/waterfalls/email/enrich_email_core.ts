import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { EMAIL_PROVIDERS } from '../../../shared/config/waterfall_config'
import type {
  ProviderError,
  Result,
} from '../../../shared/types/error_handling'
import type { ValidatedOfficerData } from '../../../shared/utils/validate_officer'
import { executeWaterfall } from '../../../shared/waterfalls/waterfall_executor'
import {
  type InsertOfficerEmailData,
  insertEnrichmentCompanyOfficerEmails,
} from '../../queries/insert_enrichment_company_officer_emails'
import { enrichWithContactOutEmail } from './providers/enrich_with_contactout_email'
import { enrichWithIcypeasEmail } from './providers/enrich_with_icypeas_email'

/**
 * Internal context for email waterfall execution
 */
interface EmailExecutorContext {
  readonly validated: ValidatedOfficerData
  readonly domain: string
  readonly tx?: PostgresJsDatabase<typeof schema>
}

/**
 * Execute an email provider by name
 */
const executeEmailProvider = async (
  providerName: string,
  context: EmailExecutorContext,
): Promise<Result<InsertOfficerEmailData[], ProviderError> | null> => {
  const { validated, domain } = context

  switch (providerName) {
    case 'icypeas_email':
      return enrichWithIcypeasEmail(
        validated.id,
        validated.firstName,
        validated.lastName,
        domain,
      )

    case 'contactout_email':
      return enrichWithContactOutEmail(
        validated.id,
        validated.firstName,
        validated.lastName,
      )

    default:
      return null
  }
}

/**
 * Core email enrichment logic using the generic waterfall executor
 * Returns WaterfallResult<T> with detailed status and error information
 */
export const enrichEmailCore = async (
  validated: ValidatedOfficerData,
  domain: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const context: EmailExecutorContext = { validated, domain, tx }

  return executeWaterfall(
    {
      name: 'email',
      providers: EMAIL_PROVIDERS,

      executeProvider: executeEmailProvider,

      persistResult: async (result, _providerName, ctx) => {
        await insertEnrichmentCompanyOfficerEmails(result, ctx.tx)
      },
    },
    context,
  )
}
