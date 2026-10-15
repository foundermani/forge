'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db, dayNumber, getCounters, type Counters, type DayRow, type MaterialRow } from '@/lib/db';
import { daysSinceBackup } from '@/lib/backup';
import { CRITERIA, MISSION, exerciseMeta, intensityName } from '@/lib/disciplines';

type Tab = 'days' | 'principles' | 'material';

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('days');
  const [counters, setCounters] = useState<Counters | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [material, setMaterial] = useState<MaterialRow[]>([]);
  const [backupAge, setBackupAge] = useState<number | null>(null);
  const [neverBackedUp, setNeverBackedUp] = useState(false);

  useEffect(() => {
    (async () => {
      setCounters(await getCounters());
      const all = await db.days.toArray();
      setDays(
        all
          .filter((d) => d.completedAt)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      );
      setMaterial(await db.material.orderBy('createdAt').reverse().toArray());
      const age = await daysSinceBackup();
      if (age === null) setNeverBackedUp(true);
      else setBackupAge(age);
    })();
  }, [tab]); // re-query on tab switch so captures made while this page is open show up

  if (!counters) return <main />;

  const started = new Date(counters.startDate + 'T00:00:00');
  const startedLabel = started.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="counter" style={{ fontSize: '2.4rem', fontWeight: 500 }}>
            {counters.problemsSolved} {counters.problemsSolved === 1 ? 'problem' : 'problems'} solved
          </p>
          <p className="small">
            Day {dayNumber(counters.startDate)} · started {startedLabel}
          </p>
          <p className="pillar-label" style={{ marginTop: '0.35rem' }}>
            {MISSION}
          </p>
          {backupAge !== null && backupAge > 30 && (
            <p className="small" style={{ marginTop: '0.5rem' }}>
              Last backup: {backupAge} days ago — export from Settings.
            </p>
          )}
          {neverBackedUp && counters.problemsSolved > 0 && (
            <p className="small" style={{ marginTop: '0.5rem' }}>
              No backup yet — export from Settings.
            </p>
          )}
        </div>
        <Link href="/settings" aria-label="Settings" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>
          ⚙
        </Link>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'days'} onClick={() => setTab('days')}>
          Days
        </button>
        <button role="tab" aria-selected={tab === 'principles'} onClick={() => setTab('principles')}>
          Principles
        </button>
        <button role="tab" aria-selected={tab === 'material'} onClick={() => setTab('material')}>
          Material
        </button>
      </div>

      {tab === 'days' && <DaysTab days={days} />}
      {tab === 'principles' && <PrinciplesTab days={days} />}
      {tab === 'material' && <MaterialTab material={material} />}
    </main>
  );
}

