import { db, getMeta, setMeta, todayId, type CurrentDay, type DeckRow } from './db';
import { ensureSeeded } from './seed';
import {
  CROSS_PROBABILITY,
  DEFAULT_TRANSFER_WEIGHTS,
  DEFAULT_WEIGHTS,
  DISCIPLINE_ORDER,
  OPERATIONS,
  PILLAR_TO_DISCIPLINE,
  TRANSFER_ORDER,
  exerciseMeta,
  pickOutput,
  pickWeighted,
  type CrossFrequency,
  type Discipline,
  type Operation,
  type Output,
  type TransferMode,
} from './disciplines';

const RECENT_KEY = 'recentlyServed'; // recently dealt card ids, newest last
const RECENT_SIZE = 40;
const CLASSIC_SHARE = 0.25; // chance a single-discipline draw deals an authored classic

async function getRecent(): Promise<string[]> {
  return (await getMeta<string[]>(RECENT_KEY)) ?? [];
}

async function markServed(cards: DeckRow[]): Promise<void> {
  for (const c of cards) await db.deck.update(c.id, { timesServed: c.timesServed + 1 });
  const ids = cards.map((c) => c.id);
  const recent = (await getRecent()).filter((r) => !ids.includes(r));
  await setMeta(RECENT_KEY, [...recent, ...ids].slice(-RECENT_SIZE));
}

export async function getDisciplineWeights(): Promise<Record<Discipline, number>> {
  const saved = await getMeta<Partial<Record<Discipline, number>>>('disciplineWeights');
  return { ...DEFAULT_WEIGHTS, ...(saved ?? {}) };
}

export async function getCrossFrequency(): Promise<CrossFrequency> {
  return (await getMeta<CrossFrequency>('crossFrequency')) ?? 'sometimes';
}

export async function getTransferWeights(): Promise<Record<TransferMode, number>> {
  const saved = await getMeta<Partial<Record<TransferMode, number>>>('transferWeights');
  return { ...DEFAULT_TRANSFER_WEIGHTS, ...(saved ?? {}) };
}

// Forge's memory of its own assignments (shown, rerolled or not), so it can
// avoid dealing the same exercise in new words. Newest last.
const ASSIGNED_KEY = 'recentExercises';
const ASSIGNED_SIZE = 20;

export interface AssignedExercise {
  disciplines: Discipline[];
  operation?: Operation;
  output?: Output;
  transferMode?: TransferMode;
  text: string;
}

export async function getRecentExercises(): Promise<AssignedExercise[]> {
  return (await getMeta<AssignedExercise[]>(ASSIGNED_KEY)) ?? [];
}

export async function recordExercise(
  day: Pick<CurrentDay, 'disciplines' | 'operation' | 'output' | 'transferMode' | 'assignmentText'>
): Promise<void> {
  const entry: AssignedExercise = {
    disciplines: day.disciplines ?? [],
    operation: day.operation,
    output: day.output,
    transferMode: day.transferMode,
    text: day.assignmentText,
  };
  await setMeta(ASSIGNED_KEY, [...(await getRecentExercises()), entry].slice(-ASSIGNED_SIZE));
}

// One line per recent exercise for the composer: its mechanics, then its text.
export function describeExercise(x: AssignedExercise): string {
  const mode = x.transferMode ? ` [${x.transferMode}]` : '';
  return `${exerciseMeta(x)}${mode}: ${x.text.replace(/\s+/g, ' ')}`;
}

function pickCard(cards: DeckRow[], recent: Set<string>): DeckRow {
  const fresh = cards.filter((c) => !recent.has(c.id));
  const pool = fresh.length ? fresh : cards;
  return pickWeighted(pool.map((c) => [c, c.weight] as [DeckRow, number]));
}

type Drawn = Pick<
  CurrentDay,
  | 'kind'
  | 'assignmentId'
  | 'assignmentText'
  | 'disciplines'
  | 'operation'
  | 'output'
  | 'transferMode'
  | 'seedIds'
  | 'seedTexts'
  | 'composed'
>;

