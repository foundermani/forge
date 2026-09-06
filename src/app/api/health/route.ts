import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Safe diagnostics: reports presence/shape of the API key, never its value.
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    ok: true,
    hasKey: !!key,
    keyLooksRight: !!key && key.startsWith('sk-ant-') && key.trim() === key,
    keyLength: key ? key.length : 0,
  });
}
