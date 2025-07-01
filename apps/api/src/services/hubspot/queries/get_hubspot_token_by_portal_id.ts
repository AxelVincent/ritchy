import { z } from 'zod'
import { db } from '../../../db/db'

// Input validation schema for portal ID
const PortalIdSchema = z.string().min(1, 'Portal ID cannot be empty').trim()

export const getHubspotTokenByPortalId = async (portalId: string) => {
  // Validate input parameter
  const validatedPortalId = PortalIdSchema.parse(portalId)

  const token = await db.query.hubspotToken.findFirst({
    where: (token, { eq }) => eq(token.portalId, validatedPortalId),
  })
  return token
}
