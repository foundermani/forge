import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You tag short notebook entries for a songwriter's archive. Return 2-4 lowercase tags as strict JSON: {"tags": ["...", "..."]}. Tags cover themes and concrete objects in the entry, plus exactly one register tag from this set: overheard, image, idea, phrase, scene. Output only the JSON object — no code fences, no commentary.`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text received.' }, { status: 400 });
    }
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 100,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [{ role: 'user', content: text }],
    });
    let raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    // Strip code fences before parsing.
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 4)
      : [];
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: 'Tagging failed.' }, { status: 500 });
  }
}
