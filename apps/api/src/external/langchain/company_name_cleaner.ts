import { trackExternalApiCall } from '../../metrics/external-api'
import { anthropic_haiku } from './llms'
import {
  CompanyNameCleanerSchema,
  companyNameCleaner,
} from './prompts/company_name_cleaner'

export const cleanCompanyName = async (
  companyName: string,
  address?: string,
) => {
  const structuredOutput = anthropic_haiku.withStructuredOutput(
    CompanyNameCleanerSchema,
  )

  const prompt = await companyNameCleaner.invoke({
    companyName,
    address: address || 'No address provided',
  })

  const result = await trackExternalApiCall(
    'openai',
    'company_name_cleaner',
    () => structuredOutput.invoke(prompt),
  )
  return result
}
