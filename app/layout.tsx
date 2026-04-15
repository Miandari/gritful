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
  // Tells the browser to use dark/light default colors based on user
  // preference BEFORE any CSS loads. Without this, the browser shows a
  // white background during CSS download — visible as a 1-2s flash on
  // iOS PWA cold boot. With it, dark-mode users see a dark background
  // and light-mode users see white (matching their preference).
  colorScheme: 'dark light',
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
    startupImage: [
      // 750x1334 — iPhone SE 3rd gen (375x667 @2x)
      { url: '/splash/splash-dark-750x1334.png?v=2', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-750x1334.png?v=2', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-750x1334.png?v=2', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },

      // 1242x2208 — iPhone 8 Plus (414x736 @3x)
      { url: '/splash/splash-dark-1242x2208.png?v=2', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1242x2208.png?v=2', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1242x2208.png?v=2', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1125x2436 — iPhone X/XS/11 Pro/12 mini/13 mini/16e (375x812 @3x)
      { url: '/splash/splash-dark-1125x2436.png?v=2', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1125x2436.png?v=2', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1125x2436.png?v=2', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 828x1792 — iPhone XR/11 (414x896 @2x)
      { url: '/splash/splash-dark-828x1792.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-828x1792.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-828x1792.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },

      // 1242x2688 — iPhone XS Max/11 Pro Max (414x896 @3x)
      { url: '/splash/splash-dark-1242x2688.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1242x2688.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1242x2688.png?v=2', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1170x2532 — iPhone 12/12 Pro/13/13 Pro/14 (390x844 @3x)
      { url: '/splash/splash-dark-1170x2532.png?v=2', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1170x2532.png?v=2', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1170x2532.png?v=2', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1284x2778 — iPhone 12 Pro Max/13 Pro Max/14 Plus (428x926 @3x)
      { url: '/splash/splash-dark-1284x2778.png?v=2', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1284x2778.png?v=2', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1284x2778.png?v=2', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1179x2556 — iPhone 14 Pro/15/15 Pro/16 (393x852 @3x)
      { url: '/splash/splash-dark-1179x2556.png?v=2', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1179x2556.png?v=2', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1179x2556.png?v=2', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1290x2796 — iPhone 14 Pro Max/15 Pro Max/16 Plus (430x932 @3x)
      { url: '/splash/splash-dark-1290x2796.png?v=2', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1290x2796.png?v=2', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1290x2796.png?v=2', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1206x2622 — iPhone 16 Pro (402x874 @3x)
      { url: '/splash/splash-dark-1206x2622.png?v=2', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1206x2622.png?v=2', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1206x2622.png?v=2', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },

      // 1320x2868 — iPhone 16 Pro Max (440x956 @3x)
      { url: '/splash/splash-dark-1320x2868.png?v=2', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)' },
      { url: '/splash/splash-light-1320x2868.png?v=2', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)' },
      { url: '/splash/splash-dark-1320x2868.png?v=2', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
    ],
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
