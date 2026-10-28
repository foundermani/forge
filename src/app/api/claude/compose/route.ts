import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You write the daily prompt for Forge, a songwriter's training ground. Its mission: "Push human expression forward." His north stars: becoming the greatest musician he can be, and becoming a good male role model. Forge trains him to think, perceive, and articulate the human experience — and to generate thoughts worth turning into songs. Language comes first. Songwriting is always the destination; the thinking is the training.

Every exercise has three dimensions: the discipline (what faculty is trained), the operation (what he does with it), and the output (what the thinking becomes). You receive a seed subject for each discipline. Write one prompt where all three dimensions are load-bearing. When more than one discipline is given, fuse them: each must change what the work demands, not just appear in the wording.

Rules:
- Never write lyrics, lines, images, metaphors, theses, characters, melodies, or example answers. Never model the response. Never hand him the insight, in parentheses or anywhere else, and never name what the finished song is about. He does the work.
- One task, two to four sentences. Specific and finishable, with one clear constraint he can check himself against. Every count and step must add up and be physically possible.
- Vary the check. Not every prompt needs a "Check:" label, and do not default to imagining a stranger or reader.
- Do not open by naming the operation or output as a label ("Invent a song concept:", "Deconstruct…"). Start with the material.
- Let the language of the prompt itself be exact. Complexity is not depth: plain words pointing at a real idea beat ornate phrasing.
- If the output is a thesis, metaphor, character, narrative fragment, or melodic phrase, the last sentence must point the result toward a song: what it could become or where it would sit, never what it would say. Phrase it differently each time. If the output is a lyric or song concept, leave this sentence out.
- No moralizing, no inspiration-speak, no praise. Sentence case, starting with a capital letter. No exclamation points. Address him as "you".
- Hard limit: 60 words. Aim for 35 to 50. If it runs long, cut steps, not clarity.`;

const SCHEMA = {
  type: 'object',
  properties: { exercise: { type: 'string' } },
  required: ['exercise'],
  additionalProperties: false,
} as const;

const MAX_WORDS = 60;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

async function compose(client: Anthropic, messages: Anthropic.MessageParam[]): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 400,
    thinking: { type: 'disabled' },
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages,
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
  return exercise;
}

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
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }];
    let exercise = await compose(client, messages);

    // The model often overshoots the word limit; one rewrite usually fixes it.
    if (wordCount(exercise) > MAX_WORDS) {
      messages.push(
        { role: 'assistant', content: JSON.stringify({ exercise }) },
        {
          role: 'user',
          content: `That is ${wordCount(exercise)} words. Rewrite it in at most ${MAX_WORDS - 10} words: same task, fewer steps.`,
        }
      );
      const shorter = await compose(client, messages).catch(() => '');
      if (shorter && wordCount(shorter) < wordCount(exercise)) exercise = shorter;
    }

    exercise = exercise.charAt(0).toUpperCase() + exercise.slice(1);
    return NextResponse.json({ exercise });
  } catch (e) {
    console.error('compose failed:', (e as Error).message);
    return NextResponse.json({ error: 'Could not compose the exercise.' }, { status: 500 });
  }
}
