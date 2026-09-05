import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `Transcribe this handwritten page exactly as written. Preserve line breaks and stanza spacing. Preserve crossed-out words as ~~strikethrough~~ if legible. Do not correct spelling, grammar, or word choice. Do not improve, complete, or interpret anything. Mark words you cannot read as [?]. If the page contains marginal notes or arrows, transcribe them in [brackets] where they occur. Output only the transcription, nothing else.`;

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No image received.' }, { status: 400 });
    }
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
          ],
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: 'Transcription failed — check your connection and tap retry.' },
      { status: 500 }
    );
  }
}
