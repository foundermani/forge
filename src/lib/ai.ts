import { blobToBase64 } from './image';

// Thin client wrappers around the API routes. Plain-language errors for the UI.

export async function transcribePhoto(
  blob: Blob,
  context: 'session' | 'material'
): Promise<string> {
  const image = await blobToBase64(blob);
  const res = await fetch('/api/claude/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, context }),
  });
  if (!res.ok) throw new Error('Transcription failed — check your connection and tap retry.');
  const data = await res.json();
  return data.text as string;
}

export async function pressureTest(
  assignment: string,
  text: string
): Promise<string[]> {
  const res = await fetch('/api/claude/pressure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment, text }),
  });
  if (!res.ok) throw new Error('Pressure test failed — check your connection and try again.');
  const data = await res.json();
  return data.questions as string[];
}

export async function tagMaterial(text: string): Promise<string[]> {
  const res = await fetch('/api/claude/tag-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Tagging failed.');
  const data = await res.json();
  return (data.tags ?? []) as string[];
}

export interface VoicePassInput {
  days: unknown[];
  rerollLog: unknown[];
  currentProfile: string | null;
}

export interface VoicePassResult {
  markdown: string;
  adjustments: Array<{ assignmentId: string; newWeight: number; reason: string }>;
}

export async function voicePass(input: VoicePassInput): Promise<VoicePassResult> {
  const res = await fetch('/api/claude/voice-pass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Voice pass failed.');
  return (await res.json()) as VoicePassResult;
}
