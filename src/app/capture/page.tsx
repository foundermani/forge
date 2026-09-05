'use client';

import { useRouter } from 'next/navigation';
import CaptureModal from '@/components/CaptureModal';

// Home-screen shortcut deep link: capturing is faster than opening Notes.
export default function CapturePage() {
  const router = useRouter();
  return <CaptureModal onClose={() => router.replace('/')} />;
}
