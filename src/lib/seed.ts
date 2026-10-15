import { db, type DeckRow, type Pillar } from './db';
import { PILLAR_TO_DISCIPLINE, type Discipline } from './disciplines';

// Classic assignments: complete, authored problems from Forge 1. They stay in
// the deck as-is and are dealt alongside composed exercises.
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

// Discipline for each classic, index-aligned with SEED (seed-1 … seed-67).
const CLASSIC_DISCIPLINE: Discipline[] = [
  // 1–10 language
  'wordcraft', 'metaphor', 'wordcraft', 'perception', 'metaphor',
  'narrative', 'wordcraft', 'prosody', 'character', 'narrative',
  // 11–18 observation
  'perception', 'perception', 'character', 'culture', 'emotion', 'perception', 'character', 'dialectics',
  // 19–26 thought
  'philosophy', 'philosophy', 'dialectics', 'philosophy', 'character', 'metaphor', 'dialectics', 'philosophy',
  // 27–34 music
  'prosody', 'prosody', 'prosody', 'prosody', 'prosody', 'prosody', 'prosody', 'prosody',
  // 35–42 form
  'narrative', 'narrative', 'character', 'narrative', 'narrative', 'narrative', 'narrative', 'narrative',
  // 43–47 language (batch 2)
  'wordcraft', 'wordcraft', 'metaphor', 'wordcraft', 'wordcraft',
  // 48–52 observation
  'perception', 'perception', 'culture', 'perception', 'perception',
  // 53–57 thought
  'philosophy', 'identity', 'emotion', 'dialectics', 'philosophy',
  // 58–62 music
  'prosody', 'prosody', 'prosody', 'prosody', 'prosody',
  // 63–67 form
  'narrative', 'narrative', 'narrative', 'character', 'narrative',
];

