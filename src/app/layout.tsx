import type { Metadata, Viewport } from 'next';
import { Newsreader } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Forge',
  description: 'One hard songwriting problem per day.',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Forge',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={serif.variable}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
