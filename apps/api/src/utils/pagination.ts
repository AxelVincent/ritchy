import type { PaginationMeta, PaginationParams } from '../shared'

/**
 * Calculate pagination metadata from params and total item count
 */
export const calculatePagination = (
  params: Pick<PaginationParams, 'page' | 'pageSize'>,
  totalItems: number,
): PaginationMeta => {
  const { page, pageSize } = params
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Calculate the SQL OFFSET value from pagination params
 */
export const calculateOffset = (
  params: Pick<PaginationParams, 'page' | 'pageSize'>,
): number => {
  return (params.page - 1) * params.pageSize
}

/**
 * Calculate which page contains a specific item index (0-based index)
 */
export const getPageForIndex = (index: number, pageSize: number): number => {
  return Math.floor(index / pageSize) + 1
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

/**
 * Get safe pagination params with defaults
 */
export const getSafePaginationParams = (
  params?: Partial<PaginationParams>,
): Pick<PaginationParams, 'page' | 'pageSize'> => {
  return {
    page: Math.max(1, params?.page ?? DEFAULT_PAGE),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE),
    ),
  }
}
