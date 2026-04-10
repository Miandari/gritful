import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { preconnect, prefetchDNS } from 'react-dom';
import { Providers } from '@/components/shared/Providers';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Gritful - Build Better Habits',
  description: 'Create, join, and track challenges with custom metrics. Daily, weekly, or monthly - build grit at your own pace.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gritful',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Establish early connection to Supabase so the first auth/data request
  // on cold start doesn't pay the full DNS + TCP + TLS cost. React hoists
  // these hints into the earliest flushed chunk of the streamed response.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const supabaseOrigin = new URL(supabaseUrl).origin;
    preconnect(supabaseOrigin, { crossOrigin: 'anonymous' });
    prefetchDNS(supabaseOrigin);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('error',function(e){if(e.message&&e.message.includes('Loading chunk'))window.location.reload()});`,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
