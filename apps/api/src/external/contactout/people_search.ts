import { logger } from '@ritchy/logger'
import z from 'zod'
import { CONTACTOUT_CONFIG } from '../../config/contactout'

// Request Schema
const PeopleSearchRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  name: z.string().optional(),
  job_title: z.array(z.string()).optional(),
  exclude_job_titles: z.array(z.string()).optional(),
  current_titles_only: z.boolean().optional(),
  include_related_job_titles: z.boolean().optional(),
  job_function: z.array(z.string()).optional(),
  seniority: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  company: z.array(z.string()).optional(),
  company_filter: z.enum(['current', 'past', 'both']).optional(),
  exclude_companies: z.array(z.string()).optional(),
  match_experience: z.enum(['current', 'past', 'both']).optional(),
  domain: z.array(z.string().url()).optional(),
  industry: z.array(z.string()).optional(),
  keyword: z.string().optional(),
  company_size: z.array(z.string()).optional(),
  years_of_experience: z.array(z.string()).optional(),
  years_in_current_role: z.array(z.string()).optional(),
  current_company_only: z.boolean().optional(),
  data_types: z
    .array(z.enum(['personal_email', 'work_email', 'phone']))
    .optional(),
  reveal_info: z.boolean().optional(),
  detailed_experience: z.boolean().optional(),
  detailed_education: z.boolean().optional(),
})

export type PeopleSearchRequest = z.infer<typeof PeopleSearchRequestSchema>

// Response Schemas
const CompanySchema = z.object({
  name: z.string(),
  url: z.string().url().nullable(),
  domain: z.string().nullable(),
  email_domain: z.string().nullable(),
  overview: z.string().nullable(),
  type: z.string().nullable(),
  size: z.number().nullable(),
  country: z.string().nullable(),
  revenue: z.number().nullable(),
  founded_at: z.number().nullable(),
  industry: z.string().nullable(),
  headquarter: z.string().nullable(),
  website: z.string().url().nullable(),
  logo_url: z.string().url().nullable(),
  specialties: z.array(z.string()).nullable(),
  locations: z.array(z.string()).nullable(),
})

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: z.string(),
})

const CertificationSchema = z.object({
  name: z.string(),
  authority: z.string().nullable(),
  license: z.string().nullable(),
  start_date_year: z.number().nullable(),
  start_date_month: z.number().nullable(),
  end_date_year: z.number().nullable(),
  end_date_month: z.number().nullable(),
})

const PublicationSchema = z.object({
  url: z.string().url().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  publisher: z.string().nullable(),
  authors: z.array(z.string()).nullable(),
  published_on_year: z.number().nullable(),
  published_on_month: z.number().nullable(),
  published_on_day: z.number().nullable(),
})

const ProjectSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  start_date_year: z.number().nullable(),
  start_date_month: z.number().nullable(),
  end_date_year: z.number().nullable(),
  end_date_month: z.number().nullable(),
})

const ContactAvailabilitySchema = z.object({
  personal_email: z.boolean().nullable(),
  work_email: z.boolean().nullable(),
  phone: z.boolean().nullable(),
})

const WorkEmailStatusSchema = z.record(z.string())

const ContactInfoSchema = z.object({
  emails: z.array(z.string().email()).nullable(),
  personal_emails: z.array(z.string().email()).nullable(),
  work_emails: z.array(z.string().email()).nullable(),
  work_email_status: WorkEmailStatusSchema.nullable(),
  phones: z.array(z.string()).nullable(),
})

const ProfileSchema = z.object({
  li_vanity: z.string().nullable(),
  full_name: z.string().nullable(),
  title: z.string().nullable(),
  headline: z.string().nullable(),
  company: CompanySchema.nullable(),
  location: z.string().nullable(),
  country: z.string().nullable(),
  industry: z.string().nullable(),
  experience: z.array(z.string()).nullable(),
  education: z.array(z.string()).nullable(),
  skills: z.array(z.string()).nullable(),
  summary: z.string().nullable(),
  languages: z.array(LanguageSchema).nullable(),
  certifications: z.array(CertificationSchema).nullable(),
  publications: z.array(PublicationSchema).nullable(),
  projects: z.array(ProjectSchema).nullable(),
  followers: z.number().nullable(),
  updated_at: z.string().nullable(),
  profile_picture_url: z.string().url().nullable(),
  job_function: z.string().nullable(),
  seniority: z.string().nullable(),
  work_status: z.string().nullable(),
  contact_availability: ContactAvailabilitySchema.nullable(),
  contact_info: ContactInfoSchema.nullable(),
})

const ProfilesSchema = z.record(z.string().url(), ProfileSchema)

const MetadataSchema = z.object({
  page: z.number(),
  page_size: z.number(),
  total_results: z.number(),
})

const PeopleSearchResponseSchema = z.object({
  status_code: z.number(),
  metadata: MetadataSchema,
  profiles: ProfilesSchema,
})

