'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CaptureModal from './CaptureModal';
import { processQueue, runVoicePassIfDue } from '@/lib/queue';
import { ensureSeeded } from '@/lib/seed';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    ensureSeeded()
      .then(() => processQueue())
      .then(() => runVoicePassIfDue())
      .catch(() => {});
    const onOnline = () => processQueue().catch(() => {});
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <>
      {children}
      {pathname !== '/capture' && (
        <nav className="bottom-bar">
          <button onClick={() => setCaptureOpen(true)}>Capture</button>
          <Link href="/history">History</Link>
        </nav>
      )}
      {captureOpen && <CaptureModal onClose={() => setCaptureOpen(false)} />}
    </>
  );
}
