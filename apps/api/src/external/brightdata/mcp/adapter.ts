import { DynamicStructuredTool } from '@langchain/core/tools'
import { logger } from '@ritchy/logger'
import type { z } from 'zod'
import { trackExternalApiCall } from '../../../metrics/external-api'
import { callMCPTool } from './client'

/**
 * MCP Tool Definition
 *
 * Defines the structure of an MCP tool that can be converted to a LangChain tool
 */
export interface MCPToolDefinition {
  /** Name of the MCP tool (e.g., 'web_data_linkedin_person_profile') */
  name: string

  /** Human-readable description for the LLM */
  description: string

  /** Zod schema for input validation */
  schema: z.ZodObject<z.ZodRawShape>

  /** Cost tier for metrics (free, low, medium, high) */
  costTier?: 'free' | 'low' | 'medium' | 'high'
}

/**
 * Create a LangChain tool from an MCP tool definition
 *
 * This adapter wraps MCP tool calls in a LangChain-compatible interface,
 * with automatic error handling, logging, and metrics tracking.
 *
 * @param toolDef - MCP tool definition
 * @returns LangChain DynamicStructuredTool
 *
 * @example
 * ```typescript
 * const tool = createMCPToolAdapter({
 *   name: 'web_data_linkedin_person_profile',
 *   description: 'Get LinkedIn profile data',
 *   schema: z.object({ url: z.string().url() }),
 *   costTier: 'medium',
 * })
 *
 * const model = anthropic_haiku.bindTools([tool])
 * ```
 */
export const createMCPToolAdapter = (
  toolDef: MCPToolDefinition,
): DynamicStructuredTool => {
  const toolNameForLangChain = `brightdata_${toolDef.name}`

  return new DynamicStructuredTool({
    name: toolNameForLangChain,
    description: toolDef.description,
    schema: toolDef.schema,

    func: async (args: z.infer<typeof toolDef.schema>) => {
      const startTime = Date.now()

      try {
        logger.debug({
          msg: `[MCP Tool] ${toolDef.name} invoked`,
          event: 'mcp_tool_invoked',
          metadata: {
            toolName: toolDef.name,
            args,
            costTier: toolDef.costTier || 'medium',
          },
        })

        // Call MCP tool with metrics tracking
        const result = await trackExternalApiCall(
          'brightdata_mcp',
          toolDef.name,
          () => callMCPTool(toolDef.name, args),
        )

        const duration = Date.now() - startTime

        logger.info({
          msg: `[MCP Tool] ${toolDef.name} succeeded`,
          event: 'mcp_tool_success',
          metadata: {
            toolName: toolDef.name,
            durationMs: duration,
            costTier: toolDef.costTier || 'medium',
          },
        })

        // Return formatted result to LLM
        return JSON.stringify(result, null, 2)
      } catch (error) {
        const duration = Date.now() - startTime

        logger.error({
          msg: `[MCP Tool] ${toolDef.name} failed`,
          event: 'mcp_tool_error',
          metadata: {
            toolName: toolDef.name,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
            costTier: toolDef.costTier || 'medium',
          },
        })

        // Return error to LLM (don't throw - let LLM handle it)
        return JSON.stringify({
          error: true,
          message: `Tool ${toolDef.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    },
  })
}

/**
 * Create multiple MCP tool adapters from definitions
 *
 * @param toolDefs - Array of MCP tool definitions
 * @returns Array of LangChain tools
 *
 * @example
 * ```typescript
 * const tools = createMCPToolAdapters([
 *   { name: 'search_engine', description: '...', schema: z.object({...}) },
 *   { name: 'scrape_as_markdown', description: '...', schema: z.object({...}) },
 * ])
 *
 * const model = anthropic_haiku.bindTools(tools)
 * ```
 */
export const createMCPToolAdapters = (
  toolDefs: MCPToolDefinition[],
): DynamicStructuredTool[] => {
  return toolDefs.map(createMCPToolAdapter)
}
