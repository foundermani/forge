import { db, getMeta, setMeta, todayId, type CurrentDay, type DeckRow, type Pillar } from './db';
import { ensureSeeded } from './seed';

const RECENT_KEY = 'recentlyServed'; // last 14 assignment ids, newest last

async function getRecent(): Promise<string[]> {
  return (await getMeta<string[]>(RECENT_KEY)) ?? [];
}

async function pushRecent(id: string): Promise<void> {
  const recent = await getRecent();
  const next = [...recent.filter((r) => r !== id), id].slice(-14);
  await setMeta(RECENT_KEY, next);
}

function weightedPick(cards: DeckRow[]): DeckRow {
  const total = cards.reduce((s, c) => s + Math.max(c.weight, 0.01), 0);
  let r = Math.random() * total;
  for (const c of cards) {
    r -= Math.max(c.weight, 0.01);
    if (r <= 0) return c;
  }
  return cards[cards.length - 1];
}

async function drawCard(excludePillar?: Pillar): Promise<DeckRow> {
  const recent = new Set(await getRecent());
  const pool = await db.deck.toArray();
  let candidates = pool.filter(
    (c) => !recent.has(c.id) && (!excludePillar || c.pillar !== excludePillar)
  );
  if (candidates.length === 0) {
    candidates = pool.filter((c) => !excludePillar || c.pillar !== excludePillar);
  }
  if (candidates.length === 0) candidates = pool;
  return weightedPick(candidates);
}

// Get (or create) today's assignment. Persisted immediately so reopening shows the same one.
export async function getCurrentDay(): Promise<CurrentDay> {
  await ensureSeeded();
  const today = todayId();
  const existing = await getMeta<CurrentDay>('currentDay');
  if (existing && existing.date === today) return existing;

  const card = await drawCard();
  await db.deck.update(card.id, { timesServed: card.timesServed + 1 });
  await pushRecent(card.id);
  const day: CurrentDay = {
    date: today,
    assignmentId: card.id,
    assignmentText: card.text,
    pillar: card.pillar,
    rerolled: false,
    completionsToday: existing && existing.date === today ? existing.completionsToday : await countCompletionsToday(),
  };
  await setMeta('currentDay', day);
  return day;
}

async function countCompletionsToday(): Promise<number> {
  const today = todayId();
  const rows = await db.days.where('id').startsWith(today).toArray();
  return rows.filter((r) => r.completedAt).length;
}

export async function saveCurrentDay(day: CurrentDay): Promise<void> {
  await setMeta('currentDay', day);
}

// One reroll per day: swap to a different pillar; log the dodged assignment.
export async function reroll(day: CurrentDay): Promise<CurrentDay> {
  if (day.rerolled) return day;
  const dodged = await db.deck.get(day.assignmentId);
  if (dodged) {
    await db.deck.update(dodged.id, { timesRerolled: dodged.timesRerolled + 1 });
  }
  const card = await drawCard(day.pillar);
  await db.deck.update(card.id, { timesServed: card.timesServed + 1 });
  await pushRecent(card.id);
  const next: CurrentDay = {
    ...day,
    assignmentId: card.id,
    assignmentText: card.text,
    pillar: card.pillar,
    rerolled: true,
    rerolledFromId: day.assignmentId,
  };
  await saveCurrentDay(next);
  return next;
}

// After completing today's assignment: "Draw another problem".
export async function drawAnother(): Promise<CurrentDay> {
  const today = todayId();
  const card = await drawCard();
  await db.deck.update(card.id, { timesServed: card.timesServed + 1 });
  await pushRecent(card.id);
  const rows = await db.days.where('id').startsWith(today).toArray();
  const day: CurrentDay = {
    date: today,
    assignmentId: card.id,
    assignmentText: card.text,
    pillar: card.pillar,
    rerolled: false,
    completionsToday: rows.filter((r) => r.completedAt).length,
  };
  await setMeta('currentDay', day);
  return day;
}
