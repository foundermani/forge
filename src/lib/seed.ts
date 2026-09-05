import { db, type Pillar } from './db';

const SEED: Array<[Pillar, string]> = [
  // Language
  ['language', 'Write jealousy without using jealous, want, love, miss, mine, or her.'],
  ['language', "Twenty metaphors for the same idea. Pick the idea first, then don't stop until twenty."],
  ['language', 'Rewrite one verse of yours ten times. Ten genuinely different attempts, not edits.'],
  ['language', 'Write eight lines where every image is something you could photograph.'],
  ['language', 'Take one abstract sentence you believe ("people change") and write the one concrete scene that proves it without stating it.'],
  ['language', 'Write four lines where the last line forces a reinterpretation of the first three.'],
  ['language', 'Write the same two-line idea at three lengths: fourteen words, nine words, five words.'],
  ['language', 'Find a line you love by someone else. Write out exactly why every syllable sits where it sits.'],
  ['language', 'Write a verse where the narrator lies, and one detail gives them away.'],
  ['language', 'Write about an ending using only objects left behind.'],
  // Observation
  ['observation', 'Transcribe one real conversation from memory today. Exact words, no smoothing.'],
  ['observation', 'Write ten details from the last room you were in that no one else would have noticed.'],
  ['observation', 'Describe someone you know through three gestures. No adjectives about their character.'],
  ['observation', "Write down five overheard sentences this week's world gave you. Turn one into a first line."],
  ['observation', 'Document one tiny humiliation — yours or witnessed — in six lines, no commentary.'],
  ['observation', 'Describe a place at two different times of day so the change tells a story.'],
  ['observation', "Write what someone's car, room, or bag says that they wouldn't."],
  ['observation', 'Notice one contradiction in someone you love. Write it without resolving it.'],
  // Thought
  ['thought', 'Take a feeling you had this week and ask: what does this reveal about being human? Write four lines from the answer, not the feeling.'],
  ['thought', 'Write a breakup song that is actually about memory rewriting history.'],
  ['thought', 'Turn one philosophical contradiction into a four-line scene between two people.'],
  ['thought', 'Write about ambition as a question: does becoming someone require abandoning who wanted it?'],
  ['thought', 'Write attraction as projection — the narrator describes someone and accidentally describes themselves.'],
  ['thought', 'Write about time moving in one direction, without using the words time, past, future, or age.'],
  ['thought', 'Pick a belief you hold. Write the strongest verse arguing the opposite.'],
  ['thought', "Write a song-length answer to a question that can't be answered. The song must not answer it either."],
  // Music as meaning
  ['music', 'Write a melody over a single chord. Five distinct phrases, no harmonic help.'],
  ['music', 'Write a two-chord loop, then five toplines over it with completely different rhythmic identities.'],
  ['music', "Write a section where the lyric can't resolve and the harmony refuses to resolve with it."],
  ['music', 'Write a confident, resolving melody over a lyric that is a lie.'],
  ['music', 'Take a melodic fragment and make it intrude into two unrelated sections, like a memory.'],
  ['music', 'Write a devastating progression using only I and IV.'],
  ['music', 'Set the same four-line lyric twice: once so the melody agrees with it, once so the melody argues with it.'],
  ['music', 'Start the melody before beat one, on purpose, everywhere. Notice what it does to the voice of the song.'],
  // Form
  ['form', 'Write a song that is one escalating scene. No sections, just escalation.'],
  ['form', 'Write two unrelated memories that collide in the final four lines.'],
  ['form', 'Write a song as one side of a conversation.'],
  ['form', 'Write one sentence, then recontextualize it five times. The sentence never changes.'],
  ['form', 'Write a song where the chorus never arrives — and its absence is the point.'],
  ['form', 'Tell a story strictly backward. Last event first.'],
  ['form', "Map the full structure of a song you admire: what changes each section, what's withheld, where the title lands, where the melody peaks, where the turn is. Then write a skeleton that borrows the *shape* only."],
  ['form', 'Write a song whose emotional climax happens before the first chorus.'],
];

export async function ensureSeeded(): Promise<void> {
  const count = await db.deck.count();
  if (count > 0) return;
  await db.deck.bulkAdd(
    SEED.map(([pillar, text], i) => ({
      id: `seed-${i + 1}`,
      pillar,
      text,
      weight: 1,
      timesServed: 0,
      timesRerolled: 0,
      source: 'seed' as const,
    }))
  );
}
