import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const INITIAL_SLOTS = parseInt(process.env.NEXT_PUBLIC_SLOTS_REMAINING || '47', 10);

export async function POST(req: NextRequest) {
  try {
    const { email, marketing_consent = false } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (typeof marketing_consent !== 'boolean') {
      return NextResponse.json({ error: 'marketing_consent must be a boolean' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

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
    const { data, error } = await supabaseServer
      .from('rmt_waitlist')
      .insert({
        email: normalizedEmail,
        marketing_consent,
        consent_source: 'waitlist_form',
        consent_timestamp: new Date().toISOString(),
        consent_ip: ip,
      })
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

    if (marketing_consent) {
      const { error: consentError } = await supabaseServer.from('rmt_email_consent_log').insert({
        email: normalizedEmail,
        event: 'grant',
        marketing_consent: true,
        consent_source: 'waitlist_form',
        consent_ip: ip,
      });

      if (consentError) {
        console.error('Waitlist consent log error:', consentError);
      }
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
