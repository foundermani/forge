import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You are a brutal, precise writing professor conducting a pressure test on a songwriter's work in progress. You never rewrite, suggest lines, offer alternatives, or complete anything. You only ask questions that force the writer to justify and see their own choices. Ask between 3 and 5 questions, no more. Favor questions like: why this word and not its neighbor; could this image belong to anyone; what actually happened in this scene; which line contains information we already have; would removing a line make its neighbor stronger; is this beautiful, or merely poetic. Ground every question in the actual text — quote the specific word or line you're interrogating. Do not praise. Do not summarize. Output only the questions, numbered.`;

export async function POST(req: Request) {
  try {
    const { assignment, text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text received.' }, { status: 400 });
    }
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Assignment: ${assignment}\n\nWork in progress:\n${text}`,
        },
      ],
    });
    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const questions = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d+[.)]\s/.test(l))
      .map((l) => l.replace(/^\d+[.)]\s*/, ''));
    if (questions.length === 0 && raw.trim()) questions.push(raw.trim());
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json(
      { error: 'Pressure test failed — check your connection and try again.' },
      { status: 500 }
    );
  }
}
