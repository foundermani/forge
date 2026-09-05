import { db, setMeta, getMeta } from './db';
import { base64ToBlob, blobToBase64 } from './image';

// Export everything as a single JSON file (photos and audio as base64).
export async function exportAll(): Promise<Blob> {
  const [days, photos, material, audio, deck, meta] = await Promise.all([
    db.days.toArray(),
    db.photos.toArray(),
    db.material.toArray(),
    db.audio.toArray(),
    db.deck.toArray(),
    db.meta.toArray(),
  ]);

  const photosOut = [];
  for (const p of photos) {
    photosOut.push({
      id: p.id,
      dayId: p.dayId,
      materialId: p.materialId,
      createdAt: p.createdAt,
      type: p.blob.type,
      data: await blobToBase64(p.blob),
    });
  }
  const audioOut = [];
  for (const a of audio) {
    audioOut.push({
      id: a.id,
      createdAt: a.createdAt,
      type: a.blob.type,
      data: await blobToBase64(a.blob),
    });
  }

  const payload = {
    app: 'forge',
    version: 1,
    exportedAt: new Date().toISOString(),
    days,
    material,
    deck,
    meta,
    photos: photosOut,
    audio: audioOut,
  };

  await setMeta('lastBackupAt', Date.now());
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function importAll(file: Blob): Promise<void> {
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload.app !== 'forge') throw new Error('This file is not a Forge export.');

  await db.transaction('rw', [db.days, db.photos, db.material, db.audio, db.deck, db.meta], async () => {
    await Promise.all([
      db.days.clear(),
      db.photos.clear(),
      db.material.clear(),
      db.audio.clear(),
      db.deck.clear(),
      db.meta.clear(),
    ]);
    await db.days.bulkAdd(payload.days ?? []);
    await db.material.bulkAdd(payload.material ?? []);
    await db.deck.bulkAdd(payload.deck ?? []);
    await db.meta.bulkAdd(payload.meta ?? []);
    for (const p of payload.photos ?? []) {
      await db.photos.add({
        id: p.id,
        dayId: p.dayId,
        materialId: p.materialId,
        createdAt: p.createdAt,
        blob: base64ToBlob(p.data, p.type || 'image/jpeg'),
      });
    }
    for (const a of payload.audio ?? []) {
      await db.audio.add({
        id: a.id,
        createdAt: a.createdAt,
        blob: base64ToBlob(a.data, a.type || 'audio/webm'),
      });
    }
  });
  await setMeta('lastBackupAt', Date.now());
}

export async function daysSinceBackup(): Promise<number | null> {
  const last = await getMeta<number>('lastBackupAt');
  if (!last) return null;
  return Math.floor((Date.now() - last) / 86400000);
}
