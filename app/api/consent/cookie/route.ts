import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { consent_choice, analytics_storage, consent_source } = await req.json();

    if (consent_choice !== 'acknowledged') {
      return NextResponse.json({ error: 'consent_choice must be acknowledged' }, { status: 400 });
    }

    if (typeof analytics_storage !== 'boolean') {
      return NextResponse.json({ error: 'analytics_storage must be a boolean' }, { status: 400 });
    }

    if (!consent_source || typeof consent_source !== 'string') {
      return NextResponse.json({ error: 'consent_source is required' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const { error } = await supabaseServer.from('rmt_cookie_consent_events').insert({
      consent_choice,
      analytics_storage,
      consent_source,
      consent_ip: ip,
      user_agent: req.headers.get('user-agent'),
    });

    if (error) {
      console.error('[rmt cookie consent] insert error:', error);
      return NextResponse.json({ error: 'Failed to log consent' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
