'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDay, reroll, drawAnother, saveCurrentDay } from '@/lib/draw';
import { dayNumber, getCounters, type CurrentDay, type Counters, type Depth } from '@/lib/db';
import CaptureModal from '@/components/CaptureModal';

export default function Today() {
  const [day, setDay] = useState<CurrentDay | null>(null);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setCounters(await getCounters());
      setDay(await getCurrentDay());
    })();
  }, []);

  if (!day || !counters) return <main />;

  async function start(depth: Depth) {
    const now = Date.now();
    const next: CurrentDay = {
      ...day!,
      depth,
      startedAt: now,
      endsAt: now + depth * 60_000,
      completedAt: undefined,
    };
    await saveCurrentDay(next);
    router.push('/write');
  }

  async function onReroll() {
    if (!day || day.rerolled) return;
    setDay(await reroll(day));
  }

  async function onDrawAnother() {
    setDay(await drawAnother());
  }

  const header = (
    <p className="small">
      Day {dayNumber(counters.startDate)} ·{' '}
      <span className="counter">
        {counters.problemsSolved} {counters.problemsSolved === 1 ? 'problem' : 'problems'} solved
      </span>
    </p>
  );

  if (day.completedAt) {
    return (
      <main>
        {header}
        <div style={{ marginTop: '4rem' }}>
          <p className="hero struck">{day.assignmentText}</p>
          <p className="pillar-label" style={{ marginTop: '0.75rem' }}>
            {day.pillar === 'music' ? 'music as meaning' : day.pillar}
          </p>
        </div>
        <p style={{ marginTop: '3rem' }}>Done. Capture one observation before bed.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => setCaptureOpen(true)}>
            Capture
          </button>
          <button className="btn-text" onClick={onDrawAnother}>
            Draw another problem
          </button>
        </div>
        {captureOpen && <CaptureModal onClose={() => setCaptureOpen(false)} />}
      </main>
    );
  }

  const inProgress = !!day.startedAt;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 4rem)' }}>
      {header}
      <div style={{ marginTop: '4rem', flex: 1 }}>
        <p className="hero">{day.assignmentText}</p>
        <p className="pillar-label" style={{ marginTop: '0.75rem' }}>
          {day.pillar === 'music' ? 'music as meaning' : day.pillar}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '3rem' }}>
        {inProgress ? (
          <button className="btn" onClick={() => router.push('/write')}>
            Return to session
          </button>
        ) : (
          <>
            <button className="btn" onClick={() => start(15)}>
              Rep · 15 min
            </button>
            <button className="btn" onClick={() => start(30)}>
              Session · 30 min
            </button>
            <button className="btn" onClick={() => start(60)}>
              Deep · 60 min
            </button>
          </>
        )}
      </div>
      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <button className="btn-text" onClick={onReroll} disabled={day.rerolled}>
          {day.rerolled ? 'rerolled' : 'reroll'}
        </button>
      </div>
    </main>
  );
}
