import { logger } from '@ritchy/logger'
import {
  type FilterRule,
  type GenerateFiltersApiResponse,
  GenerateFiltersRequestSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { generateFiltersFromQuery } from '../../external/langchain/filter_generator'

/**
 * Generate a unique ID for AI-generated filter rules
 */
const generateRuleId = () =>
  `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

/**
 * POST /filters/generate
 *
 * Generates structured filters from a natural language query using Claude.
 * Returns filters with confidence scores and optional semantic query.
 */
export const generateFilters = async (
  req: Request,
  res: Response<GenerateFiltersApiResponse>,
): Promise<void> => {
  const userId = req.auth.userId

  logger.info({
    msg: 'Generate filters from query',
    event: 'generate_filters_request',
    metadata: { userId, body: req.body },
  })

  try {
    // Validate request body
    const parseResult = GenerateFiltersRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      logger.warn({
        msg: 'Invalid request body for filter generation',
        event: 'generate_filters_validation_error',
        metadata: { userId, errors: parseResult.error.errors },
      })
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const { query } = parseResult.data

    // Call LLM to generate filters
    const result = await generateFiltersFromQuery(query)

    // Transform LLM output to proper FilterRule format with IDs
    const filters = result.filters.map((f) => {
      const baseRule = {
        id: generateRuleId(),
        property: f.property,
        type: f.type,
        operator: f.operator,
      }

      let rule: FilterRule

      switch (f.type) {
        case 'multi_select':
          rule = {
            ...baseRule,
            type: 'multi_select',
            operator: f.operator as FilterRule['operator'],
            values: Array.isArray(f.value) ? f.value : [],
          } as FilterRule
          break

        case 'text':
          rule = {
            ...baseRule,
            type: 'text',
            operator: f.operator as FilterRule['operator'],
            value: typeof f.value === 'string' ? f.value : undefined,
          } as FilterRule
          break

        case 'number':
          rule = {
            ...baseRule,
            type: 'number',
            operator: f.operator as FilterRule['operator'],
            value: typeof f.value === 'number' ? f.value : undefined,
            valueTo: typeof f.valueTo === 'number' ? f.valueTo : undefined,
          } as FilterRule
          break

        case 'date':
          rule = {
            ...baseRule,
            type: 'date',
            operator: f.operator as FilterRule['operator'],
            value: typeof f.value === 'string' ? f.value : undefined,
            valueTo: typeof f.valueTo === 'string' ? f.valueTo : undefined,
          } as FilterRule
          break

        case 'boolean':
          rule = {
            ...baseRule,
            type: 'boolean',
            operator: f.operator as FilterRule['operator'],
          } as FilterRule
          break

        default:
          // Fallback to text type
          rule = {
            ...baseRule,
            type: 'text',
            operator: f.operator as FilterRule['operator'],
            value: typeof f.value === 'string' ? f.value : undefined,
          } as FilterRule
      }

      return {
        rule,
        confidence: f.confidence,
        explanation: f.explanation,
      }
    })

    logger.info({
      msg: 'Filters generated successfully',
      event: 'generate_filters_success',
      metadata: {
        userId,
        query,
        filterCount: filters.length,
        hasSemanticQuery: !!result.semanticQuery,
      },
    })

    res.json({
      filters,
      semanticQuery: result.semanticQuery,
      reasoning: result.reasoning,
    })
  } catch (error) {
    logger.error({
      msg: 'Generate filters error',
      event: 'generate_filters_error',
      metadata: {
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).json({ error: 'Failed to generate filters' })
  }
}
