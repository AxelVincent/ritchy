import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

const CodeBlock = ({ children, className, ...props }: CodeBlockProps) => {
  return (
    <div
      className={cn(
        'not-prose flex w-full flex-col overflow-hidden border',
        'border-border bg-card text-card-foreground rounded-xl',
        '[&_pre]:min-w-full [&_pre]:block [&_pre]:m-0',
        '[&_pre]:!bg-transparent [&_pre>code]:!bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

const CodeBlockCode = ({
  code,
  language = 'tsx',
  theme: themeProp,
  className,
  ...props
}: CodeBlockCodeProps) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(isDarkMode)
    }

    checkDarkMode()

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => checkDarkMode()
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    const highlight = async () => {
      if (!code) {
        setHighlightedHtml('<pre><code></code></pre>')
        return
      }

      // Use provided theme or auto-detect based on dark mode
      const shikiTheme = themeProp || (isDark ? 'github-dark' : 'github-light')

      const html = await codeToHtml(code, { lang: language, theme: shikiTheme })
      setHighlightedHtml(html)
    }
    highlight()
  }, [code, language, themeProp, isDark])

  const classNames = cn(
    'w-full overflow-auto text-[13px]',
    '[&>pre]:px-4 [&>pre]:py-4 [&>pre]:min-w-full [&>pre]:block [&>pre]:m-0',
    '[&>pre]:!bg-transparent [&>pre>code]:!bg-transparent',
    className,
  )

  // SSR fallback: render plain code if not hydrated yet
  return highlightedHtml ? (
    <div
      className={classNames}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

const CodeBlockGroup = ({
  children,
  className,
  ...props
}: CodeBlockGroupProps) => {
  return (
    <div
      className={cn('flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
