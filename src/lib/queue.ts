import { db, getMeta, setMeta, type VoiceProfile } from './db';
import { tagMaterial, transcribePhoto, voicePass } from './ai';

let running = false;

// Client-side background queue: pending transcriptions, then tagging.
// Runs on app open and after each save. No server crons in this architecture.
export async function processQueue(): Promise<void> {
  if (running || typeof navigator === 'undefined' || !navigator.onLine) return;
  running = true;
  try {
    // 1. Pending photo transcriptions in Material
    const pending = await db.material
      .where('transcriptionStatus')
      .equals('pending')
      .toArray();
    for (const m of pending) {
      if (!m.photoId) continue;
      const photo = await db.photos.get(m.photoId);
      if (!photo) {
        await db.material.update(m.id, { transcriptionStatus: 'failed' });
        continue;
      }
      try {
        const text = await transcribePhoto(photo.blob, 'material');
        await db.material.update(m.id, { text, transcriptionStatus: 'done' });
      } catch {
        // Leave as pending — will retry next run when online.
        break;
      }
    }

    // 2. Tagging pass for entries with text and no tags
    const untagged = (await db.material.toArray()).filter(
      (m) => m.text && m.text.trim().length > 0 && !m.tags
    );
    for (const m of untagged.slice(0, 10)) {
      try {
        const tags = await tagMaterial(m.text!);
        await db.material.update(m.id, { tags });
      } catch {
        break;
      }
    }
  } finally {
    running = false;
  }
}

const VOICE_THRESHOLD = 25; // hardcoded — do not enable before 25 completed days
const VOICE_INTERVAL = 24 * 60 * 60 * 1000;

export async function runVoicePassIfDue(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  const completed = await db.days.filter((d) => !!d.completedAt).count();
  if (completed < VOICE_THRESHOLD) return;

  const lastRun = (await getMeta<number>('voicePassLastRun')) ?? 0;
  if (Date.now() - lastRun < VOICE_INTERVAL) return;
  await setMeta('voicePassLastRun', Date.now()); // set first so failures don't hammer the API

  const days = (await db.days.orderBy('completedAt').reverse().limit(40).toArray()).map(
    (d) => ({
      date: d.id,
      pillar: d.pillar ?? null,
      disciplines: d.disciplines ?? null,
      operation: d.operation ?? null,
      output: d.output ?? null,
      transferMode: d.transferMode ?? null,
      intensity: d.intensity ?? null,
      assignment: d.assignmentText,
      assignmentId: d.assignmentId,
      itemIds: d.seedIds ?? [d.assignmentId],
      rerolled: d.rerolled,
      pieceText: d.pieceText ?? null,
      autopsy: d.autopsy,
    })
  );
  const rerollLog = (await db.deck.toArray())
    .filter((c) => c.timesRerolled > 0)
    .map((c) => ({
      assignmentId: c.id,
      discipline: c.discipline ?? c.pillar,
      kind: c.kind,
      text: c.text,
      timesRerolled: c.timesRerolled,
    }));
  const profile = await getMeta<VoiceProfile>('voiceProfile');

  try {
    const result = await voicePass({
      days,
      rerollLog,
      currentProfile: profile?.markdown ?? null,
    });
    await setMeta('voiceProfile', {
      markdown: result.markdown,
      updatedAt: Date.now(),
      basedOnEntries: completed,
    } satisfies VoiceProfile);
    for (const adj of (result.adjustments ?? []).slice(0, 5)) {
      const card = await db.deck.get(adj.assignmentId);
      if (card && typeof adj.newWeight === 'number' && adj.newWeight > 0 && adj.newWeight <= 10) {
        await db.deck.update(card.id, { weight: adj.newWeight });
      }
    }
  } catch {
    // Silent — it works underneath. Next app open after 24h will try again.
  }
}
