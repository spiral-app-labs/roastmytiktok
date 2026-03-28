import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('rmt_viral_patterns')
    .select('*')
    .order('avg_view_multiplier', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Group by hook_type
  const grouped: Record<string, typeof data> = {};
  for (const pattern of data) {
    const key = pattern.hook_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(pattern);
  }

  return Response.json({ patterns: grouped, total: data.length });
}
