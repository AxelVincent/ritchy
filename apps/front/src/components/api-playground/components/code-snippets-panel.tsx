import { Button } from '@/components/ui/button'
import { CodeBlock, CodeBlockCode } from '@/components/ui/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Copy } from 'lucide-react'
import type { CodeSnippets } from '../utils'

interface CodeSnippetsPanelProps {
  codeSnippets: CodeSnippets
  activeTab: string
  onTabChange: (tab: string) => void
  codeCopied: boolean
  onCopyCode: () => void
}

export const CodeSnippetsPanel = ({
  codeSnippets,
  activeTab,
  onTabChange,
  codeCopied,
  onCopyCode,
}: CodeSnippetsPanelProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Enrich a company</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Get enriched company data from a Google Place ID or Maps URL.
      </p>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="javascript">JS</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={onCopyCode}>
            {codeCopied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {codeCopied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>

        {Object.entries(codeSnippets).map(([lang, code]) => (
          <TabsContent key={lang} value={lang} className="mt-3">
            <CodeBlock>
              <CodeBlockCode code={code} language={lang} />
            </CodeBlock>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
