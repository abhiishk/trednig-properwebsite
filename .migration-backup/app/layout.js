import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'TrendyPrompt — Viral AI Prompts',
  description: 'A curated library of viral AI image and video prompts for ChatGPT, Gemini, Veo, Kling, Midjourney and more.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'TrendyPrompt — Viral AI Prompts',
    description: 'Discover, copy, and follow the latest viral AI prompts.',
    images: ['/apple-icon.svg'],
  },
  twitter: {
    card: 'summary',
    title: 'TrendyPrompt — Viral AI Prompts',
    description: 'Discover, copy, and follow the latest viral AI prompts.',
    images: ['/apple-icon.svg'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-white text-neutral-900">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
