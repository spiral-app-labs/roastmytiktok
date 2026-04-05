import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const INITIAL_SLOTS = parseInt(process.env.NEXT_PUBLIC_SLOTS_REMAINING || '47', 10);

export async function POST(req: NextRequest) {
  try {
    const { email, intent, plan } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const { data: existing } = await supabaseServer
      .from('rmt_waitlist')
      .select('position')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({
        position: existing.position,
        message: `You're already on the list! You're #${existing.position}.`,
        alreadyJoined: true,
      });
    }

    // Insert new entry
    const insertData: Record<string, unknown> = { email: normalizedEmail };
    if (intent) insertData.intent = intent;
    if (plan) insertData.plan = plan;

    const { data, error } = await supabaseServer
      .from('rmt_waitlist')
      .insert(insertData)
      .select('position')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Race condition: unique violation
        const { data: found } = await supabaseServer
          .from('rmt_waitlist')
          .select('position')
          .eq('email', normalizedEmail)
          .single();
        return NextResponse.json({
          position: found?.position,
          message: `You're already on the list! You're #${found?.position}.`,
          alreadyJoined: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      position: data.position,
      message: `You're in! You're #${data.position} on the waitlist.`,
      alreadyJoined: false,
    });
  } catch (err) {
    console.error('Waitlist POST error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { count, error } = await supabaseServer
      .from('rmt_waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const totalSignups = count || 0;
    const slotsRemaining = Math.max(0, INITIAL_SLOTS - totalSignups);

    return NextResponse.json({ count: totalSignups, slotsRemaining });
  } catch (err) {
    console.error('Waitlist GET error:', err);
    return NextResponse.json({ count: 0, slotsRemaining: INITIAL_SLOTS });
  }
}
