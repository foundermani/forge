import type { Pillar } from './db';

// Forge 2: every exercise has three dimensions.
//   discipline — what faculty is being trained
//   operation  — what you do with it
//   output     — what the thinking becomes
// Language leads and songwriting is the destination: wordcraft carries the
// largest share, and lyrics/song concepts are the most common outputs.

export const MISSION = 'Push human expression forward.';

export type Discipline =
  | 'wordcraft'
  | 'philosophy'
  | 'emotion'
  | 'narrative'
  | 'metaphor'
  | 'character'
  | 'prosody'
  | 'perception'
  | 'dialectics'
  | 'synthesis'
  | 'culture'
  | 'identity';

export type Operation =
  | 'analyze'
  | 'compare'
  | 'deconstruct'
  | 'synthesize'
  | 'reframe'
  | 'defend'
  | 'interpret'
  | 'invent'
  | 'compress'
  | 'expand';

export type Output = 'lyric' | 'fragment' | 'metaphor' | 'thesis' | 'character' | 'melody' | 'concept';

export type Intensity = 1 | 2 | 3 | 4 | 5;

export type CrossFrequency = 'off' | 'sometimes' | 'often';

interface DisciplineInfo {
  label: string;
  aim: string;
  weight: number; // suggested share of sessions, in percent
  outputs: Partial<Record<Output, number>>; // which outputs suit this discipline, weighted
}

export const DISCIPLINES: Record<Discipline, DisciplineInfo> = {
  wordcraft: {
    label: 'linguistic precision & wordcraft',
    aim: 'Why one word can carry ten times the emotional weight of another: diction, connotation, ambiguity, etymology, syntax, double meanings, phonetics, rhetoric.',
    weight: 18,
    outputs: { lyric: 4, metaphor: 1, thesis: 1, fragment: 1 },
  },
  philosophy: {
    label: 'philosophical inquiry',
    aim: 'Original ideas, and the philosophical implications of ordinary experience: existence, contradiction, morality, identity, freedom, meaning, consciousness.',
    weight: 14,
    outputs: { lyric: 2, concept: 2, thesis: 2, fragment: 1, metaphor: 1 },
  },
  emotion: {
    label: 'emotional granularity',
    aim: 'Distinguishing the emotions ordinary language collapses: longing, nostalgia, grief, envy, tenderness, shame, pride, resentment, awe, ambivalence.',
    weight: 12,
    outputs: { lyric: 3, fragment: 2, thesis: 1, metaphor: 1, character: 1 },
  },
  narrative: {
    label: 'narrative architecture',
    aim: 'Songs that unfold as experiences: nonlinear structure, revelation, foreshadowing, subtext, dramatic irony, perspective shifts, omission.',
    weight: 11,
    outputs: { concept: 3, lyric: 2, fragment: 2 },
  },
  metaphor: {
    label: 'metaphor & symbol',
    aim: 'Turning abstract experience into tangible images: conceptual metaphor, symbolism, allegory, synesthesia, extended metaphor, recurring symbolic languages.',
    weight: 10,
    outputs: { metaphor: 3, lyric: 3, concept: 1 },
  },
  character: {
    label: 'character psychology',
    aim: 'Believable perspectives: motivation, attachment, defense mechanisms, self-deception, conflicting desires, unreliable narrators, interpersonal power.',
    weight: 8,
    outputs: { character: 2, lyric: 2, fragment: 2, concept: 1 },
  },
  prosody: {
    label: 'prosody & sonic language',
    aim: 'The physical sound of language as expression: stress, rhythm, vowel color, consonant texture, internal rhyme, melodic phrasing.',
    weight: 8,
    outputs: { lyric: 3, melody: 2 },
  },
  perception: {
    label: 'perception & phenomenology',
    aim: 'What it felt like to exist inside an experience: how memory, attention, emotion and expectation shape subjective reality.',
    weight: 6,
    outputs: { lyric: 3, fragment: 2, metaphor: 2 },
  },
  dialectics: {
    label: 'dialectics & paradox',
    aim: 'Holding two opposing truths without forcing a resolution: competing truths, moral dilemmas, dissonance, arguing against your own beliefs.',
    weight: 5,
    outputs: { lyric: 2, thesis: 2, concept: 2, character: 1 },
  },
  synthesis: {
    label: 'conceptual synthesis',
    aim: 'Original concepts from unexpected connections: analogies across unrelated fields, conceptual blending, systems thinking, reframing the familiar.',
    weight: 4,
    outputs: { concept: 3, lyric: 2, metaphor: 2, thesis: 1 },
  },
  culture: {
    label: 'anthropology & culture',
    aim: 'Seeing the invisible systems of everyday life: ritual, status, conformity, generational belief, belonging, masculinity, collective behavior.',
    weight: 2,
    outputs: { lyric: 2, concept: 2, thesis: 1, fragment: 1, character: 1 },
  },
  identity: {
    label: 'artistic identity & conviction',
    aim: 'A distinctive worldview expressed without borrowed perspectives: authenticity, aesthetic philosophy, courage, values, responsibility, originality versus influence.',
    weight: 2,
    outputs: { concept: 2, lyric: 2, thesis: 2 },
  },
};

