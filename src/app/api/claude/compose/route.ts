import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You write the daily prompt for Forge, a songwriter's training ground. Its mission: "Push human expression forward." His north stars: becoming the greatest musician he can be, and becoming a good male role model. Forge trains him to think, perceive, and articulate the human experience — and to generate thoughts worth turning into songs. Language comes first. Songwriting is the destination, but Forge develops the person who writes the songs: not every exercise has to mention music.

Every exercise has three dimensions: the discipline (what faculty is trained), the operation (what he does with it), and the output (what the thinking becomes). You receive a seed subject for each discipline. Write one prompt where all three dimensions are load-bearing. When more than one discipline is given, fuse them: each must change what the work demands, not just appear in the wording.

Each exercise also has a transfer mode:
- direct: he makes something for a song: a lyric, melody, hook, or song concept. Say so plainly; no closing line about where it goes.
- indirect: train the faculty on its own terms. Do not mention songs, music, lyrics, singing, verses, choruses, hooks, or listeners. The transfer to songwriting stays implicit.
- open: no deliverable. He explores, notices, or thinks something through, and what he writes down is notes for himself. Do not mention songs or music, and do not ask for anything polished.

You may also receive the recent exercises Forge has assigned. Make this one a genuinely different exercise: not the same move in new words, and not the same kind of subject. If the seed pulls toward a recent exercise, take it somewhere else. Never refer to past exercises; each prompt stands alone.

Rules:
- Never write lyrics, lines, images, metaphors, theses, characters, melodies, or example answers. Never model the response. Never hand him the insight, in parentheses or anywhere else, and never name what the finished song is about. He does the work.
- One task, two to four sentences. Specific and finishable, with one clear constraint he can check himself against. Every count and step must add up and be physically possible.
- Vary the check. Not every prompt needs a "Check:" label, and do not default to imagining a stranger or reader.
- Do not open by naming the operation or output as a label ("Invent a song concept:", "Deconstruct…"). Start with the material.
- Let the language of the prompt itself be exact. Complexity is not depth: plain words pointing at a real idea beat ornate phrasing.
- No moralizing, no inspiration-speak, no praise. Sentence case, starting with a capital letter. No exclamation points. Address him as "you".
- Hard limit: 60 words; anything longer is thrown away. Aim for 35 to 50. If it runs long, cut steps, not clarity.`;

const JUDGE = `You review a daily creative exercise before a songwriter sees it. He does it himself, on paper or out loud, from his own life. Judge only the exercise, never write a better one. Fail a test only for a specific problem you can point to in the text; when in doubt, it passes. Asking him to notice, list, or name things is not revealing the insight: discovery fails only when the exercise states the conclusion he should reach.
- clarity: one primary creative task, not two stapled together.
- feasibility: the steps are internally consistent; counts add up; nothing is physically impossible.
- discovery: it does not reveal the insight, answer, or example he is meant to find himself.
- independence: he can do it from the text alone, without extra explanation.
- novelty: it is not essentially the same exercise (same move on a similar subject) as any of the recent ones. True if no recent exercises are given.
- transfer: only two things. Direct must make something for a song; indirect and open must not mention music. Do not judge how closely it follows the operation or output.
For each failure, quote the exact words in the exercise that cause it (for novelty, the words that repeat a recent exercise's move). No quote, no failure. Most exercises have no failures.`;

const EXERCISE_SCHEMA = {
  type: 'object',
  properties: { exercise: { type: 'string' } },
  required: ['exercise'],
  additionalProperties: false,
} as const;

const TESTS = ['clarity', 'feasibility', 'discovery', 'independence', 'novelty', 'transfer'] as const;

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    failures: {
      type: 'array',
      items: {
        type: 'object',
        properties: { test: { type: 'string', enum: [...TESTS] }, quote: { type: 'string' }, why: { type: 'string' } },
        required: ['test', 'quote', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['failures'],
  additionalProperties: false,
} as const;

const MAX_WORDS = 60;
// Candidates drafted and judged in parallel. One wide round keeps the wait
// short; a second sequential round doubled it for little gain.
const PER_ROUND = 3;
const ROUNDS = 1;

// Words that break an indirect or open exercise. "sing" alone, so "single" passes.
const MUSIC_WORDS = /\b(songs?|songwrit\w*|lyrics?|lyrical|melod\w*|chorus\w*|verses?|hooks?|bridge|music\w*|sing|sings|singing|sung|listeners?)\b/i;

type TransferMode = 'direct' | 'indirect' | 'open';

interface ComposeInput {
  disciplines: Array<{ name: string; aim: string; seed: string }>;
  operation: string;
  output: string;
  transferMode?: TransferMode;
  recent?: string[];
}

interface Candidate {
  exercise: string;
  failed: string[];
  reason: string;
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function jsonText(response: Anthropic.Message): unknown {
  const raw = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(raw);
}

async function draft(client: Anthropic, messages: Anthropic.MessageParam[]): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 400,
    thinking: { type: 'disabled' },
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: EXERCISE_SCHEMA } },
    messages,
  });
  const parsed = jsonText(response) as { exercise?: unknown };
  const exercise = typeof parsed.exercise === 'string' ? parsed.exercise.trim() : '';
  if (!exercise) throw new Error('empty');
  return exercise.charAt(0).toUpperCase() + exercise.slice(1);
}

