'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db, getMeta, setMeta, type VoiceProfile } from '@/lib/db';
import { exportAll, importAll } from '@/lib/backup';
import { getCrossFrequency, getDisciplineWeights, getTransferWeights } from '@/lib/draw';
import {
  DEFAULT_TRANSFER_WEIGHTS,
  DEFAULT_WEIGHTS,
  DISCIPLINES,
  DISCIPLINE_ORDER,
  TRANSFER_MODES,
  TRANSFER_ORDER,
  type CrossFrequency,
  type Discipline,
  type TransferMode,
} from '@/lib/disciplines';

// Relative weights: they needn't total 100; shares are shown normalized.
function DisciplineBalance() {
  const [weights, setWeights] = useState<Record<Discipline, number> | null>(null);
  const [cross, setCross] = useState<CrossFrequency>('sometimes');
  const [transfer, setTransfer] = useState<Record<TransferMode, number> | null>(null);

  useEffect(() => {
    (async () => {
      setWeights(await getDisciplineWeights());
      setCross(await getCrossFrequency());
      setTransfer(await getTransferWeights());
    })();
  }, []);

  if (!weights || !transfer) return null;
  const transferTotal = TRANSFER_ORDER.reduce((s, m) => s + (transfer[m] || 0), 0) || 1;

  async function updateTransfer(next: Record<TransferMode, number>) {
    setTransfer(next);
    await setMeta('transferWeights', next);
  }
  const total = DISCIPLINE_ORDER.reduce((s, d) => s + (weights[d] || 0), 0) || 1;

  async function update(next: Record<Discipline, number>) {
    setWeights(next);
    await setMeta('disciplineWeights', next);
  }

  async function chooseCross(c: CrossFrequency) {
    setCross(c);
    await setMeta('crossFrequency', c);
  }

  return (
    <section>
      <p>Discipline balance</p>
      <p className="small" style={{ margin: '0.4rem 0 0.6rem' }}>
        How often each discipline comes up. Rebalance as your needs evolve.
      </p>
      {DISCIPLINE_ORDER.map((d) => (
        <div
          key={d}
          style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.2rem 0' }}
        >
          <span style={{ flex: 1, fontSize: '0.95rem' }}>{DISCIPLINES[d].label}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            aria-label={`Weight for ${DISCIPLINES[d].label}`}
            value={weights[d]}
            onChange={(e) => {
              const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
              update({ ...weights, [d]: n });
            }}
            style={{
              width: '3.2rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--rule)',
              textAlign: 'right',
              font: 'inherit',
              color: 'inherit',
            }}
          />
          <span className="small" style={{ width: '2.6rem', textAlign: 'right' }}>
            {Math.round(((weights[d] || 0) / total) * 100)}%
          </span>
        </div>
      ))}
      <button className="btn-text" style={{ marginTop: '0.5rem' }} onClick={() => update({ ...DEFAULT_WEIGHTS })}>
        reset to suggested balance
      </button>

      <p style={{ marginTop: '1.25rem' }}>Cross-disciplinary sessions</p>
      <p className="small" style={{ margin: '0.4rem 0 0.6rem' }}>
        Two or three disciplines fused into one problem.
      </p>
      <div className="intensity" role="radiogroup" aria-label="Cross-disciplinary frequency">
        {(['off', 'sometimes', 'often'] as CrossFrequency[]).map((c) => (
          <button key={c} role="radio" aria-checked={cross === c} onClick={() => chooseCross(c)}>
            {c}
          </button>
        ))}
      </div>

      <p style={{ marginTop: '1.25rem' }}>Song focus</p>
      <p className="small" style={{ margin: '0.4rem 0 0.6rem' }}>
        How often an exercise reaches for a song directly, trains a skill songs need, or just explores.
      </p>
      {TRANSFER_ORDER.map((m) => (
        <div
          key={m}
          style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.2rem 0' }}
        >
          <span style={{ flex: 1, fontSize: '0.95rem' }}>
            {TRANSFER_MODES[m].label}
            <span className="small" style={{ display: 'block' }}>
              {TRANSFER_MODES[m].description}
            </span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            aria-label={`Weight for ${TRANSFER_MODES[m].label} exercises`}
            value={transfer[m]}
            onChange={(e) => {
              const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
              updateTransfer({ ...transfer, [m]: n });
            }}
            style={{
              width: '3.2rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--rule)',
              textAlign: 'right',
              font: 'inherit',
              color: 'inherit',
            }}
          />
          <span className="small" style={{ width: '2.6rem', textAlign: 'right' }}>
            {Math.round(((transfer[m] || 0) / transferTotal) * 100)}%
          </span>
        </div>
      ))}
      <button
        className="btn-text"
        style={{ marginTop: '0.5rem' }}
        onClick={() => updateTransfer({ ...DEFAULT_TRANSFER_WEIGHTS })}
      >
        reset to 40 / 40 / 20
      </button>
    </section>
  );
}

