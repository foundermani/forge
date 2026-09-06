import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

// Safe diagnostics: reports presence/shape of the API key (never its value)
// and whether a minimal API call succeeds from this environment.
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const out: Record<string, unknown> = {
    ok: true,
    hasKey: !!key,
    keyLooksRight: !!key && key.startsWith('sk-ant-') && key.trim() === key,
    keyLength: key ? key.length : 0,
  };
  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 10,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: 'say ok' }],
    });
    out.apiCall = 'ok';
    out.model = res.model;
  } catch (e) {
    const err = e as { name?: string; status?: number; message?: string };
    out.apiCall = 'failed';
    out.errorName = err.name;
    out.errorStatus = err.status;
    out.errorMessage = err.message?.slice(0, 300);
  }
  return NextResponse.json(out);
}
