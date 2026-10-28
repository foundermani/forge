import { getMeta, type CurrentDay } from './db';
import { describeExercise, getRecentExercises, recordExercise, saveCurrentDay } from './draw';
import { DISCIPLINES, OUTPUT_LABELS } from './disciplines';

const inflight = new Map<string, Promise<CurrentDay>>();

export function needsCompose(day: CurrentDay): boolean {
  return day.kind === 'composed' && !day.composed && !day.startedAt && !day.completedAt;
}

// Turn the drawn seeds + operation + output into a finished prompt. On any
// failure (offline, timeout, API error) the day keeps its seed text, and the
// next visit to Today tries again.
export function composeDay(day: CurrentDay): Promise<CurrentDay> {
  if (!needsCompose(day) || typeof navigator === 'undefined' || !navigator.onLine) {
    return Promise.resolve(day);
  }
  const key = `${day.date}:${day.assignmentId}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = run(day).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

async function run(day: CurrentDay): Promise<CurrentDay> {
  const ctrl = new AbortController();
  // Generous: the server may judge and regenerate before it answers.
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const recent = (await getRecentExercises()).slice(-12).map(describeExercise);
    const res = await fetch('/api/claude/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        disciplines: (day.disciplines ?? []).map((d, i) => ({
          name: DISCIPLINES[d].label,
          aim: DISCIPLINES[d].aim,
          seed: day.seedTexts?.[i] ?? '',
        })),
        operation: day.operation,
        output: day.output ? OUTPUT_LABELS[day.output] : '',
        transferMode: day.transferMode ?? 'direct',
        recent,
      }),
    });
    if (!res.ok) return day;
    const data = (await res.json()) as { exercise?: string; scopes?: string[] | null };
    if (!data.exercise) return day;

    // Only apply if this is still today's untouched problem.
    const latest = await getMeta<CurrentDay>('currentDay');
    if (!latest || latest.date !== day.date || latest.assignmentId !== day.assignmentId || latest.startedAt) {
      return latest ?? day;
    }
    const next: CurrentDay = {
      ...latest,
      assignmentText: data.exercise,
      scopes: data.scopes ?? undefined,
      composed: true,
    };
    await saveCurrentDay(next);
    await recordExercise(next);
    return next;
  } catch {
    return day;
  } finally {
    clearTimeout(timer);
  }
}
