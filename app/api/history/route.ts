import { listAccountHistoryEntries } from '@/lib/history-server';
import { requireAuthenticatedUser } from '@/lib/settings-server';

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const entries = await listAccountHistoryEntries(auth.user.id);
    return Response.json({ entries });
  } catch (error) {
    console.error('[history] Failed to fetch account history:', error);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
