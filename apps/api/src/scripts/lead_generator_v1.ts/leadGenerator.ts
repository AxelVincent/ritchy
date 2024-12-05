import 'dotenv/config'
import { sql } from 'drizzle-orm'

import { logger } from '@ritchy/logger'
import { db } from '../../db/db'
import { lead, leadEmail, queryParam } from '../../db/schema'
import { scrapeLeadDataFromWebsiteUrl } from '../../services/scrapeWebsiteData'
import { searchGoogleMaps } from './google_maps'
const RESEARCH_QUERY = 'salle de sport'
const PARIS_LAT = 48.8566
const PARIS_LON = 2.3522
const ZOOM = '12z'

async function getGmapLeads() {
  try {
    const results = await searchGoogleMaps(
      RESEARCH_QUERY,
      PARIS_LAT,
      PARIS_LON,
      ZOOM,
    )

    const queryParamResult = await db
      .insert(queryParam)
      .values({
        researchQuery: RESEARCH_QUERY,
        latitude: PARIS_LAT,
        longitude: PARIS_LON,
        zoom: ZOOM,
      })
      .returning({ id: queryParam.id })

    const leads = results.local_results.map((result) => {
      return {
        queryParamId: queryParamResult[0].id,
        name: result.title,
        address: result.address,
        phone: result.phone,
        website: result.website,
        description: result.description,
        latitude: result.gps_coordinates.latitude,
        longitude: result.gps_coordinates.longitude,
      }
    })

    await db.insert(lead).values(leads)
  } catch (error) {
    logger.error({
      msg: 'Error generating leads',
      event: 'generate_leads_error',
      metadata: { error },
    })
  }
  process.exit(0)
}

async function getLeadsContent() {
  const leadsWithWebsites = await db
    .select({
      id: lead.id,
      website: lead.website,
    })
    .from(lead)
    .where(sql`${lead.queryParamId} = 5`)
    .limit(20)
    .offset(0)
    .execute()

  if (leadsWithWebsites.length === 0) {
    logger.info({
      msg: 'No leads with websites found.',
      event: 'no_leads_with_websites_found',
    })
    return
  }

  const _leadData = await Promise.all(
    leadsWithWebsites.map(
      async (leadWithWebsite: { id: number; website: string | null }) => {
        const { id, website } = leadWithWebsite
        if (!website) return // TypeScript safety check

        const leadData = await scrapeLeadDataFromWebsiteUrl(website)

        if (!leadData?.leadStructuredData.emails.length) return

        await db
          .insert(leadEmail)
          .values(
            leadData.leadStructuredData.emails.map(
              (email: { email: string; isMatchingDomain: boolean }) => ({
                leadId: id,
                email: email.email,
                isMatchingDomain: email.isMatchingDomain,
              }),
            ),
          )
          .onConflictDoNothing()
        return { id, website, leadData }
      },
    ),
  )

  process.exit(0)
}

getGmapLeads()
getLeadsContent()
