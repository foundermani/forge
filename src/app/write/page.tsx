'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, getMeta, setMeta, newId, type CurrentDay, type MaterialRow } from '@/lib/db';
import { saveCurrentDay } from '@/lib/draw';
import { abandonSession, completeDay, countLines } from '@/lib/day';
import { compressImage } from '@/lib/image';
import { transcribePhoto, pressureTest } from '@/lib/ai';
import AutopsyModal from '@/components/AutopsyModal';
import type { Autopsy } from '@/lib/db';

type Mode = 'paper' | 'type';

export default function WritePage() {
  const router = useRouter();
  const [day, setDay] = useState<CurrentDay | null>(null);
  const [mode, setMode] = useState<Mode>('paper');
  const [now, setNow] = useState(Date.now());
  const [expired, setExpired] = useState(false);
  const [autopsyOpen, setAutopsyOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [material, setMaterial] = useState<MaterialRow[] | null>(null);
  const [pressureBusy, setPressureBusy] = useState(false);
  const [pressureError, setPressureError] = useState('');
  const [pendingAnswers, setPendingAnswers] = useState<string[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<CurrentDay | null>(null);
  dayRef.current = day;

  // Load session; bounce home if none in progress.
  useEffect(() => {
    (async () => {
      const d = await getMeta<CurrentDay>('currentDay');
      if (!d || !d.startedAt || d.completedAt) {
        router.replace('/');
        return;
      }
      setDay(d);
      const savedMode = await getMeta<Mode>('writeMode');
      if (savedMode) setMode(savedMode);
      // hydrate photo thumbnails
      const urls: Record<string, string> = {};
      for (const pid of d.photoIds ?? []) {
        const p = await db.photos.get(pid);
        if (p) urls[pid] = URL.createObjectURL(p.blob);
      }
      setPhotoUrls(urls);
    })();
  }, [router]);

  // Ambient timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (day?.endsAt && now >= day.endsAt) setExpired(true);
  }, [now, day]);

  // Write-through draft persistence (debounced): losing work is the one unforgivable bug.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((next: CurrentDay) => {
    setDay(next);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => saveCurrentDay(next), 800);
  }, []);
  const persistNow = useCallback(async (next: CurrentDay) => {
    setDay(next);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    await saveCurrentDay(next);
  }, []);
  useEffect(() => {
    const flush = () => {
      if (dayRef.current) saveCurrentDay(dayRef.current);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  if (!day) return <main />;

  const total = day.endsAt! - day.startedAt!;
  const elapsed = Math.min(now - day.startedAt!, total);
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));

  const allText = [
    day.draftText ?? '',
    ...(day.photoIds ?? []).map((pid) => day.transcriptions?.[pid] ?? ''),
  ].join('\n');
  const lines = countLines(allText);
  const pressureDone = !!day.pressureTest;
  const pressureAvailable = lines >= 4 && !pressureDone && !pendingQuestions;

  async function switchMode(m: Mode) {
    setMode(m);
    await setMeta('writeMode', m);
  }

  async function onPhoto(file: File) {
    const blob = await compressImage(file);
    const pid = newId();
    await db.photos.add({ id: pid, blob, createdAt: Date.now() });
    const url = URL.createObjectURL(blob);
    setPhotoUrls((u) => ({ ...u, [pid]: url }));
    const next: CurrentDay = {
      ...dayRef.current!,
      photoIds: [...(dayRef.current!.photoIds ?? []), pid],
    };
    await persistNow(next);
    runTranscription(pid, blob);
  }

  async function runTranscription(pid: string, blob: Blob) {
    setTranscribing((t) => ({ ...t, [pid]: true }));
    setFailed((f) => ({ ...f, [pid]: false }));
    try {
      const text = await transcribePhoto(blob, 'session');
      const cur = dayRef.current!;
      await persistNow({
        ...cur,
        transcriptions: { ...(cur.transcriptions ?? {}), [pid]: text },
      });
    } catch {
      setFailed((f) => ({ ...f, [pid]: true }));
    } finally {
      setTranscribing((t) => ({ ...t, [pid]: false }));
    }
  }

  async function retryTranscription(pid: string) {
    const p = await db.photos.get(pid);
    if (p) runTranscription(pid, p.blob);
  }

  async function pullMaterial() {
    const all = (await db.material.toArray()).filter((m) => m.text?.trim());
    const picked: MaterialRow[] = [];
    while (picked.length < 3 && all.length > 0) {
      const i = Math.floor(Math.random() * all.length);
      picked.push(all.splice(i, 1)[0]);
    }
    setMaterial(picked);
  }

  async function runPressureTest() {
    setPressureBusy(true);
    setPressureError('');
    try {
      const qs = await pressureTest(day!.assignmentText, allText);
      setPendingQuestions(qs);
      setPendingAnswers(qs.map(() => ''));
    } catch (e) {
      setPressureError((e as Error).message);
    } finally {
      setPressureBusy(false);
    }
  }

  async function submitAnswers() {
    const cur = dayRef.current!;
    await persistNow({
      ...cur,
      pressureTest: { questions: pendingQuestions!, answers: pendingAnswers },
    });
    setPendingQuestions(null);
  }

  async function onAutopsy(a: Autopsy) {
    await completeDay(dayRef.current!, a);
    router.replace('/');
  }

  async function onAbandon() {
    if (confirm('Abandon? Nothing will be recorded.')) {
      await abandonSession(dayRef.current!);
      router.replace('/');
    }
  }

  async function extendTen() {
    setExpired(false);
    await persistNow({ ...dayRef.current!, endsAt: dayRef.current!.endsAt! + 10 * 60_000 });
  }

  return (
    <main style={{ paddingTop: '2rem' }}>
      <div className="timer-track" aria-hidden>
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>

      {expired && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            borderBottom: '1px solid var(--rule)',
            paddingBottom: '0.9rem',
            marginBottom: '1rem',
          }}
        >
          <span style={{ flex: 1, fontStyle: 'italic' }}>Time.</span>
          <button className="btn" onClick={() => setAutopsyOpen(true)}>
            Done
          </button>
          <button className="btn-quiet" onClick={extendTen}>
            +10 minutes
          </button>
        </div>
      )}

      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>{day.assignmentText}</p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'paper'} onClick={() => switchMode('paper')}>
          Paper
        </button>
        <button role="tab" aria-selected={mode === 'type'} onClick={() => switchMode('type')}>
          Type
        </button>
      </div>

      {material && (
        <div className="material-strip">
          {material.length === 0 ? (
            <p>Nothing in the notebook yet.</p>
          ) : (
            material.map((m) => <p key={m.id}>{m.text}</p>)
          )}
          <div style={{ marginTop: '0.4rem', display: 'flex', gap: '1rem' }}>
            <button className="btn-text" onClick={pullMaterial}>
              reroll
            </button>
            <button className="btn-text" onClick={() => setMaterial(null)}>
              dismiss
            </button>
          </div>
        </div>
      )}

      {mode === 'paper' ? (
        <div style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Photograph your page
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(f);
              e.target.value = '';
            }}
          />
          {(day.photoIds ?? []).map((pid) => (
            <div key={pid} style={{ marginTop: '1.5rem' }}>
              {photoUrls[pid] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrls[pid]} alt="Handwritten page" className="thumb" />
              )}
              {transcribing[pid] ? (
                <p className="small" style={{ marginTop: '0.4rem' }}>
                  transcribing…
                </p>
              ) : failed[pid] ? (
                <p className="small" style={{ marginTop: '0.4rem' }}>
                  Transcription failed — check your connection and{' '}
                  <button className="btn-text" onClick={() => retryTranscription(pid)}>
                    tap retry
                  </button>
                  .
                </p>
              ) : day.transcriptions?.[pid] !== undefined ? (
                <>
                  <p className="small" style={{ margin: '0.6rem 0 0.2rem', fontStyle: 'italic' }}>
                    Fix anything I misread
                  </p>
                  <textarea
                    rows={Math.max(3, (day.transcriptions[pid] ?? '').split('\n').length)}
                    value={day.transcriptions[pid]}
                    onChange={(e) =>
                      persist({
                        ...day,
                        transcriptions: { ...(day.transcriptions ?? {}), [pid]: e.target.value },
                      })
                    }
                  />
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          placeholder="Write."
          value={day.draftText ?? ''}
          onChange={(e) => persist({ ...day, draftText: e.target.value })}
          style={{ marginTop: '1rem', minHeight: '45dvh', fontSize: '1.05rem', resize: 'vertical' }}
        />
      )}

      {pendingQuestions && (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="pillar-label">pressure test</p>
          {pendingQuestions.map((q, i) => (
            <div className="q-item" key={i}>
              <p>{q}</p>
              <textarea
                rows={1}
                placeholder="Answer"
                value={pendingAnswers[i]}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  setPendingAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)));
                }}
              />
            </div>
          ))}
          <button
            className="btn-quiet"
            style={{ marginTop: '0.9rem' }}
            disabled={pendingAnswers.some((a) => !a.trim())}
            onClick={submitAnswers}
          >
            Submit answers
          </button>
        </div>
      )}

      {day.pressureTest && !pendingQuestions && (
        <div style={{ marginTop: '1.5rem' }}>
          {day.pressureTest.questions.map((q, i) => (
            <div className="q-item" key={i}>
              <p>{q}</p>
              <p className="small" style={{ marginTop: '0.3rem' }}>
                {day.pressureTest!.answers[i]}
              </p>
            </div>
          ))}
        </div>
      )}

      {pressureError && (
        <p className="small" style={{ marginTop: '1rem' }}>
          {pressureError}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', alignItems: 'center' }}>
        <button className="btn-quiet" onClick={pullMaterial}>
          Pull material
        </button>
        <button
          className="btn-quiet"
          disabled={!pressureAvailable || pressureBusy}
          onClick={runPressureTest}
        >
          {pressureDone ? 'Pressure test complete' : pressureBusy ? 'Asking…' : 'Pressure test'}
        </button>
        <button className="btn" onClick={() => setAutopsyOpen(true)}>
          Done
        </button>
      </div>

      <div style={{ marginTop: '2.5rem', textAlign: 'right' }}>
        <button className="btn-text" onClick={onAbandon}>
          abandon session
        </button>
      </div>

      {autopsyOpen && (
        <AutopsyModal onSubmit={onAutopsy} onCancel={() => setAutopsyOpen(false)} />
      )}
    </main>
  );
}
