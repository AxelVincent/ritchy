import 'dotenv/config'
import { searchGoogleMaps } from '../services/gmap'
import { db } from 'src/db/db'
import { lead, queryParam } from 'src/db/schema'
import { sql } from 'drizzle-orm'
import { scrapeContactEmail } from './getEmail'

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

async function getWebsiteContentWithJina() {
  const leadsWithWebsites = await db
    .select({
      id: lead.id,
      website: lead.website
    })
    .from(lead)
    .where(sql`${lead.queryParamId} = 1`)
    .limit(3)
    .execute()

  if (leadsWithWebsites.length === 0) {
    console.log('No leads with websites found.')
    return
  }

  const emails = await Promise.all(
    leadsWithWebsites.map(async (leadWithWebsite) => {
      const { id, website } = leadWithWebsite
      if (!website) return // TypeScript safety check

      const email = await scrapeContactEmail(website)
      return { id, website, email }
    })
  )
  console.log('emails', emails)

  // const response = await fetch(`https://r.jina.ai/${website}`, {
  //   headers: {
  //     Authorization: `Bearer ${process.env.JINA_API_KEY}`
  //   }
  // })
  // const data = await response.json()
  // return data
  process.exit(0)
}

getWebsiteContentWithJina()