export default function SettingsPage() {
  const [appName, setAppName] = useState('Forge');
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [completedDays, setCompletedDays] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const name = await getMeta<string>('appName');
      if (name) setAppName(name);
      setProfile((await getMeta<VoiceProfile>('voiceProfile')) ?? null);
      setCompletedDays(await db.days.filter((d) => !!d.completedAt).count());
    })();
  }, []);

  async function saveName(name: string) {
    setAppName(name);
    await setMeta('appName', name);
    document.title = name || 'Forge';
  }

  async function onExport() {
    setStatus('Preparing export…');
    try {
      const blob = await exportAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forge-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Exported.');
    } catch {
      setStatus('Export failed.');
    }
  }

  async function onImport(file: File) {
    if (!confirm('Importing replaces everything currently in the app. Continue?')) return;
    setStatus('Importing…');
    try {
      await importAll(file);
      setStatus('Imported. Reloading…');
      setTimeout(() => location.reload(), 800);
    } catch {
      setStatus('Import failed — is this a Forge export file?');
    }
  }

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="pillar-label">settings</p>
        <Link href="/history" className="small">
          back
        </Link>
      </div>

      <hr className="rule" style={{ marginTop: '1.5rem' }} />

      <section>
        <p>Backup</p>
        <p className="small" style={{ margin: '0.4rem 0 0.9rem' }}>
          Everything lives on this device. Export a copy monthly; the file restores the whole
          archive on any device.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={onExport}>
            Export everything
          </button>
          <label className="btn-quiet" style={{ display: 'inline-block' }}>
            Import
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {status && (
          <p className="small" style={{ marginTop: '0.6rem' }}>
            {status}
          </p>
        )}
      </section>

      <hr className="rule" />

      <DisciplineBalance />

      <hr className="rule" />

      <section>
        <p>App name</p>
        <input
          type="text"
          value={appName}
          onChange={(e) => saveName(e.target.value)}
          style={{ maxWidth: '16rem', marginTop: '0.4rem' }}
        />
      </section>

      <hr className="rule" />

      <section>
        <p>Voice profile</p>
        {profile ? (
          <>
            <p className="small" style={{ margin: '0.4rem 0 0.9rem' }}>
              Built from {profile.basedOnEntries} completed days. It only knows what you&apos;ve done
              here.
            </p>
            <button className="btn-quiet" onClick={() => setShowProfile((s) => !s)}>
              {showProfile ? 'Hide voice profile' : 'View voice profile'}
            </button>
            {showProfile && (
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  marginTop: '1rem',
                  fontSize: '0.95rem',
                }}
              >
                {profile.markdown}
              </pre>
            )}
          </>
        ) : (
          <p className="small" style={{ marginTop: '0.4rem' }}>
            Appears after 25 completed days ({completedDays} so far). It works underneath — noticing
            patterns, adjusting which problems find you.
          </p>
        )}
      </section>

      <hr className="rule" />

      <section>
        <p className="small">
          The AI features (transcription, pressure tests, the voice profile) call Anthropic&apos;s
          API through this app&apos;s server. At daily use this costs cents per week.
        </p>
      </section>
    </main>
  );
}
