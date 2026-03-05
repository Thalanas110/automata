import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { LoadingScreenRemover } from '@/components/loading-screen'
import { getBaseUrl } from '@/server/functions/request'
import {
  createOGMetaTags,
  generateOGImageUrl,
  OGImageConfig,
  OGMetaTags,
} from '@/lib/og-config'

interface MyRouterContext {
  queryClient: QueryClient
}

const scripts: React.DetailedHTMLProps<
  React.ScriptHTMLAttributes<HTMLScriptElement>,
  HTMLScriptElement
>[] = []

if (import.meta.env.VITE_INSTRUMENTATION_SCRIPT_SRC) {
  scripts.push({
    src: import.meta.env.VITE_INSTRUMENTATION_SCRIPT_SRC,
    type: 'module',
  })
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => {
    const baseUrl = await getBaseUrl()

    return {
      baseUrl,
    }
  },
  head: ({ loaderData }) => {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : (loaderData?.baseUrl ?? 'https://localhost')

    const config: OGImageConfig = {
      isCustom: false,
    }

    const ogImageUrl = generateOGImageUrl(config, baseUrl)

    const metadata: OGMetaTags = {
      title: 'AutomataStudio',
      description:
        'An interactive automata theory tool for designing and simulating DFA, NFA, PDA, and Turing machines with AI-powered assistance and JFLAP export support.',
      image: ogImageUrl,
      url: typeof window !== 'undefined' ? window.location.href : baseUrl,
    }

    const ogTags = createOGMetaTags(metadata)

    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'AutomataStudio' },
        {
          name: 'description',
          content:
            'An interactive automata theory tool for designing and simulating DFA, NFA, PDA, and Turing machines with AI-powered assistance and JFLAP export support.',
        },
        ...ogTags.meta,
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous' as const,
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap',
        },
      ],
      scripts: [...scripts],
    }
  },

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {/* Static loading overlay — visible before React hydrates */}
        <div id="app-loading">
          <div className="app-loading__spinner">
            <div className="app-loading__ring" />
            <div className="app-loading__dot" />
          </div>
          <span className="app-loading__title">AutomataStudio</span>
          <span className="app-loading__subtitle">Loading…</span>
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Fades out the overlay once React is interactive */}
          <LoadingScreenRemover />
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
