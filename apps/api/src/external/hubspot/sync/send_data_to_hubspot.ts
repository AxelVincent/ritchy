import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import type { BatchOperation, EntityType, HubspotBase } from '../types'

const createBatchOperations = (operations: BatchOperation[]) => {
  const createBatch = operations
    .filter(
      (op): op is BatchOperation & { properties: Record<string, string> } =>
        !op.id
    )
    .map((op) => ({ properties: op.properties }))

  const updateBatch = operations
    .filter(
      (
        op
      ): op is BatchOperation & {
        id: string
        properties: Record<string, string>
      } => typeof op.id === 'string'
    )
    .map((op) => ({
      id: op.id,
      properties: op.properties
    }))

  return { createBatch, updateBatch }
}

export const sendDataToHubspot = async (
  operations: BatchOperation[],
  client: Client,
  entityType: EntityType,
  batchId: string
): Promise<HubspotBase[]> => {
  const { createBatch, updateBatch } = createBatchOperations(operations)

  try {
    const [createResults, updateResults] = await Promise.all([
      createBatch.length > 0
        ? client.crm[entityType].batchApi.create({ inputs: createBatch })
        : Promise.resolve({ results: [] }),
      updateBatch.length > 0
        ? client.crm[entityType].batchApi.update({ inputs: updateBatch })
        : Promise.resolve({ results: [] })
    ])

    const results = [...createResults.results, ...updateResults.results].map(
      (result) => ({
        ...result,
        userPlaceId: result.properties.ritchy_place_id as string,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        archived: result.archived ?? false
      })
    )

    logger.info({
      msg: `Completed ${entityType} batch processing`,
      event: `hubspot_${entityType}_batch_complete`,
      metadata: {
        batchId,
        created: createResults.results.length,
        updated: updateResults.results.length
      }
    })

    return results
  } catch (error) {
    logger.error({
      msg: `Failed to process ${entityType} batch`,
      event: `hubspot_${entityType}_batch_error`,
      metadata: {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
    throw error
  }
}
