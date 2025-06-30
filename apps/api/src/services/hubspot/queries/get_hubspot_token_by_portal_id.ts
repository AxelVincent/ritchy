import { db } from '../../../db/db'

export const getHubspotTokenByPortalId = async (portalId: string) => {
  const token = await db.query.hubspotToken.findFirst({
    where: (token, { eq }) => eq(token.portalId, portalId),
  })
  return token
}