// Cheap structural tests first; only drafts that pass them go to the judge.
function structuralFailures(exercise: string, mode: TransferMode): string[] {
  const failed: string[] = [];
  if (wordCount(exercise) > MAX_WORDS) failed.push('length');
  if (exercise.includes('!')) failed.push('tone');
  if (mode !== 'direct' && MUSIC_WORDS.test(exercise)) failed.push('transfer');
  return failed;
}

async function judge(client: Anthropic, exercise: string, brief: string): Promise<Candidate> {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 500,
    thinking: { type: 'disabled' },
    system: JUDGE,
    output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    messages: [{ role: 'user', content: `${brief}\n\nThe exercise to review:\n${exercise}` }],
  });
  const parsed = jsonText(response) as { failures?: Array<{ test: string; quote: string; why: string }> };
  // A failure must point at words that are actually in the exercise.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const text = normalize(exercise);
  const failures = (parsed.failures ?? []).filter((f) => {
    const q = normalize(f.quote);
    return q.length > 0 && text.includes(q);
  });
  return {
    exercise,
    failed: [...new Set(failures.map((f) => f.test))],
    reason: failures.map((f) => `${f.test}: "${f.quote}" (${f.why})`).join(' '),
  };
}

async function candidate(client: Anthropic, brief: string, mode: TransferMode): Promise<Candidate | null> {
  try {
    let exercise = await draft(client, [{ role: 'user', content: brief }]);
    // Overshooting the length is common and mechanical, so trim it rather than
    // discard it. Every other failure means a fresh draft.
    if (wordCount(exercise) > MAX_WORDS) {
      exercise = await draft(client, [
        { role: 'user', content: brief },
        { role: 'assistant', content: JSON.stringify({ exercise }) },
        {
          role: 'user',
          content: `That is ${wordCount(exercise)} words. Cut it to at most ${MAX_WORDS - 10}: same task, fewer steps.`,
        },
      ]);
    }
    const failed = structuralFailures(exercise, mode);
    if (failed.length) return { exercise, failed, reason: 'structural' };
    // If the judge itself fails, keep the draft but rank it below judged passes.
    return await judge(client, exercise, brief).catch(() => ({ exercise, failed: ['unjudged'], reason: '' }));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { disciplines, operation, output, transferMode, recent } = (await req.json()) as ComposeInput;
    if (!Array.isArray(disciplines) || disciplines.length === 0 || !operation || !output) {
      return NextResponse.json({ error: 'Incomplete exercise.' }, { status: 400 });
    }
    const mode: TransferMode = transferMode ?? 'direct';
    const history = Array.isArray(recent) ? recent.slice(-12) : [];

    const brief = [
      disciplines.length > 1 ? 'Cross-disciplinary session.' : 'Single-discipline session.',
      ...disciplines.map((d, i) => `Discipline ${i + 1}: ${d.name} — ${d.aim}\nSeed: ${d.seed}`),
      `Operation: ${operation}`,
      `Output: ${output}`,
      `Transfer mode: ${mode}`,
      history.length ? `Recent exercises, oldest first:\n${history.map((h) => `- ${h}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Reject and regenerate rather than patch: editing a weak draft tends to
    // keep its weak idea. Keep the best seen in case nothing passes.
    const client = new Anthropic();
    const seen: Candidate[] = [];
    for (let round = 0; round < ROUNDS; round++) {
      const drafts = await Promise.all(Array.from({ length: PER_ROUND }, () => candidate(client, brief, mode)));
      for (const c of drafts) if (c) seen.push(c);
      if (seen.some((c) => c.failed.length === 0)) break;
    }
    if (seen.length === 0) throw new Error('no drafts');

    const rank = (c: Candidate) =>
      c.failed.length + (c.reason === 'structural' ? 10 : 0) + (c.failed.includes('unjudged') ? 0.5 : 0);
    const best = seen.reduce((a, b) => (rank(b) < rank(a) ? b : a));
    return NextResponse.json({
      exercise: best.exercise,
      validation: { passed: best.failed.length === 0, failed: best.failed, reason: best.reason, drafts: seen.length },
    });
  } catch (e) {
    console.error('compose failed:', (e as Error).message);
    return NextResponse.json({ error: 'Could not compose the exercise.' }, { status: 500 });
  }
}
