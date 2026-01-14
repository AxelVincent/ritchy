import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiKeyListItem } from '@api/shared'
import { Code, Key, MessageCircleQuestion, Plus } from 'lucide-react'
import type { CodeSnippets } from '../utils'
import { ApiKeyList } from './api-key-list'
import { CodeSnippetsPanel } from './code-snippets-panel'
import { ResponseExamples } from './response-examples'

interface CodeDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  // API Key props
  keys: ApiKeyListItem[]
  keysLoading: boolean
  selectedKeyId: string | null
  onSelectKey: (id: string) => void
  showKey: boolean
  onToggleShowKey: () => void
  fullApiKey?: string
  keySecretLoading: boolean
  keyCopied: boolean
  onCopyKey: () => void
  getMaskedKey: (key: string) => string
  onCreateClick: () => void
  // Code snippets props
  codeSnippets: CodeSnippets
  activeCodeTab: string
  onCodeTabChange: (tab: string) => void
  codeCopied: boolean
  onCopyCode: () => void
}

export const CodeDrawer = ({
  isOpen,
  onOpenChange,
  keys,
  keysLoading,
  selectedKeyId,
  onSelectKey,
  showKey,
  onToggleShowKey,
  fullApiKey,
  keySecretLoading,
  keyCopied,
  onCopyKey,
  getMaskedKey,
  onCreateClick,
  codeSnippets,
  activeCodeTab,
  onCodeTabChange,
  codeCopied,
  onCopyCode,
}: CodeDrawerProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
          <SheetTitle>Developer Tools</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="code" className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full justify-start px-6 bg-transparent border-b rounded-none h-auto py-0 shrink-0">
            <TabsTrigger
              value="code"
              className="px-4 py-2.5 text-sm gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Code className="h-3.5 w-3.5" />
              Code
            </TabsTrigger>
            <TabsTrigger
              value="keys"
              className="px-4 py-2.5 text-sm gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Key className="h-3.5 w-3.5" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Code Tab */}
          <TabsContent
            value="code"
            className="mt-0 px-6 py-4 flex flex-col flex-1 min-h-0 gap-6"
          >
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://wa.me/33554547066"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircleQuestion className="h-4 w-4 mr-2" />
                Any questions? Contact us on WhatsApp
              </a>
            </Button>

            {/* Code Snippets */}
            <div className="shrink-0">
              <CodeSnippetsPanel
                codeSnippets={codeSnippets}
                activeTab={activeCodeTab}
                onTabChange={onCodeTabChange}
                codeCopied={codeCopied}
                onCopyCode={onCopyCode}
              />
            </div>

            {/* Response Examples - Takes remaining space */}
            <ResponseExamples />
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="mt-0 px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Your API Keys</h3>
              <Button variant="outline" size="sm" onClick={onCreateClick}>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>

            <ApiKeyList
              keys={keys}
              keysLoading={keysLoading}
              selectedKeyId={selectedKeyId}
              onSelectKey={onSelectKey}
              showKey={showKey}
              onToggleShowKey={onToggleShowKey}
              fullApiKey={fullApiKey}
              keySecretLoading={keySecretLoading}
              keyCopied={keyCopied}
              onCopyKey={onCopyKey}
              getMaskedKey={getMaskedKey}
              onCreateClick={onCreateClick}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
