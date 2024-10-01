import 'dotenv/config'
import { searchGoogleMaps } from '../services/gmap'
import { db } from 'src/db/db'
import { lead, queryParam } from 'src/db/schema'
import { sql } from 'drizzle-orm'
import { scrapeLeadDataFromWebsiteUrl } from './getEmail'

const RESEARCH_QUERY = 'Label musique'
const PARIS_LAT = 48.8566
const PARIS_LON = 2.3522
const ZOOM = '12z'

async function generateGmapLeads() {
  try {
    const results = await searchGoogleMaps(
      RESEARCH_QUERY,
      PARIS_LAT,
      PARIS_LON,
      ZOOM
    )

    const queryParamResult = await db
      .insert(queryParam)
      .values({
        researchQuery: RESEARCH_QUERY,
        latitude: PARIS_LAT,
        longitude: PARIS_LON,
        zoom: ZOOM
      })
      .returning({ id: queryParam.id })

    const leads = results.local_results.map((result) => {
      return {
        queryParamId: queryParamResult[0].id,
        name: result.title,
        address: result.address,
        phone: result.phone,
        website: result.website,
        latitude: result.gps_coordinates.latitude,
        longitude: result.gps_coordinates.longitude
      }
    })

    await db.insert(lead).values(leads)
  } catch (error) {
    console.error('Error generating leads:', error)
  }
  process.exit(0)
}

async function getLeadsContent() {
  const leadsWithWebsites = await db
    .select({
      id: lead.id,
      website: lead.website
    })
    .from(lead)
    .where(sql`${lead.queryParamId} = 1`)
    .limit(20)
    .offset(0)
    .execute()

  if (leadsWithWebsites.length === 0) {
    console.log('No leads with websites found.')
    return
  }

  const leadData = await Promise.all(
    leadsWithWebsites.map(async (leadWithWebsite) => {
      const { id, website } = leadWithWebsite
      if (!website) return // TypeScript safety check

      const leadData = await scrapeLeadDataFromWebsiteUrl(website)
      return { id, website, leadData }
    })
  )
  console.log('leadData', leadData)

  const leadConsoleData = leadData.map((lead) => {
    return {
      website: lead?.website,
      description: lead?.leadData?.leadStructuredData.description,
      email: lead?.leadData?.leadStructuredData.emails,
      emailMatchWithDomainName:
        lead?.leadData?.leadStructuredData.emailMatchWithDomainName
    }
  })

  console.log('leadConsoleData', leadConsoleData)

  process.exit(0)
}

getLeadsContent()