export type PeopleSearchResponse = z.infer<typeof PeopleSearchResponseSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Company = z.infer<typeof CompanySchema>

export type PeopleSearchParams = {
  page?: number
  name?: string
  jobTitle?: string[]
  excludeJobTitles?: string[]
  currentTitlesOnly?: boolean
  includeRelatedJobTitles?: boolean
  jobFunction?: string[]
  seniority?: string[]
  skills?: string[]
  education?: string[]
  location?: string[]
  company?: string[]
  companyFilter?: 'current' | 'past' | 'both'
  excludeCompanies?: string[]
  matchExperience?: 'current' | 'past' | 'both'
  domain?: string[]
  industry?: string[]
  keyword?: string
  companySize?: string[]
  yearsOfExperience?: string[]
  yearsInCurrentRole?: string[]
  currentCompanyOnly?: boolean
  dataTypes?: Array<'personal_email' | 'work_email' | 'phone'>
  revealInfo?: boolean
  detailedExperience?: boolean
  detailedEducation?: boolean
}

export const peopleSearch = async (
  params: PeopleSearchParams,
): Promise<PeopleSearchResponse> => {
  // Transform camelCase params to snake_case for API
  const requestBody: z.infer<typeof PeopleSearchRequestSchema> = {
    page: params.page,
    name: params.name,
    job_title: params.jobTitle,
    exclude_job_titles: params.excludeJobTitles,
    current_titles_only: params.currentTitlesOnly,
    include_related_job_titles: params.includeRelatedJobTitles,
    job_function: params.jobFunction,
    seniority: params.seniority,
    skills: params.skills,
    education: params.education,
    location: params.location,
    company: params.company,
    company_filter: params.companyFilter,
    exclude_companies: params.excludeCompanies,
    match_experience: params.matchExperience,
    domain: params.domain,
    industry: params.industry,
    keyword: params.keyword,
    company_size: params.companySize,
    years_of_experience: params.yearsOfExperience,
    years_in_current_role: params.yearsInCurrentRole,
    current_company_only: params.currentCompanyOnly,
    data_types: params.dataTypes,
    reveal_info: params.revealInfo,
    detailed_experience: params.detailedExperience,
    detailed_education: params.detailedEducation,
  }

  // Remove undefined values
  const cleanedBody = Object.fromEntries(
    Object.entries(requestBody).filter(([_, value]) => value !== undefined),
  )

  const validatedBody = PeopleSearchRequestSchema.parse(cleanedBody)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)

  try {
    const url = `${CONTACTOUT_CONFIG.BASE_URL}/people/search`

    logger.info({
      msg: 'ContactOut People Search API request',
      event: 'contactout_people_search_request',
      metadata: {
        url,
        page: validatedBody.page,
        name: validatedBody.name,
        hasFilters: Object.keys(cleanedBody).length > 1,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        token: CONTACTOUT_CONFIG.API_KEY,
      },
      body: JSON.stringify(validatedBody),
      signal: controller.signal,
    })

    const data = await response.json()

    // Handle error responses
    if (!response.ok) {
      logger.error({
        msg: 'ContactOut People Search API error response',
        event: 'contactout_people_search_error_response',
        metadata: {
          status: response.status,
          statusCode: data.status_code,
          data,
        },
      })

      // Handle specific error types
      if (response.status === 401) {
        throw new Error('ContactOut API authentication failed')
      }
      if (response.status === 429) {
        throw new Error('ContactOut API rate limit exceeded')
      }

      throw new Error(
        `ContactOut API error! status: ${response.status}, status_code: ${
          data.status_code || 'Unknown'
        }, message: ${data.message || 'Unknown error'}`,
      )
    }

    logger.info({
      msg: 'ContactOut People Search API response received',
      event: 'contactout_people_search_response',
      metadata: {
        status: response.status,
        statusCode: data.status_code,
        totalResults: data.metadata?.total_results,
        profilesCount: data.profiles ? Object.keys(data.profiles).length : 0,
      },
    })

    const parsedData = PeopleSearchResponseSchema.parse(data)

    logger.info({
      msg: 'ContactOut People Search API response parsed successfully',
      event: 'contactout_people_search_response_parsed',
      metadata: {
        statusCode: parsedData.status_code,
        totalResults: parsedData.metadata.total_results,
        profilesCount: Object.keys(parsedData.profiles).length,
        page: parsedData.metadata.page,
        pageSize: parsedData.metadata.page_size,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({
        msg: 'ContactOut People Search API request timed out',
        event: 'contactout_people_search_timeout',
        metadata: { error: error.message },
      })
      throw new Error('ContactOut People Search API request timed out')
    }

    if (error instanceof z.ZodError) {
      logger.error({
        msg: 'ContactOut People Search API response validation error',
        event: 'contactout_people_search_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
        },
      })
      throw new Error(`Invalid response from ContactOut API: ${error.message}`)
    }

    logger.error({
      msg: 'ContactOut People Search API error',
      event: 'contactout_people_search_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