function formatDate(id: string): string {
  const date = new Date(id.split(':')[0] + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Read-only. No edit affordance anywhere — that's what makes looking back honest.
function DaysTab({ days }: { days: DayRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  async function toggle(d: DayRow) {
    if (open === d.id) {
      setOpen(null);
      return;
    }
    setOpen(d.id);
    const next: Record<string, string> = {};
    for (const pid of d.photoIds) {
      if (!urls[pid]) {
        const p = await db.photos.get(pid);
        if (p) next[pid] = URL.createObjectURL(p.blob);
      }
    }
    if (Object.keys(next).length) setUrls((u) => ({ ...u, ...next }));
  }

  if (days.length === 0) return <p className="small" style={{ marginTop: '2rem' }}>Nothing yet. The first problem is waiting on Today.</p>;

  return (
    <div>
      {days.map((d) => (
        <div className="day-entry" key={d.id}>
          <button
            onClick={() => toggle(d)}
            style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
          >
            <p className="small">
              {formatDate(d.id)}
              {intensityName(d.intensity) && <> · {intensityName(d.intensity)}</>}
            </p>
            <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-line' }}>{d.assignmentText}</p>
            <p className="pillar-label" style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}>
              {exerciseMeta(d)}
            </p>
          </button>
          {open === d.id && (
            <div style={{ marginTop: '0.9rem' }}>
              {d.photoIds.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {d.photoIds.map(
                    (pid) =>
                      urls[pid] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={pid}
                          src={urls[pid]}
                          alt="Handwritten page"
                          className="thumb"
                          onClick={() => setFullscreen(urls[pid])}
                        />
                      )
                  )}
                </div>
              )}
              {d.pieceText && (
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{d.pieceText}</p>
              )}
              {d.pressureTest && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p className="pillar-label">pressure test</p>
                  {d.pressureTest.questions.map((q, i) => (
                    <div key={i} style={{ margin: '0.5rem 0' }}>
                      <p className="small" style={{ fontStyle: 'italic' }}>
                        {d.pressureTest!.criteria?.[i] && <>{d.pressureTest!.criteria[i].toLowerCase()} · </>}
                        {q}
                      </p>
                      <p>{d.pressureTest!.answers[i]}</p>
                    </div>
                  ))}
                </div>
              )}
              {d.autopsy && (
                <div>
                  <p className="pillar-label">autopsy</p>
                  <AutopsyLine label="Problem solved" value={d.autopsy.problemSolved} />
                  <AutopsyLine label="Surprise" value={d.autopsy.surprise} />
                  <AutopsyLine label="Best line" value={d.autopsy.bestLine} />
                  <AutopsyLine label="Change tomorrow" value={d.autopsy.changeTomorrow} />
                  <AutopsyLine label="Learned" value={d.autopsy.principle} />
                  {d.autopsy.ratings && (
                    <p className="small" style={{ marginTop: '0.5rem' }}>
                      {CRITERIA.map((c) => `${c.label.toLowerCase()} ${d.autopsy!.ratings![c.key]}`).join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {fullscreen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fullscreen} alt="Handwritten page" className="fullscreen" onClick={() => setFullscreen(null)} />
      )}
    </div>
  );
}

function AutopsyLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ margin: '0.35rem 0' }}>
      <span className="small" style={{ fontStyle: 'italic' }}>{label}: </span>
      {value}
    </p>
  );
}

// The accumulated fifth answers. His textbook.
function PrinciplesTab({ days }: { days: DayRow[] }) {
  const principles = days.filter((d) => d.autopsy?.principle?.trim());
  if (principles.length === 0)
    return <p className="small" style={{ marginTop: '2rem' }}>Principles collect here — one per completed day.</p>;
  return (
    <div>
      {principles.map((d) => (
        <div className="day-entry" key={d.id}>
          <p>{d.autopsy!.principle}</p>
          <p className="small" style={{ marginTop: '0.25rem' }}>{formatDate(d.id)}</p>
        </div>
      ))}
    </div>
  );
}

function MaterialTab({ material }: { material: MaterialRow[] }) {
  const [q, setQ] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      const nextAudio: Record<string, string> = {};
      for (const m of material) {
        if (m.photoId) {
          const p = await db.photos.get(m.photoId);
          if (p) next[m.id] = URL.createObjectURL(p.blob);
        }
        if (m.audioId) {
          const a = await db.audio.get(m.audioId);
          if (a) nextAudio[m.id] = URL.createObjectURL(a.blob);
        }
      }
      setUrls(next);
      setAudioUrls(nextAudio);
    })();
  }, [material]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return material;
    return material.filter(
      (m) =>
        m.text?.toLowerCase().includes(term) ||
        m.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }, [q, material]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search the notebook"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginTop: '1rem' }}
      />
      {filtered.length === 0 && (
        <p className="small" style={{ marginTop: '2rem' }}>
          {material.length === 0 ? 'The notebook is empty. Capture is one tap away.' : 'No matches.'}
        </p>
      )}
      {filtered.map((m) => (
        <div className="day-entry" key={m.id}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {urls[m.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[m.id]} alt="Captured page" className="thumb" />
            )}
            <div style={{ flex: 1 }}>
              {m.kind === 'photo' && m.transcriptionStatus === 'pending' && (
                <p className="small" style={{ fontStyle: 'italic' }}>transcribing…</p>
              )}
              {m.kind === 'photo' && m.transcriptionStatus === 'failed' && (
                <p className="small">Transcription failed — will retry when online.</p>
              )}
              {m.text && <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>}
              {m.kind === 'audio' && audioUrls[m.id] && (
                <audio controls src={audioUrls[m.id]} style={{ width: '100%', marginTop: '0.25rem' }} />
              )}
              <p className="small" style={{ marginTop: '0.3rem' }}>
                {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {m.tags && m.tags.length > 0 && <> · {m.tags.join(' · ')}</>}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