// Seed subjects: the raw material the engine combines with an operation and an
// output to compose an exercise. APPEND ONLY within each list — ids are
// `s-<discipline>-<index>`, so reordering would corrupt decks on devices.
const SEEDS: Record<Discipline, string[]> = {
  wordcraft: [
    'The word "home" and the six things it quietly means.',
    '"Fine" — the most dishonest word in English.',
    'The gap between "I\'m sorry" and "I apologize."',
    'The etymology of "nostalgia": a homecoming and a pain.',
    'One sentence whose meaning changes depending on which word you stress.',
    'The differences between "alone," "lonely," and "by myself."',
    'Verbs of leaving: left, walked out, went, disappeared, drifted.',
    'A word you use every day that your parents never would.',
    'The passive voice as a way of hiding who did it.',
    'The weight of "always" and "never" in an argument.',
    'What changes when "you" becomes "we" — and when "we" becomes "you."',
    'A double meaning hiding inside a phrase you say without thinking.',
    'The euphemisms people use for death, money, or wanting someone.',
    'The exact word for the color of the sky right before a storm.',
    'A cliché you love, and how it got worn out in the first place.',
    'Concrete nouns versus abstract nouns: "chair" versus "comfort."',
    'The difference between a word that sounds true and a word that is true.',
    'Tense: the same moment told in past, present, and future.',
    'A swear word used as punctuation versus a swear word used as meaning.',
    'The shortest sentence anyone ever said to you that changed something.',
  ],
  philosophy: [
    'Whether a promise made by who you were binds who you are now.',
    'The difference between being forgiven and being let off.',
    'Why people fear being forgotten more than being misunderstood.',
    'Whether you can still owe something to a person who has died.',
    'Freedom as the power to choose versus freedom as not needing to.',
    'The moment a habit stops being something you do and becomes something you are.',
    'Whether a feeling you never act on is still part of your character.',
    'Why the people who know you best are sometimes the worst at seeing you.',
    'Luck: how much of what you are proud of you actually earned.',
    'Whether honesty is a virtue when the truth only relieves the teller.',
    'The self you are alone versus the self you are in a room — which one is real.',
    'Why an ending changes what everything before it meant.',
    'Whether wanting to be good is its own kind of vanity.',
    'What you are obligated to pass on, and what you are allowed to let die with you.',
    'Comfort as the slow opposite of growth — or its precondition.',
    'Whether a life can mean something if no one ever witnesses it.',
    'Strength versus hardness, and the exact point where one becomes the other.',
    'The ethics of using real people\'s lives as material for songs.',
  ],
  emotion: [
    'Envy versus jealousy.',
    'Nostalgia versus grief.',
    'Shame versus guilt.',
    'Tenderness toward someone you are angry at.',
    'Pride that hurts: being proud of someone who left you behind.',
    'Awe that makes you feel small and safe at the same time.',
    'Resentment you have started to enjoy.',
    'Relief that arrives with guilt attached.',
    'Longing for a version of a person who never existed.',
    'Anticipatory grief — mourning something that is still here.',
    'The embarrassment of being moved by something you think is cheap.',
    'Contentment that feels suspicious.',
    'Loneliness in a crowded room versus loneliness in an empty one.',
    'The anger underneath sadness.',
    'Hope as a kind of fear.',
    'Fondness for a version of yourself you have outgrown.',
  ],
  narrative: [
    'The moment just before someone says the thing that changes everything.',
    'A story told only through what was left out.',
    'An ending the listener realizes they saw coming all along.',
    'A memory replayed three times, changing each time.',
    'Dramatic irony: the listener knows something the narrator doesn\'t.',
    'A small object that appears early and returns transformed.',
    'A conversation where the subtext is the real story.',
    'A breakup from the point of view of the apartment.',
    'A story that starts at the climax and walks backward to the cause.',
    'Two timelines that only meet in the last line.',
    'A narrator who changes their mind halfway through the song.',
    'The aftermath, without ever showing the event.',
    'A turning point that looked like nothing at the time.',
    'A repeated phrase that means something different every time it returns.',
    'A secret revealed to the listener but never to the other character.',
  ],
  metaphor: [
    'Grief as weather, as architecture, and as a debt.',
    'Time as a currency you can spend but never save.',
    'A relationship as a house, and which rooms are locked.',
    'The body as a map of everything that happened to it.',
    'Memory as a photocopy of a photocopy.',
    'Anger as a fire, a flood, or a locked door.',
    'A recurring symbol you could carry through ten songs.',
    'Synesthesia: what the sound of a voice you love tastes like.',
    'Ambition as a ladder, a hunger, or a ghost.',
    'Trust as a material — glass, rope, or concrete.',
    'A city as a body: arteries, lungs, scars.',
    'Silence as an object you could hold.',
    'Healing as something other than a wound closing.',
    'An allegory for something you can\'t say directly.',
  ],
  character: [
    'Someone who apologizes too quickly.',
    'A father who shows love only by fixing things.',
    'A friend who always has to be the one who is fine.',
    'Someone who tells the same story every time you see them.',
    'A person who is generous in public and cold at home.',
    'Someone who keeps testing the people who love them.',
    'The person in the group who never says what they want.',
    'Someone who believes they are the victim in a story where they weren\'t.',
    'A man who learned that anger is the only safe feeling.',
    'Someone who stays because leaving would mean admitting the years were wasted.',
    'A person who is kind to strangers and merciless with themselves.',
    'Two people in a power struggle neither of them will name.',
  ],
  prosody: [
    'Open vowels versus closed vowels: "home" versus "it."',
    'A line where the stressed syllables fall on the wrong words.',
    'Plosives (p, b, t, k) as anger; sibilants (s, sh) as secrecy.',
    'Internal rhyme that hides inside the line instead of at the end.',
    'Syncopation: a line that arrives late on purpose.',
    'The sound of a verse with no rhyme at all.',
    'Long vowels on held notes, short vowels on fast ones.',
    'A phrase that has to be breathed in the middle.',
    'Consonant clusters that make a word hard to sing.',
    'Slant rhyme versus perfect rhyme — the sound of almost.',
    'Repetition with one word changed.',
    'A word whose sound contradicts its meaning.',
  ],
  perception: [
    'How a room changes when someone you love walks into it.',
    'The way time stretches during waiting and collapses during joy.',
    'What you notice first when you are afraid.',
    'A memory you are no longer sure actually happened.',
    'The texture of the morning after bad news.',
    'How music changes the way a street looks.',
    'The difference between looking at something and attending to it.',
    'A familiar place after you have been away for years.',
    'The physical sensation of a word you can\'t remember.',
    'How expectation rewrites what you actually hear.',
    'The edge of sleep — what thinking feels like as it dissolves.',
    'A smell that carries you somewhere specific.',
  ],
  dialectics: [
    'You can love someone and be relieved they are gone.',
    'Ambition as both self-betrayal and self-respect.',
    'Loyalty to a friend versus loyalty to the truth.',
    'Confidence and arrogance as the same act seen from two sides.',
    'Wanting to be known and wanting to be left alone.',
    'Protecting someone by lying to them.',
    'Your parents as the source of both your wounds and your best qualities.',
    'Freedom from tradition versus the loneliness it leaves behind.',
    'Being needed as love, and being needed as a trap.',
    'A belief you hold that someone you respect thinks is cruel.',
    'Forgiveness that lets the wrong continue.',
    'Success that makes you less like the person who wanted it.',
  ],
  synthesis: [
    'What a relationship has in common with a supply chain.',
    'Plate tectonics and slow arguments.',
    'Compound interest and resentment.',
    'What a song shares with a suspension bridge.',
    'Evolution and how a habit forms.',
    'Gravity as a model for attachment.',
    'How a forest fire is good for a forest — and what that says about endings.',
    'Software updates and personal change.',
    'How a jazz musician improvises and how people lie.',
    'Erosion and patience.',
    'Immune systems and how people protect their beliefs.',
    'Chess openings and first conversations.',
  ],
  culture: [
    'The unspoken rules of how men comfort each other.',
    'What a family dinner reveals about who holds power.',
    'Status symbols in your generation that your parents don\'t recognize.',
    'Rituals of leaving home.',
    'How people perform being busy.',
    'What it means to "make it" where you grew up.',
    'How people signal belonging online.',
    'Conformity disguised as rebellion.',
    'What a man is allowed to cry about.',
    'The unwritten rules of a group chat.',
    'How grief is performed versus how it is felt.',
    'What a good man looks like to a ten-year-old boy who is watching you.',
  ],
  identity: [
    'A belief about music you would defend even if it cost you listeners.',
    'The influence you are most afraid of sounding like.',
    'What you owe the people who listen to you.',
    'The difference between your taste and your voice.',
    'A song you are embarrassed to love, and what it taught you.',
    'What you would make if no one would ever hear it.',
    'The kind of man you want a stranger to hear in your songs.',
    'Where courage ends and provocation begins.',
    'Originality versus honesty — which one you would give up.',
    'The artist you were five years ago, judged by who you are now.',
    'What "push human expression forward" actually asks of you this year.',
    'A value you hold that your music doesn\'t reflect yet.',
  ],
};

