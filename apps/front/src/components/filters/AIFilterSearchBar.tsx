import { useGenerateFilters } from '@/api/mutations/filters/useGenerateFilters'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type {
  FilterRule,
  GeneratedFilter,
  ListFilterOptions,
} from '@ritchy/types'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { AIFilterPreviewModal } from './AIFilterPreviewModal'

interface AIFilterSearchBarProps {
  existingRules: FilterRule[]
  onApplyFilters: (newRules: FilterRule[]) => void
  filterOptions?: ListFilterOptions
}

// Helper to check if a string looks like a valid location name
const isValidLocationName = (name: string): boolean => {
  // Filter out test data: too short, all caps like "AAA", numbers only, etc.
  if (name.length < 3) return false
  if (/^[A-Z]+$/.test(name) && name.length < 4) return false // "AAA", "AA"
  if (/^\d+$/.test(name)) return false // Pure numbers
  return true
}

/**
 * AI-powered filter button that opens a popover for natural language input.
 * Designed as an inline element that fits naturally within the FilterBar.
 */
export const AIFilterSearchBar = ({
  existingRules,
  onApplyFilters,
  filterOptions,
}: AIFilterSearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [generatedFilters, setGeneratedFilters] = useState<GeneratedFilter[]>(
    [],
  )
  const [semanticQuery, setSemanticQuery] = useState<string | undefined>()
  const [reasoning, setReasoning] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const generateMutation = useGenerateFilters()
  const { toast } = useToast()

  // Generate dynamic quick suggestions based on user's actual data
  const quickSuggestions = useMemo(() => {
    const suggestions: string[] = []

    // Find first valid locality
    const validLocality = filterOptions?.locality?.find(isValidLocationName)
    const validCountry = filterOptions?.country?.find(isValidLocationName)

    if (validLocality) {
      suggestions.push(`in ${validLocality}`)
    } else if (validCountry) {
      suggestions.push(`in ${validCountry}`)
    }

    // Always add rating suggestion (universal)
    suggestions.push('with 4+ stars')

    // Always add reviews suggestion (universal)
    suggestions.push('50+ reviews')

    return suggestions
  }, [filterOptions])

  const handleGenerate = async () => {
    if (!query.trim()) return

    try {
      const result = await generateMutation.mutateAsync({ query: query.trim() })

      if ('error' in result) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      if (result.filters.length === 0 && !result.semanticQuery) {
        toast({
          title: 'No filters found',
          description:
            'Try being more specific, e.g. "restaurants in Paris with 4+ stars"',
        })
        return
      }

      setGeneratedFilters(result.filters)
      setSemanticQuery(result.semanticQuery)
      setReasoning(result.reasoning)
      setIsOpen(false)
      setPreviewOpen(true)
    } catch (_error) {
      toast({
        title: 'Generation failed',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleApply = (
    selectedFilters: FilterRule[],
    includeSemantic: boolean,
  ) => {
    const newRules = [...existingRules]

    for (const newRule of selectedFilters) {
      const existingIndex = newRules.findIndex(
        (r) => r.property === newRule.property,
      )
      if (existingIndex >= 0) {
        newRules[existingIndex] = newRule
      } else {
        newRules.push(newRule)
      }
    }

    if (includeSemantic && semanticQuery) {
      const semanticIndex = newRules.findIndex(
        (r) => r.property === 'semanticQuery',
      )
      const semanticRule: FilterRule = {
        id: `ai_semantic_${Date.now()}`,
        property: 'semanticQuery',
        type: 'text',
        operator: 'semantic_match',
        value: semanticQuery,
      }
      if (semanticIndex >= 0) {
        newRules[semanticIndex] = semanticRule
      } else {
        newRules.push(semanticRule)
      }
    }

    onApplyFilters(newRules)
    setPreviewOpen(false)
    setQuery('')
    setGeneratedFilters([])
    setSemanticQuery(undefined)

    toast({
      title: 'Filters applied',
      description: `${selectedFilters.length + (includeSemantic ? 1 : 0)} filter${selectedFilters.length + (includeSemantic ? 1 : 0) !== 1 ? 's' : ''} added.`,
    })
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    // Defer height adjustment to next tick after state update
    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
      }
    }, 0)
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground',
              isOpen && 'text-foreground bg-accent',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">AI filter</span>
            <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
              Beta
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[340px] p-3"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Describe what you're looking for
              </p>
              <p className="text-xs text-muted-foreground">
                AI will convert your query into filters
              </p>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="e.g. Italian restaurants with 4+ stars"
                rows={1}
                className={cn(
                  'w-full min-h-9 px-3 py-2 pr-8 text-sm rounded-md border border-input bg-background resize-none',
                  'placeholder:text-muted-foreground/60',
                  'focus:outline-none focus:ring-1 focus:ring-ring',
                )}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !generateMutation.isPending
                  ) {
                    e.preventDefault()
                    handleGenerate()
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="absolute right-2 top-2 p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                {quickSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      handleQueryChange(
                        query ? `${query} ${suggestion}` : suggestion,
                      )
                    }
                    className="px-2 py-0.5 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!query.trim() || generateMutation.isPending}
                className="h-7 px-3 shrink-0"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AIFilterPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        filters={generatedFilters}
        semanticQuery={semanticQuery}
        reasoning={reasoning}
        onApply={handleApply}
      />
    </>
  )
}