export const DISCIPLINE_ORDER = Object.keys(DISCIPLINES) as Discipline[];

export const DEFAULT_WEIGHTS: Record<Discipline, number> = Object.fromEntries(
  DISCIPLINE_ORDER.map((d) => [d, DISCIPLINES[d].weight])
) as Record<Discipline, number>;

export const OPERATIONS: Operation[] = [
  'analyze',
  'compare',
  'deconstruct',
  'synthesize',
  'reframe',
  'defend',
  'interpret',
  'invent',
  'compress',
  'expand',
];

export const OUTPUT_LABELS: Record<Output, string> = {
  lyric: 'a lyric',
  fragment: 'a narrative fragment',
  metaphor: 'a metaphor',
  thesis: 'a thesis',
  character: 'a character',
  melody: 'a melodic phrase',
  concept: 'a song concept',
};

export interface IntensityLevel {
  level: Intensity;
  name: string;
  minutes: number;
  range: string;
  scope: string;
}

export const INTENSITIES: IntensityLevel[] = [
  { level: 1, name: 'Light', minutes: 10, range: '10 min', scope: 'One clean move. Momentum over polish.' },
  { level: 2, name: 'Focused', minutes: 15, range: '15 min', scope: 'One idea, worked until it is precise.' },
  {
    level: 3,
    name: 'Interrogate',
    minutes: 25,
    range: '20–30 min',
    scope: 'Challenge assumptions, examine contradictions, and sharpen conceptual precision.',
  },
  { level: 4, name: 'Deep', minutes: 45, range: '45 min', scope: "Stay with it until it shows you something you didn't bring to it." },
  { level: 5, name: 'Extreme', minutes: 75, range: '75 min', scope: 'Exhaust it. Several attempts, the full argument, a finished artifact.' },
];

export const CRITERIA = [
  { key: 'originality', label: 'Originality', question: 'An observation worth making, or the familiar said differently?' },
  { key: 'precision', label: 'Precision', question: 'Does the language capture exactly what you meant?' },
  { key: 'emotionalTruth', label: 'Emotional truth', question: 'Does it feel psychologically authentic?' },
  { key: 'depth', label: 'Conceptual depth', question: 'Does it reveal something beyond the surface?' },
  { key: 'musicality', label: 'Musicality', question: 'Could it be compelling sung, not just read?' },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]['key'];
export type Ratings = Record<CriterionKey, number>;

export const CROSS_PROBABILITY: Record<CrossFrequency, number> = { off: 0, sometimes: 0.2, often: 0.4 };

// Forge 1 sorted assignments into five pillars. History keeps those labels as recorded.
export const PILLAR_LABELS: Record<Pillar, string> = {
  language: 'language',
  observation: 'observation',
  thought: 'thought',
  music: 'music as meaning',
  form: 'form',
};

export const PILLAR_TO_DISCIPLINE: Record<Pillar, Discipline> = {
  language: 'wordcraft',
  observation: 'perception',
  thought: 'philosophy',
  music: 'prosody',
  form: 'narrative',
};

export function pickWeighted<T>(items: Array<[T, number]>): T {
  const live = items.filter(([, w]) => w > 0);
  const pool = live.length ? live : items;
  const total = pool.reduce((s, [, w]) => s + Math.max(w, 0.01), 0);
  let r = Math.random() * total;
  for (const [item, w] of pool) {
    r -= Math.max(w, 0.01);
    if (r <= 0) return item;
  }
  return pool[pool.length - 1][0];
}

export function exerciseMeta(x: {
  disciplines?: Discipline[];
  operation?: Operation;
  output?: Output;
  pillar?: Pillar;
}): string {
  const names = x.disciplines?.length
    ? x.disciplines.map((d) => DISCIPLINES[d].label).join(' × ')
    : x.pillar
      ? PILLAR_LABELS[x.pillar]
      : '';
  if (x.operation && x.output) return `${names} · ${x.operation} → ${OUTPUT_LABELS[x.output]}`;
  return names;
}

export function intensityName(level?: number): string | undefined {
  return INTENSITIES.find((l) => l.level === level)?.name;
}