function fresh(row: Omit<DeckRow, 'weight' | 'timesServed' | 'timesRerolled' | 'source'>): DeckRow {
  return { ...row, weight: 1, timesServed: 0, timesRerolled: 0, source: 'seed' };
}

// Idempotent, runs on every app open. Cards already on the device keep their
// weight and serve/reroll counts; Forge 1 cards gain a discipline; anything
// missing by id is added. Callers on the same page share one run — the shell
// and Today both call this on load, and two concurrent bulkAdds collide.
let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  seeding ??= seed().catch((e) => {
    seeding = null;
    throw e;
  });
  return seeding;
}

async function seed(): Promise<void> {
  const rows = await db.deck.toArray();
  const have = new Set(rows.map((r) => r.id));

  const backfill = rows
    .filter((r) => r.id.startsWith('seed-') && (!r.discipline || !r.kind))
    .map((r) => {
      const i = Number(r.id.slice(5)) - 1;
      const discipline =
        CLASSIC_DISCIPLINE[i] ?? (r.pillar ? PILLAR_TO_DISCIPLINE[r.pillar] : 'wordcraft');
      return { ...r, kind: 'classic' as const, discipline };
    });
  if (backfill.length > 0) await db.deck.bulkPut(backfill);

  const wanted: DeckRow[] = [
    ...SEED.map(([pillar, text], i) =>
      fresh({ id: `seed-${i + 1}`, pillar, text, kind: 'classic', discipline: CLASSIC_DISCIPLINE[i] })
    ),
    ...(Object.keys(SEEDS) as Discipline[]).flatMap((d) =>
      SEEDS[d].map((text, i) => fresh({ id: `s-${d}-${i + 1}`, text, kind: 'seed', discipline: d }))
    ),
  ];
  const missing = wanted.filter((c) => !have.has(c.id));
  // bulkPut, not bulkAdd: another tab may have just added the same fresh cards.
  if (missing.length > 0) await db.deck.bulkPut(missing);
}
