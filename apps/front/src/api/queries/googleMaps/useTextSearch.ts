import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import {
	type ApiResponse,
	createMockTextSearchAPI
} from './mock/mockTextSearch'

const mockAPI = createMockTextSearchAPI()

interface UseTextSearchOptions {
	query: string
	pageSize?: number
	location?: {
		latitude: number
		longitude: number
		radius?: number
	}
}

export const useTextSearch = ({
	query,
	pageSize = 20,
	location
}: UseTextSearchOptions): UseQueryResult<ApiResponse> => {
	return useQuery({
		queryKey: ['places', 'text-search', query, pageSize, location],
		queryFn: () =>
			mockAPI.textSearch({
				textQuery: query,
				pageSize,
				...(location && {
					locationBias: {
						circle: {
							center: {
								latitude: location.latitude,
								longitude: location.longitude
							},
							radius: location.radius ?? 500 // Default 500m radius if not specified
						}
					}
				})
			}),
		enabled: !!query, // Only run query if search text is provided
		staleTime: 1000 * 60 * 5 // Consider data stale after 5 minutes
	})
}
