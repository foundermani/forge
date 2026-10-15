import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You are analyzing a songwriter's practice archive to maintain a profile of his emerging voice. You are a pattern-noticer, not a critic and not a coach. From the sessions provided, update the profile. Only claim patterns with at least three clear instances; cite the evidence count for each claim (e.g. "second-person narration — 7 of last 14 pieces"). Cover: recurring images and objects; narrative perspective tendencies; themes he returns to; structural habits; moves he may be overusing; techniques and pillars he avoids or rerolls away from; which exercise types produced his strongest work (judge by his own autopsy answers, not your taste). Then output a "deck adjustments" JSON block: up to 5 assignment weight changes (assignmentId, newWeight, one-line reason), biased toward attacking his comfortable patterns. Format: the profile as markdown, then the JSON block fenced and labeled.

Context on the archive: the practice's mission is "Push human expression forward"; language comes first and songwriting is the destination. Older sessions are tagged with five pillars. Newer sessions carry three dimensions — disciplines (twelve, e.g. wordcraft, philosophical inquiry, emotional granularity; two or three together means a cross-disciplinary session), an operation (analyze, compare, defend, compress…), and an output (lyric, thesis, character, song concept…) — plus an intensity from 1 to 5 and his own 1–5 ratings on originality, precision, emotional truth, conceptual depth and musicality. Use these when judging which exercise types produced his strongest work, note disciplines, operations and outputs he avoids or rerolls away from, and note where his ratings look out of step with what the pieces show — including complexity standing in for depth. Each session lists the deck items it drew under itemIds; any of those ids, and any id in the reroll log, is a valid assignmentId for an adjustment.`;

export async function POST(req: Request) {
  try {
    const { days, rerollLog, currentProfile } = await req.json();
    if (!Array.isArray(days) || days.length === 0) {
      return NextResponse.json({ error: 'No sessions provided.' }, { status: 400 });
    }
    const client = new Anthropic();

    const userContent = [
      currentProfile ? `Current profile:\n${currentProfile}` : 'No profile yet — this is the first pass.',
      `Reroll log (assignments he has dodged):\n${JSON.stringify(rerollLog ?? [], null, 2)}`,
      `Last ${days.length} completed sessions (newest first):\n${JSON.stringify(days, null, 2)}`,
    ].join('\n\n---\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    // Split the markdown profile from the fenced deck-adjustments JSON block.
    let markdown = raw;
    let adjustments: Array<{ assignmentId: string; newWeight: number; reason: string }> = [];
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      markdown = raw.slice(0, fence.index).trim();
      try {
        const parsed = JSON.parse(fence[1]);
        const list = Array.isArray(parsed) ? parsed : parsed.adjustments ?? parsed.deck_adjustments ?? [];
        if (Array.isArray(list)) {
          adjustments = list
            .filter(
              (a: Record<string, unknown>) =>
                typeof a.assignmentId === 'string' && typeof a.newWeight === 'number'
            )
            .slice(0, 5);
        }
      } catch {
        // Profile still useful without adjustments.
      }
    }

    return NextResponse.json({ markdown, adjustments });
  } catch {
    return NextResponse.json({ error: 'Voice pass failed.' }, { status: 500 });
  }
}
