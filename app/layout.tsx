import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/shared/Providers';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gritful - Build Better Habits',
  description: 'Create, join, and track challenges with custom metrics. Daily, weekly, or monthly - build grit at your own pace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
