import { logger } from '@ritchy/logger'
import z from 'zod'
import { ICYPEAS_CONFIG } from '../../config/icypeas'

// Include/Exclude filter schema
const IncludeExcludeSchema = z
  .object({
    include: z.array(z.string()).max(200).optional(),
    exclude: z.array(z.string()).max(200).optional(),
  })
  .refine((data) => data.include?.length || data.exclude?.length, {
    message: 'At least one of include or exclude must be provided',
  })
  .optional()

// Range operators schema
const RangeSchema = z
  .object({
    '>': z.number().optional(),
    '<': z.number().optional(),
    '>=': z.number().optional(),
    '<=': z.number().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one range operator must be provided',
  })
  .optional()

// Query schema with all available filters
const FindPeopleQuerySchema = z.object({
  firstname: IncludeExcludeSchema,
  lastname: IncludeExcludeSchema,
  currentJobTitle: IncludeExcludeSchema,
  pastJobTitle: IncludeExcludeSchema,
  currentCompanyName: IncludeExcludeSchema,
  pastCompanyName: IncludeExcludeSchema,
  currentCompanyUrn: IncludeExcludeSchema,
  pastCompanyUrn: IncludeExcludeSchema,
  school: IncludeExcludeSchema,
  headcount: RangeSchema,
  // Add other filters as needed based on API documentation
})

// Pagination schema
const PaginationSchema = z
  .object({
    size: z.number().int().positive().max(100).optional(),
    token: z.string().optional(),
  })
  .optional()

// Request body schema
const FindPeopleRequestBodySchema = z.object({
  query: FindPeopleQuerySchema,
  pagination: PaginationSchema,
})

export type FindPeopleRequestBody = z.infer<typeof FindPeopleRequestBodySchema>
export type FindPeopleQuery = z.infer<typeof FindPeopleQuerySchema>
export type IncludeExcludeFilter = z.infer<typeof IncludeExcludeSchema>
export type RangeFilter = z.infer<typeof RangeSchema>

// Response schemas - updated to match actual API response
const PersonSchema = z.object({
  firstname: z.string().nullable().optional(),
  lastname: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  profileUrl: z.string().nullable().optional(),
  lastJobTitle: z.string().nullable().optional(),
  lastJobDescription: z.string().nullable().optional(),
  lastJobStartDate: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  lastCompanyName: z.string().nullable().optional(),
  lastCompanyUrn: z.string().nullable().optional(),
  lastCompanyUrl: z.string().nullable().optional(),
  lastCompanyWebsite: z.string().nullable().optional(),
  lastCompanyDescription: z.string().nullable().optional(),
  lastCompanySize: z.number().nullable().optional(),
  lastCompanyIndustry: z.string().nullable().optional(),
  lastCompanyAddress: z.string().nullable().optional(),
})

const FindPeopleResponseSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  leads: z.array(PersonSchema),
  pagination: z
    .object({
      size: z.number(),
      token: z.string().nullable().optional(),
    })
    .optional(),
})

export type FindPeopleResponse = z.infer<typeof FindPeopleResponseSchema>
export type Person = z.infer<typeof PersonSchema>

export type FindPeopleParams = {
  query: FindPeopleQuery
  pagination?: {
    size?: number
    token?: string
  }
}

export const findPeople = async ({
  query,
  pagination,
}: FindPeopleParams): Promise<FindPeopleResponse> => {
  const validatedBody = FindPeopleRequestBodySchema.parse({
    query,
    pagination,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)

  try {
    const url = `${ICYPEAS_CONFIG.BASE_URL}/find-people`

    logger.info({
      msg: 'Icypeas Find People API request',
      event: 'icypeas_find_people_request',
      metadata: {
        url,
        hasQuery: !!query,
        hasPagination: !!pagination,
        paginationSize: pagination?.size,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ICYPEAS_CONFIG.API_KEY,
      },
      body: JSON.stringify(validatedBody),
      signal: controller.signal,
    })

    const data = await response.json()

    // Handle error responses (401, 429, validation errors)
    if (!response.ok) {
      logger.error({
        msg: 'Icypeas Find People API error response',
        event: 'icypeas_find_people_error_response',
        metadata: {
          status: response.status,
          data,
        },
      })

      // Handle specific error types
      if (response.status === 401) {
        throw new Error('Icypeas API authentication failed')
      }
      if (response.status === 429) {
        throw new Error('Icypeas API rate limit exceeded')
      }

      throw new Error(
        `Icypeas API error! status: ${response.status}, message: ${
          data.error || data.message || 'Unknown error'
        }`,
      )
    }

    logger.info({
      msg: 'Icypeas Find People API response received',
      event: 'icypeas_find_people_response',
      metadata: {
        status: response.status,
        hasData: !!data,
        peopleCount: data.leads?.length || 0,
        total: data.total,
      },
    })

    const parsedData = FindPeopleResponseSchema.parse(data)

    logger.info({
      msg: 'Icypeas Find People API response parsed successfully',
      event: 'icypeas_find_people_response_parsed',
      metadata: {
        success: parsedData.success,
        total: parsedData.total,
        peopleFound: parsedData.leads.length,
        hasToken: !!parsedData.pagination?.token,
        paginationSize: parsedData.pagination?.size,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({
        msg: 'Icypeas Find People API request timed out',
        event: 'icypeas_find_people_timeout',
        metadata: { error: error.message },
      })
      throw new Error('Icypeas Find People API request timed out')
    }

    if (error instanceof z.ZodError) {
      logger.error({
        msg: 'Icypeas Find People API response validation error',
        event: 'icypeas_find_people_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
        },
      })
      throw new Error(`Invalid response from Icypeas API: ${error.message}`)
    }

    logger.error({
      msg: 'Icypeas Find People API error',
      event: 'icypeas_find_people_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
