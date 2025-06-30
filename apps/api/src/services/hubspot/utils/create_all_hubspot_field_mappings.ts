import { manageHubspotFieldMappings } from '../manage_hubspot_field_mapping'
import {
  type MappingResult,
  MappingResultSchema,
} from '../validators/mapping_result'

/**
 * Creates both contact and company field mappings in a single transaction
 * @param params.tokenId - The HubSpot token ID to associate the mappings with
 * @returns Promise<MappingResult[]> - All created mappings
 */
export const createAllHubspotFieldMappings = async (
  tokenId: string,
): Promise<MappingResult[]> => {
  // Create both contact and company mappings
  const [contactMappings, companyMappings] = await Promise.all([
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'contact',
      mode: 'reset',
    }),
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'company',
      mode: 'reset',
    }),
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'status',
      mode: 'reset',
    }),
  ])

  const allMappings = [...contactMappings, ...companyMappings]

  return allMappings.map((mapping) => MappingResultSchema.parse(mapping))
}
