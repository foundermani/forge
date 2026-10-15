import {
  db,
  getCounters,
  setMeta,
  todayId,
  type Autopsy,
  type CurrentDay,
  type DayRow,
} from './db';

// Submitting the autopsy is the only way a day becomes real.
export async function completeDay(day: CurrentDay, autopsy: Autopsy): Promise<void> {
  const today = todayId();
  const n = day.completionsToday;
  const id = n === 0 ? today : `${today}:${n + 1}`;

  const pieceText = buildPieceText(day);

  const row: DayRow = {
    id,
    assignmentId: day.assignmentId,
    assignmentText: day.assignmentText,
    pillar: day.pillar,
    kind: day.kind,
    disciplines: day.disciplines,
    operation: day.operation,
    output: day.output,
    seedIds: day.seedIds,
    intensity: day.intensity,
    depth: day.depth ?? 15,
    rerolled: day.rerolled,
    rerolledFromId: day.rerolledFromId,
    pieceText: pieceText || undefined,
    photoIds: day.photoIds ?? [],
    pressureTest: day.pressureTest,
    autopsy,
    completedAt: Date.now(),
  };

  await db.days.put(row);

  // Attach session photos to the day row
  for (const pid of row.photoIds) {
    await db.photos.update(pid, { dayId: id });
  }

  const counters = await getCounters();
  await setMeta('counters', { ...counters, problemsSolved: counters.problemsSolved + 1 });

  const done: CurrentDay = {
    ...problemOf(day),
    completionsToday: day.completionsToday + 1,
    completedAt: Date.now(),
  };
  await setMeta('currentDay', done);
}

// The drawn problem itself, without any session work attached to it.
function problemOf(day: CurrentDay): CurrentDay {
  return {
    date: day.date,
    assignmentId: day.assignmentId,
    assignmentText: day.assignmentText,
    kind: day.kind,
    disciplines: day.disciplines,
    operation: day.operation,
    output: day.output,
    seedIds: day.seedIds,
    seedTexts: day.seedTexts,
    composed: day.composed,
    scopes: day.scopes,
    pillar: day.pillar,
    rerolled: day.rerolled,
    rerolledFromId: day.rerolledFromId,
    completionsToday: day.completionsToday,
  };
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildPieceText(day: CurrentDay): string {
  const parts: string[] = [];
  if (day.draftText?.trim()) parts.push(day.draftText.trim());
  if (day.transcriptions) {
    for (const pid of day.photoIds ?? []) {
      const t = day.transcriptions[pid];
      if (t?.trim()) parts.push(t.trim());
    }
  }
  return parts.join('\n\n');
}

// Abandoning records nothing; the same assignment stays available today.
export async function abandonSession(day: CurrentDay): Promise<void> {
  await setMeta('currentDay', problemOf(day));
}

export function countLines(text: string): number {
  return text.split('\n').filter((l) => l.trim().length > 0).length;
}
