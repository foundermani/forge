'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db, getMeta, setMeta, type VoiceProfile } from '@/lib/db';
import { exportAll, importAll } from '@/lib/backup';

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
