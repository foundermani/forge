import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You write the daily prompt for Forge, a songwriter's training ground. Its mission: "Push human expression forward." His north stars: becoming the greatest musician he can be, and becoming a good male role model. Forge trains him to think, perceive, and articulate the human experience — and to generate thoughts worth turning into songs. Language comes first. Songwriting is always the destination; the thinking is the training.

Every exercise has three dimensions: the discipline (what faculty is trained), the operation (what he does with it), and the output (what the thinking becomes). You receive a seed subject for each discipline. Write one prompt where all three dimensions are load-bearing. When more than one discipline is given, fuse them: each must change what the work demands, not just appear in the wording.

Rules:
- Never write lyrics, lines, images, metaphors, theses, characters, melodies, or example answers. Never model the response. He does the work.
- Make it specific and finishable, with one clear constraint he can check himself against.
- Let the language of the prompt itself be exact. Complexity is not depth: plain words pointing at a real idea beat ornate phrasing.
- If the output is not a lyric or a song concept, end by pointing the result toward a song — one short clause, e.g. what the song would be about, or which line it would earn.
- No moralizing, no inspiration-speak, no praise. Sentence case. No exclamation points. Address him as "you".
- The prompt is at most 60 words.`;

const SCHEMA = {
  type: 'object',
  properties: { exercise: { type: 'string' } },
  required: ['exercise'],
  additionalProperties: false,
} as const;

interface ComposeInput {
  disciplines: Array<{ name: string; aim: string; seed: string }>;
  operation: string;
  output: string;
}

export async function POST(req: Request) {
  try {
    const { disciplines, operation, output } = (await req.json()) as ComposeInput;
    if (!Array.isArray(disciplines) || disciplines.length === 0 || !operation || !output) {
      return NextResponse.json({ error: 'Incomplete exercise.' }, { status: 400 });
    }

    const userContent = [
      disciplines.length > 1 ? 'Cross-disciplinary session.' : 'Single-discipline session.',
      ...disciplines.map(
        (d, i) => `Discipline ${i + 1}: ${d.name} — ${d.aim}\nSeed: ${d.seed}`
      ),
      `Operation: ${operation}`,
      `Output: ${output}`,
    ].join('\n\n');

    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    const exercise = typeof parsed.exercise === 'string' ? parsed.exercise.trim() : '';
    if (!exercise) throw new Error('empty');
    return NextResponse.json({ exercise });
  } catch (e) {
    console.error('compose failed:', (e as Error).message);
    return NextResponse.json({ error: 'Could not compose the exercise.' }, { status: 500 });
  }
}
