'use client';

import { useEffect, useRef, useState } from 'react';
import { db, newId } from '@/lib/db';
import { compressImage } from '@/lib/image';
import { processQueue } from '@/lib/queue';

export default function CaptureModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function saveText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await db.material.add({
      id: newId(),
      text: trimmed,
      kind: 'text',
      createdAt: Date.now(),
    });
    onClose();
    processQueue().catch(() => {});
  }

  async function onPhoto(file: File) {
    // Save closes instantly; transcription runs in the background.
    const blob = await compressImage(file);
    const photoId = newId();
    const materialId = newId();
    await db.photos.add({ id: photoId, materialId, blob, createdAt: Date.now() });
    await db.material.add({
      id: materialId,
      photoId,
      kind: 'photo',
      transcriptionStatus: 'pending',
      createdAt: Date.now(),
    });
    onClose();
    processQueue().catch(() => {});
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const audioId = newId();
        await db.audio.add({ id: audioId, blob, createdAt: Date.now() });
        await db.material.add({
          id: newId(),
          audioId,
          kind: 'audio',
          createdAt: Date.now(),
        });
        onClose();
      };
      rec.start();
      setRecording(true);
    } catch {
      alert('Microphone unavailable.');
    }
  }

  return (
    <div className="scrim">
      <div className="scrim-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="pillar-label">capture</span>
          <button className="btn-text" onClick={onClose}>
            close
          </button>
        </div>
        <textarea
          ref={inputRef}
          rows={4}
          placeholder="What did you notice?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ marginTop: '1.25rem', fontSize: '1.1rem' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          <button className="btn" onClick={saveText} disabled={!text.trim() || recording}>
            Save
          </button>
          <button
            className="btn-quiet"
            onClick={() => fileRef.current?.click()}
            disabled={recording}
            aria-label="Photograph a page"
          >
            Camera
          </button>
          <button className="btn-quiet" onClick={toggleRecord}>
            {recording ? 'Stop and save' : 'Voice memo'}
          </button>
        </div>
        {recording && (
          <p className="small" style={{ marginTop: '0.75rem' }}>
            Recording…
          </p>
        )}
        <p className="small" style={{ marginTop: '1.5rem' }}>
          Audio saves; only photos and text are searchable for now.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(f);
          }}
        />
      </div>
    </div>
  );
}
