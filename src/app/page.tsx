'use client';

import { useEffect, useState } from 'react';
import { getCurrentDay, reroll } from '@/lib/draw';
import { composeDay, needsCompose } from '@/lib/compose';
import { dayNumber, getCounters, type CurrentDay, type Counters } from '@/lib/db';
import { exerciseMeta } from '@/lib/disciplines';

// Forge is the prompt. Reroll as often as you like.
export default function Today() {
  const [day, setDay] = useState<CurrentDay | null>(null);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [composing, setComposing] = useState(false);

  async function show(d: CurrentDay) {
    setDay(d);
    if (needsCompose(d) && navigator.onLine) {
      setComposing(true);
      setDay(await composeDay(d));
      setComposing(false);
    }
  }

  useEffect(() => {
    (async () => {
      setCounters(await getCounters());
      await show(await getCurrentDay());
    })();
  }, []);

  if (!day || !counters) return <main />;

  async function onReroll() {
    if (!day || composing) return;
    await show(await reroll(day));
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 4rem)' }}>
      <p className="small">Day {dayNumber(counters.startDate)}</p>
      <div style={{ marginTop: '4rem', flex: 1 }}>
        {composing ? (
          <p className="pillar-label">Setting a problem…</p>
        ) : (
          <>
            <p className="hero" style={{ whiteSpace: 'pre-line' }}>
              {day.assignmentText}
            </p>
            <p className="pillar-label" style={{ marginTop: '0.75rem' }}>
              {exerciseMeta(day)}
            </p>
          </>
        )}
      </div>
      <div style={{ marginTop: '3rem' }}>
        <button className="btn" style={{ width: '100%' }} onClick={onReroll} disabled={composing}>
          Reroll
        </button>
      </div>
    </main>
  );
}
