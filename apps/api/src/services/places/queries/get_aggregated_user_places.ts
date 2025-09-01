import { db } from 'apps/api/src/db/db'
import { type InferSelectModel, sql } from 'drizzle-orm'
import type {
  enrichment,
  enrichmentEmail,
  enrichmentFacebook,
  enrichmentInstagram,
  enrichmentLinkedin,
  note,
  place,
} from '../../../db/schema'

// Infer types from the schemas
type Place = InferSelectModel<typeof place>
type EnrichmentEmail = InferSelectModel<typeof enrichmentEmail>
type EnrichmentLinkedin = InferSelectModel<typeof enrichmentLinkedin>
type EnrichmentFacebook = InferSelectModel<typeof enrichmentFacebook>
type EnrichmentInstagram = InferSelectModel<typeof enrichmentInstagram>
type Note = InferSelectModel<typeof note>

// Create the aggregated type using schema inference
export interface AggregatedUserPlace extends Place {
  notes: Array<{
    id: Note['id']
    text: Note['note']
    created_at: Note['createdAt']
  }>
  enrichment: {
    email: Array<{
      id: EnrichmentEmail['id']
      email: EnrichmentEmail['email']
      created_at: EnrichmentEmail['createdAt']
    }>
    linkedin: Array<{
      id: EnrichmentLinkedin['id']
      url: EnrichmentLinkedin['url']
      created_at: EnrichmentLinkedin['createdAt']
    }>
    instagram: Array<{
      id: EnrichmentInstagram['id']
      url: EnrichmentInstagram['url']
      created_at: EnrichmentInstagram['createdAt']
    }>
    facebook: Array<{
      id: EnrichmentFacebook['id']
      url: EnrichmentFacebook['url']
      created_at: EnrichmentFacebook['createdAt']
    }>
  } | null
}

export const getAggregatedUserPlaces = async (
  userId: string,
  searchId?: string,
  listId?: string,
): Promise<AggregatedUserPlace[]> => {
  const query = sql`
    SELECT
        p.*,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', n.id,
                    'text', n.note,
                    'created_at', n.created_at
                ) ORDER BY n.created_at DESC
            ) FILTER (WHERE n.id IS NOT NULL),
            '[]'::json
        ) as notes,
        CASE 
            WHEN e.id IS NOT NULL THEN
                JSONB_BUILD_OBJECT(
                    'email', COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'id', ee.id,
                                'email', ee.email,
                                'created_at', ee.created_at
                            )
                        ) FILTER (WHERE ee.id IS NOT NULL),
                        '[]'::jsonb
                    ),
                    'linkedin', COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'id', el.id,
                                'url', el.url,
                                'created_at', el.created_at
                            )
                        ) FILTER (WHERE el.id IS NOT NULL),
                        '[]'::jsonb
                    ),
                    'instagram', COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'id', ei.id,
                                'url', ei.url,
                                'created_at', ei.created_at
                            )
                        ) FILTER (WHERE ei.id IS NOT NULL),
                        '[]'::jsonb
                    ),
                    'facebook', COALESCE(
                        JSONB_AGG(
                            JSONB_BUILD_OBJECT(
                                'id', ef.id,
                                'url', ef.url,
                                'created_at', ef.created_at
                            )
                        ) FILTER (WHERE ef.id IS NOT NULL),
                        '[]'::jsonb
                    )
                )
            ELSE NULL
        END as enrichment
    FROM "user" u
    LEFT JOIN "search" s ON s.user_id = u.id AND s.id = ${searchId || null}
    LEFT JOIN "search_place" sp ON sp.search_id = s.id
    LEFT JOIN "list" l ON l.user_id = u.id AND l.id = ${listId || null}
    LEFT JOIN "list_place" lp ON lp.list_id = l.id
    LEFT JOIN "user_place" up ON up.id = COALESCE(sp.user_place_id, lp.user_place_id)
    LEFT JOIN "place" p ON p.id = up.place_id
    LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
    LEFT JOIN enrichment_email ee ON ee.enrichment_id = e.id
    LEFT JOIN enrichment_linkedin el ON el.enrichment_id = e.id
    LEFT JOIN enrichment_facebook ef ON ef.enrichment_id = e.id
    LEFT JOIN enrichment_instagram ei ON ei.enrichment_id = e.id
    LEFT JOIN "note" n ON n.user_place_id = up.id
    WHERE u.id = ${userId}
    AND (${searchId ? sql`s.id IS NOT NULL` : sql`FALSE`} OR ${listId ? sql`l.id IS NOT NULL` : sql`FALSE`})
    GROUP BY p.id, e.id
  `

  const result = await db.execute(query)
  return result as unknown as AggregatedUserPlace[]
}
