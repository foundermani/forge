import Dexie, { type Table } from 'dexie';

export type Pillar = 'language' | 'observation' | 'thought' | 'music' | 'form';
export type Depth = 15 | 30 | 60;

export interface Autopsy {
  problemSolved: string;
  surprise: string;
  bestLine: string;
  changeTomorrow: string;
  principle: string;
}

export interface DayRow {
  id: string; // '2026-09-05' — one row per completion; extra same-day completions get ':2', ':3' suffixes
  assignmentId: string;
  assignmentText: string; // snapshot, so deck edits never rewrite history
  pillar: Pillar;
  depth: Depth;
  rerolled: boolean;
  rerolledFromId?: string;
  pieceText?: string;
  photoIds: string[];
  pressureTest?: { questions: string[]; answers: string[] };
  autopsy?: Autopsy;
  completedAt?: number;
}

export interface PhotoRow {
  id: string;
  dayId?: string;
  materialId?: string;
  blob: Blob;
  createdAt: number;
}

export interface MaterialRow {
  id: string;
  text?: string;
  photoId?: string;
  audioId?: string;
  kind: 'text' | 'photo' | 'audio';
  transcriptionStatus?: 'pending' | 'done' | 'failed';
  tags?: string[];
  createdAt: number;
}

export interface AudioRow {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface DeckRow {
  id: string;
  pillar: Pillar;
  text: string;
  weight: number;
  timesServed: number;
  timesRerolled: number;
  source: 'seed' | 'generated';
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface Counters {
  problemsSolved: number;
  startDate: string; // '2026-09-05'
}

export interface VoiceProfile {
  markdown: string;
  updatedAt: number;
  basedOnEntries: number;
}

// The current in-progress day (assignment drawn, not yet completed/abandoned)
export interface CurrentDay {
  date: string;
  assignmentId: string;
  assignmentText: string;
  pillar: Pillar;
  rerolled: boolean;
  rerolledFromId?: string;
  depth?: Depth;
  startedAt?: number;
  endsAt?: number;
  draftText?: string;
  mode?: 'paper' | 'type';
  photoIds?: string[];
  transcriptions?: Record<string, string>; // photoId -> corrected text
  pressureTest?: { questions: string[]; answers: string[] };
  completionsToday: number;
  completedAt?: number; // set when this drawn assignment was completed (Today shows done state)
}

class ForgeDB extends Dexie {
  days!: Table<DayRow, string>;
  photos!: Table<PhotoRow, string>;
  material!: Table<MaterialRow, string>;
  audio!: Table<AudioRow, string>;
  deck!: Table<DeckRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('forge');
    this.version(1).stores({
      days: 'id, completedAt, pillar',
      photos: 'id, dayId, materialId, createdAt',
      material: 'id, createdAt, transcriptionStatus',
      audio: 'id, createdAt',
      deck: 'id, pillar',
      meta: 'key',
    });
  }
}

export const db = new ForgeDB();

export function todayId(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function getCounters(): Promise<Counters> {
  const c = await getMeta<Counters>('counters');
  if (c) return c;
  const fresh: Counters = { problemsSolved: 0, startDate: todayId() };
  await setMeta('counters', fresh);
  return fresh;
}

// Calendar days since startDate + 1 — honest about gaps.
export function dayNumber(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const now = new Date(todayId() + 'T00:00:00');
  return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
}

export function newId(): string {
  return crypto.randomUUID();
}