// One problem: pick discipline(s) by weight, then either an authored classic
// or seed subject(s) plus an operation and an output for the composer.
async function drawProblem(exclude: Discipline[] = []): Promise<Drawn> {
  const deck = await db.deck.toArray();
  const recent = new Set(await getRecent());
  const weights = await getDisciplineWeights();
  const crossP = CROSS_PROBABILITY[await getCrossFrequency()];

  const hasSeeds = (d: Discipline) => deck.some((c) => c.kind === 'seed' && c.discipline === d);
  let candidates = DISCIPLINE_ORDER.filter((d) => hasSeeds(d) && !exclude.includes(d));
  if (candidates.length === 0) candidates = DISCIPLINE_ORDER.filter(hasSeeds);
  const weighted = (ds: Discipline[]) => ds.map((d) => [d, weights[d] ?? 0] as [Discipline, number]);

  const disciplines: Discipline[] = [pickWeighted(weighted(candidates))];
  if (Math.random() < crossP) {
    const n = Math.random() < 0.15 ? 3 : 2;
    while (disciplines.length < n) {
      const rest = candidates.filter((d) => !disciplines.includes(d));
      if (rest.length === 0) break;
      disciplines.push(pickWeighted(weighted(rest)));
    }
  }

  if (disciplines.length === 1) {
    const classics = deck.filter(
      (c) => c.kind === 'classic' && c.discipline === disciplines[0] && !recent.has(c.id)
    );
    if (classics.length > 0 && Math.random() < CLASSIC_SHARE) {
      const card = pickCard(classics, recent);
      await markServed([card]);
      const classic: Drawn = {
        kind: 'classic',
        assignmentId: card.id,
        assignmentText: card.text,
        disciplines,
        seedIds: [card.id],
        composed: true,
      };
      await recordExercise(classic);
      return classic;
    }
  }

  const seeds = disciplines.map((d) =>
    pickCard(deck.filter((c) => c.kind === 'seed' && c.discipline === d), recent)
  );
  await markServed(seeds);

  // Vary the mechanics, not just the subject: skip the last few operations
  // and damp recently used outputs.
  const assigned = await getRecentExercises();
  const recentOps = assigned.slice(-3).map((x) => x.operation);
  const recentOutputs = assigned.slice(-2).flatMap((x) => (x.output ? [x.output] : []));
  const ops = OPERATIONS.filter((o) => !recentOps.includes(o));
  const transferWeights = await getTransferWeights();
  const transferMode = pickWeighted(TRANSFER_ORDER.map((m) => [m, transferWeights[m]] as [TransferMode, number]));
  return {
    kind: 'composed',
    assignmentId: seeds[0].id,
    assignmentText: seeds.map((s) => s.text).join('\n'),
    disciplines,
    operation: ops[Math.floor(Math.random() * ops.length)],
    output: pickOutput(disciplines[0], transferMode, recentOutputs),
    transferMode,
    seedIds: seeds.map((s) => s.id),
    seedTexts: seeds.map((s) => s.text),
    composed: false,
  };
}

// A day saved by Forge 1 has a pillar but no disciplines; give it one so the
// rest of the app can treat every day the same way.
function normalize(day: CurrentDay): CurrentDay {
  if (day.disciplines?.length) return day;
  const discipline: Discipline = day.pillar ? PILLAR_TO_DISCIPLINE[day.pillar] : 'wordcraft';
  return { ...day, kind: 'classic', composed: true, disciplines: [discipline], seedIds: [day.assignmentId] };
}

// Get (or create) today's problem. Persisted immediately so reopening shows the same one.
export async function getCurrentDay(): Promise<CurrentDay> {
  await ensureSeeded();
  const today = todayId();
  const existing = await getMeta<CurrentDay>('currentDay');
  if (existing && existing.date === today) {
    const day = normalize(existing);
    if (day !== existing) await saveCurrentDay(day);
    return day;
  }
  const day: CurrentDay = {
    date: today,
    ...(await drawProblem()),
    rerolled: false,
    completionsToday: await countCompletionsToday(),
  };
  await saveCurrentDay(day);
  return day;
}

async function countCompletionsToday(): Promise<number> {
  const rows = await db.days.where('id').startsWith(todayId()).toArray();
  return rows.filter((r) => r.completedAt).length;
}

export async function saveCurrentDay(day: CurrentDay): Promise<void> {
  await setMeta('currentDay', day);
}

// Unlimited rerolls: swap to different discipline(s); log the dodged cards
// (the reroll counts tell the voice pass what gets skipped).
export async function reroll(day: CurrentDay): Promise<CurrentDay> {
  for (const id of day.seedIds ?? [day.assignmentId]) {
    const card = await db.deck.get(id);
    if (card) await db.deck.update(id, { timesRerolled: card.timesRerolled + 1 });
  }
  const next: CurrentDay = {
    date: day.date,
    ...(await drawProblem(day.disciplines ?? [])),
    rerolled: true,
    rerolledFromId: day.assignmentId,
    completionsToday: day.completionsToday,
  };
  await saveCurrentDay(next);
  return next;
}

// After completing today's problem: "Draw another problem".
export async function drawAnother(): Promise<CurrentDay> {
  const day: CurrentDay = {
    date: todayId(),
    ...(await drawProblem()),
    rerolled: false,
    completionsToday: await countCompletionsToday(),
  };
  await saveCurrentDay(day);
  return day;
}
