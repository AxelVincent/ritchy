import { describe, expect, it } from 'vitest'
import { prepareScriptsForLLM } from '../llm_detector_utils'
import type { ExtractedScript } from '../types'

describe('llm_detector', () => {
  describe('prepareScriptsForLLM', () => {
    it('should truncate scripts to MAX_SCRIPT_LENGTH', () => {
      const longValue = 'a'.repeat(500)
      const scripts: ExtractedScript[] = [
        {
          type: 'inline_code',
          value: longValue,
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      expect(prepared).toHaveLength(1)
      expect(prepared[0].value).toHaveLength(250) // MAX_SCRIPT_LENGTH
      expect(prepared[0].value).toBe(longValue.slice(0, 250))
    })

    it('should keep short scripts unchanged', () => {
      const shortValue = 'console.log("test");'
      const scripts: ExtractedScript[] = [
        {
          type: 'inline_code',
          value: shortValue,
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      expect(prepared).toHaveLength(1)
      expect(prepared[0].value).toBe(shortValue)
    })

    it('should select scripts within token budget', () => {
      // Each script is ~62 chars = ~15 tokens
      // With 4000 token budget, we can fit ~266 scripts (4000/15)
      // But we only have 50, so all should fit
      const scripts: ExtractedScript[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'script_url',
        value: `https://example.com/script-${i}.js?param=value&other=data`,
      }))

      const prepared = prepareScriptsForLLM(scripts)

      // All 50 should fit in the budget
      expect(prepared.length).toBe(50)
      expect(prepared.length).toBeGreaterThan(0)
    })

    it('should stop when token budget is exceeded', () => {
      // Create scripts that will exceed budget
      const largeScripts: ExtractedScript[] = Array.from(
        { length: 100 },
        (_) => ({
          type: 'inline_code',
          value: 'x'.repeat(250), // MAX_SCRIPT_LENGTH
        }),
      )

      const prepared = prepareScriptsForLLM(largeScripts)

      // Each script is 250 chars = ~62 tokens
      // With 4000 token budget: 4000/62 = ~64 scripts max
      expect(prepared.length).toBeLessThan(100)
      expect(prepared.length).toBeGreaterThan(50)
      expect(prepared.length).toBeLessThanOrEqual(65)
    })

    it('should preserve script type', () => {
      const scripts: ExtractedScript[] = [
        {
          type: 'script_url',
          value: 'https://example.com/script.js',
        },
        {
          type: 'inline_code',
          value: 'console.log("test");',
        },
        {
          type: 'meta_tag',
          value: 'generator:WordPress',
        },
        {
          type: 'iframe',
          value: 'https://example.com/widget',
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      expect(prepared[0].type).toBe('script_url')
      expect(prepared[1].type).toBe('inline_code')
      expect(prepared[2].type).toBe('meta_tag')
      expect(prepared[3].type).toBe('iframe')
    })

    it('should handle empty array', () => {
      const prepared = prepareScriptsForLLM([])

      expect(prepared).toHaveLength(0)
    })

    it('should handle single script', () => {
      const scripts: ExtractedScript[] = [
        {
          type: 'script_url',
          value: 'https://example.com/script.js',
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      expect(prepared).toHaveLength(1)
      expect(prepared[0]).toEqual(scripts[0])
    })

    it('should handle very large single script that exceeds budget', () => {
      // A script so large that even truncated it might be close to budget
      const scripts: ExtractedScript[] = [
        {
          type: 'inline_code',
          value: 'x'.repeat(10000),
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      // Should still include it, but truncated
      expect(prepared).toHaveLength(1)
      expect(prepared[0].value).toHaveLength(250)
    })

    it('should maintain script order', () => {
      const scripts: ExtractedScript[] = [
        {
          type: 'script_url',
          value: 'https://first.com/script.js',
        },
        {
          type: 'script_url',
          value: 'https://second.com/script.js',
        },
        {
          type: 'script_url',
          value: 'https://third.com/script.js',
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      expect(prepared[0].value).toContain('first.com')
      expect(prepared[1].value).toContain('second.com')
      expect(prepared[2].value).toContain('third.com')
    })

    it('should truncate all script types consistently', () => {
      const longValue = 'a'.repeat(500)
      const scripts: ExtractedScript[] = [
        {
          type: 'script_url',
          value: `https://example.com/?${longValue}`,
        },
        {
          type: 'inline_code',
          value: longValue,
        },
        {
          type: 'meta_tag',
          value: `name:${longValue}`,
        },
        {
          type: 'iframe',
          value: `https://example.com/widget?${longValue}`,
        },
      ]

      const prepared = prepareScriptsForLLM(scripts)

      // All should be truncated to 250 chars
      expect(prepared.every((s) => s.value.length === 250)).toBe(true)
    })

    it('should select maximum number of small scripts', () => {
      // Create many small scripts
      const scripts: ExtractedScript[] = Array.from(
        { length: 200 },
        (_, i) => ({
          type: 'script_url',
          value: `https://a.com/${i}.js`, // Very small scripts
        }),
      )

      const prepared = prepareScriptsForLLM(scripts)

      // Should be able to fit many small scripts in 4000 token budget
      // Each is ~20 chars = ~5 tokens
      // 4000 / 5 = 800 potential, but we only have 200
      expect(prepared.length).toBe(200) // All should fit
    })

    it('should handle mixed size scripts efficiently', () => {
      const scripts: ExtractedScript[] = [
        {
          type: 'script_url',
          value: 'https://small.com/a.js',
        }, // Small: ~5 tokens
        {
          type: 'inline_code',
          value: 'x'.repeat(250),
        }, // Large: ~62 tokens
        {
          type: 'script_url',
          value: 'https://small.com/b.js',
        }, // Small: ~5 tokens
        {
          type: 'inline_code',
          value: 'x'.repeat(250),
        }, // Large: ~62 tokens
      ]

      const prepared = prepareScriptsForLLM(scripts)

      // All 4 should fit (total ~144 tokens)
      expect(prepared).toHaveLength(4)
    })
  })
})
