import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You are a brutal, precise writing professor conducting a pressure test on a songwriter's work in progress. You never rewrite, suggest lines, offer alternatives, or complete anything. You only ask questions that force the writer to justify and see their own choices. Ask between 3 and 5 questions, no more. Favor questions like: why this word and not its neighbor; could this image belong to anyone; what actually happened in this scene; which line contains information we already have; would removing a line make its neighbor stronger; is this beautiful, or merely poetic. Ground every question in the actual text — quote the specific word or line you're interrogating. Do not praise. Do not summarize. Output only the questions, numbered.

The work answers a specific exercise — a discipline trained through an operation, producing an output (a lyric, a thesis, a character, a song concept, and so on). Hold it to what the exercise asked for, not to what a finished song would need.

Aim each question at one of five criteria, choosing the ones where the work is weakest; you do not need to cover all five:
- Originality: an observation worth making, or something familiar expressed differently?
- Precision: does the language capture exactly what is intended?
- Emotional truth: does it feel psychologically authentic?
- Conceptual depth: does it reveal something beyond the surface? Complexity is not depth — press hard where ornate language or difficult words are standing in for a simple or shallow idea.
- Musicality: could this become compelling when sung, rather than merely read?

Prefix each question with its criterion in brackets, like: 1. [Precision] ...`;

const CRITERIA = ['Originality', 'Precision', 'Emotional truth', 'Conceptual depth', 'Musicality'];

export async function POST(req: Request) {
  try {
    const { assignment, text, context } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text received.' }, { status: 400 });
    }
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            `Exercise: ${assignment}`,
            context ? `Dimensions: ${context}` : '',
            `Work in progress:\n${text}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    });
    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const questions: string[] = [];
    const criteria: string[] = [];
    for (const line of raw.split('\n').map((l) => l.trim())) {
      const m = line.match(/^\d+[.)]\s*(?:\[([^\]]+)\]\s*)?(.+)$/);
      if (!m) continue;
      const tag = CRITERIA.find((c) => c.toLowerCase() === (m[1] ?? '').trim().toLowerCase());
      questions.push(m[2].trim());
      criteria.push(tag ?? '');
    }
    if (questions.length === 0 && raw.trim()) {
      questions.push(raw.trim());
      criteria.push('');
    }
    return NextResponse.json({ questions, criteria });
  } catch {
    return NextResponse.json(
      { error: 'Pressure test failed — check your connection and try again.' },
      { status: 500 }
    );
  }
}
