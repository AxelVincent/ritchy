import { z } from 'zod'

// Base schema for registrant/administrative/technical contact info
const contactSchema = z.object({
  name: z.string().optional(),
  organization: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
})

// Contact schema that can be either a single object or an array of objects
const contactFieldSchema = z.union([contactSchema, z.array(contactSchema)])

// Domain schema
const domainSchema = z.object({
  id: z.string().optional(),
  domain: z.string(),
  punycode: z.string().optional(),
  name: z.string(),
  extension: z.string(),
  whois_server: z.string().optional(),
  status: z.array(z.string()).optional(),
  name_servers: z.array(z.string()).optional(),
  created_date: z.string().optional(),
  created_date_in_time: z.string().optional(),
  updated_date: z.string().optional(),
  updated_date_in_time: z.string().optional(),
  expiration_date: z.string().optional(),
  expiration_date_in_time: z.string().optional(),
})

// Registrar schema
const registrarSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  referral_url: z.string().optional(),
})

// Main WHOIS API response schema
const WhoisApiResponseSchema = z.object({
  domain: domainSchema,
  registrar: registrarSchema.optional(),
  registrant: contactFieldSchema.optional(),
  administrative: contactFieldSchema.optional(),
  technical: contactFieldSchema.optional(),
})

// Schema for error responses
const WhoisApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number().optional(),
})

// Type exports
export type WhoisApiResponse = z.infer<typeof WhoisApiResponseSchema>
export type WhoisApiError = z.infer<typeof WhoisApiErrorSchema>

// Helper function to validate and parse WHOIS API response
export const validateWhoisApiResponse = (data: unknown): WhoisApiResponse => {
  const result = WhoisApiResponseSchema.safeParse(data)

  if (!result.success) {
    throw new Error(`Invalid WHOIS API response: ${result.error.message}`)
  }

  return result.data
}

// Helper function to check if response is an error
export const isWhoisApiError = (data: unknown): data is WhoisApiError => {
  return WhoisApiErrorSchema.safeParse(data).success
}
