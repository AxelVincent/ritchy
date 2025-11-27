import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { logger } from '@ritchy/logger'
import type { z } from 'zod'
import { BRIGHTDATA_CONFIG } from '../../../config/brightdata'
import type { MCPToolDefinition } from './adapter'

/**
 * Singleton MCP client for BrightData
 *
 * This client manages the connection to the BrightData MCP server via stdio transport.
 * The connection is lazy-initialized on first use and reused for subsequent calls.
 */
let mcpClient: Client | null = null
let isConnecting = false
let connectionPromise: Promise<Client> | null = null

/**
 * Get or create the MCP client connection
 *
 * @returns Promise resolving to the connected MCP client
 * @throws Error if connection fails
 */
export const getMCPClient = async (): Promise<Client> => {
  // Return existing client if already connected
  if (mcpClient) {
    return mcpClient
  }

  // If connection is in progress, wait for it
  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  // Start new connection
  isConnecting = true
  connectionPromise = (async () => {
    try {
      logger.info({
        msg: '[MCP] Connecting to BrightData MCP server',
        event: 'mcp_connecting',
      })

      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['@brightdata/mcp'],
        env: {
          API_TOKEN: BRIGHTDATA_CONFIG.API_KEY,
          PRO_MODE: 'true', // Enable all 60+ tools
        },
      })

      const client = new Client({
        name: 'ritchy-api',
        version: '1.0.0',
      })

      await client.connect(transport)

      logger.info({
        msg: '[MCP] Successfully connected to BrightData MCP server',
        event: 'mcp_connected',
      })

      mcpClient = client
      return client
    } catch (error) {
      logger.error({
        msg: '[MCP] Failed to connect to BrightData MCP server',
        event: 'mcp_connection_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    } finally {
      isConnecting = false
      connectionPromise = null
    }
  })()

  return connectionPromise
}

/**
 * Call an MCP tool
 *
 * @param toolName - Name of the MCP tool to call
 * @param args - Arguments to pass to the tool
 * @returns Promise resolving to the tool result
 * @throws Error if tool call fails
 */
export const callMCPTool = async (
  toolName: string,
  args: z.infer<MCPToolDefinition['schema']>,
): Promise<z.infer<MCPToolDefinition['schema']>> => {
  const startTime = Date.now()

  try {
    logger.debug({
      msg: '[MCP] Calling tool',
      event: 'mcp_tool_call_start',
      metadata: { toolName, args },
    })

    const client = await getMCPClient()
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })

    const duration = Date.now() - startTime

    logger.info({
      msg: '[MCP] Tool call successful',
      event: 'mcp_tool_call_success',
      metadata: {
        toolName,
        durationMs: duration,
      },
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error({
      msg: '[MCP] Tool call failed',
      event: 'mcp_tool_call_error',
      metadata: {
        toolName,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

/**
 * Close the MCP client connection
 *
 * This should be called on application shutdown.
 */
export const closeMCPClient = async (): Promise<void> => {
  if (mcpClient) {
    try {
      await mcpClient.close()
      logger.info({
        msg: '[MCP] Client closed',
        event: 'mcp_client_closed',
      })
    } catch (error) {
      logger.error({
        msg: '[MCP] Error closing client',
        event: 'mcp_client_close_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } finally {
      mcpClient = null
    }
  }
}
