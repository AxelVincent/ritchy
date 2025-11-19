export type ExtractedScript = {
  type: 'script_url' | 'inline_code' | 'meta_tag' | 'iframe'
  value: string
}

export type DetectedTechnology = {
  technology: string
  category: string
  confidence: number
  evidence: string
  detectionMethod: 'pattern' | 'llm'
  patternId?: string
}

export type LLMIdentification = {
  technology: string
  category: string
  confidence: number
  evidence: string
  keyPattern: string
}
