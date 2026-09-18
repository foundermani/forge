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

  // Batch 2 (added later). APPEND ONLY — ids are index-based, so reordering or
  // inserting above this line would corrupt decks already living on devices.
  // Language
  ['language', 'Write six lines where the verbs do all the emotional work. Then delete every adjective and see what survives.'],
  ['language', "Catch a cliché you actually use. Write the specific memory it's been hiding."],
  ['language', 'Describe a color to someone blind since birth, in eight lines, without naming any color.'],
  ['language', 'Write four lines, then cut every word the lines can live without. What remains is the lyric.'],
  ['language', 'Write a verse that never names its subject. Let the title do the naming.'],
  // Observation
  ['observation', 'Watch one stranger for five minutes. Write the story their hands tell.'],
  ['observation', 'List every sound in the room you are in right now. Turn the quietest one into a first line.'],
  ['observation', "Describe today's weather only through what people did about it."],
  ['observation', "Write the exact moment someone's face changed this week — in slow motion, one line per instant."],
  ['observation', 'Find the ugliest thing on your street. Give it the attention a love song gets.'],
  // Thought
  ['thought', "Write forgiveness as a transaction: who pays, in what currency, and what's the change."],
  ['thought', "Take something you're proud of. Write the verse that asks what it cost."],
  ['thought', 'Write nostalgia as an unreliable narrator defending itself.'],
  ['thought', 'Write an argument where both people are right. No winner allowed.'],
  ['thought', 'Write about home as a question: is it a place or a time? Do not answer it.'],
  // Music as meaning
  ['music', 'Write a topline where the highest note lands on the least important word. Notice what breaks, then fix it.'],
  ['music', 'Take a happy melody you know and write the saddest true lyric it will hold.'],
  ['music', 'Write a verse from short notes only, then a chorus from held notes only. Say what the contrast means.'],
  ['music', "Write a melody that keeps landing on an unresolved tone, for a narrator who can't say the thing."],
  ['music', 'Write a line whose most important word is replaced by a rest. Make the silence sing it.'],
  // Form
  ['form', 'Tell the same story as three voicemails, months apart. Nothing else.'],
  ['form', 'Open and close the song with the same line, and let everything between change what it means.'],
  ['form', 'Write a list song: every line an item, no connective tissue, the order doing the storytelling.'],
  ['form', 'Write a duet for one voice — two characters share the lines, and only the pronouns tell them apart.'],
  ['form', 'Write a song that lasts exactly as long as the moment it describes: one red light, one held breath.'],
];

export async function ensureSeeded(): Promise<void> {
  // Top-up, not first-run-only: cards already on the device keep their weight
  // and serve/reroll counts; only ids the deck doesn't have yet are added.
  const existing = new Set(await db.deck.toCollection().primaryKeys());
  const missing = SEED.map(([pillar, text], i) => ({
    id: `seed-${i + 1}`,
    pillar,
    text,
    weight: 1,
    timesServed: 0,
    timesRerolled: 0,
    source: 'seed' as const,
  })).filter((c) => !existing.has(c.id));
  if (missing.length > 0) await db.deck.bulkAdd(missing);
}
