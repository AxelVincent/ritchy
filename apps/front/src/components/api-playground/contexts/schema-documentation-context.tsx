'use client'

import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type {
  DataSource,
  FieldMetadata,
  SchemaDocumentationContextValue,
} from '../types/field-metadata'
import {
  flattenFields,
  getValueByPath,
  searchFields as searchFieldsUtil,
} from '../utils/schema-extractor'
import { API_SCHEMA_METADATA } from '../utils/schema-metadata'

/**
 * Context for schema documentation state and utilities
 */
const SchemaDocumentationContext = createContext<
  SchemaDocumentationContextValue | undefined
>(undefined)

interface SchemaDocumentationProviderProps {
  children: ReactNode
  response: ApiV1CompanyEnrichmentSuccessResponse | null
}

/**
 * Provider component for schema documentation
 * Wraps the response display and provides schema metadata and state
 */
export const SchemaDocumentationProvider = ({
  children,
  response,
}: SchemaDocumentationProviderProps) => {
  // State
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Memoize flat field list for searching
  const flatFields = useMemo(() => flattenFields(API_SCHEMA_METADATA), [])

  // Get metadata for a specific field path
  const getFieldMetadata = useCallback(
    (path: string): FieldMetadata | undefined => {
      return flatFields.find((field) => field.path === path)
    },
    [flatFields],
  )

  // Get example value from response data
  const getFieldExample = useCallback(
    (path: string): unknown => {
      if (!response) return undefined
      return getValueByPath(response, path)
    },
    [response],
  )

  // Search fields by query
  const searchFields = useCallback((query: string): FieldMetadata[] => {
    return searchFieldsUtil(API_SCHEMA_METADATA, query)
  }, [])

  // Get fields by data source
  const getFieldsBySource = useCallback(
    (source: DataSource): FieldMetadata[] => {
      return flatFields.filter((field) => field.source === source)
    },
    [flatFields],
  )

  // Toggle panel collapse
  const togglePanelCollapsed = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev)
  }, [])

  // Context value
  const value: SchemaDocumentationContextValue = useMemo(
    () => ({
      // State
      fields: API_SCHEMA_METADATA,
      selectedField,
      hoveredField,
      searchQuery,
      isPanelCollapsed,

      // Actions
      setSelectedField,
      setHoveredField,
      setSearchQuery,
      togglePanelCollapsed,

      // Utilities
      getFieldMetadata,
      getFieldExample,
      searchFields,
      getFieldsBySource,
    }),
    [
      selectedField,
      hoveredField,
      searchQuery,
      isPanelCollapsed,
      togglePanelCollapsed,
      getFieldMetadata,
      getFieldExample,
      searchFields,
      getFieldsBySource,
    ],
  )

  return (
    <SchemaDocumentationContext.Provider value={value}>
      {children}
    </SchemaDocumentationContext.Provider>
  )
}

/**
 * Hook to access schema documentation context
 * Must be used within a SchemaDocumentationProvider
 */
export const useSchemaDocumentation = (): SchemaDocumentationContextValue => {
  const context = useContext(SchemaDocumentationContext)

  if (context === undefined) {
    throw new Error(
      'useSchemaDocumentation must be used within a SchemaDocumentationProvider',
    )
  }

  return context
}

/**
 * Hook to check if we're within a schema documentation provider
 * Returns undefined if not within provider (safe to use outside)
 */
export const useSchemaDocumentationOptional = ():
  | SchemaDocumentationContextValue
  | undefined => {
  return useContext(SchemaDocumentationContext)
}
