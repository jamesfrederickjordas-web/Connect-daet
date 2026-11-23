import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_SUBSYSTEMS = [
  'subsystem_5',
  'subsystem_6',
  'subsystem_7',
  'subsystem_8',
  'subsystem_9',
  'subsystem_11',
] as const;

export async function GET() {
  return NextResponse.json({
    service: 'TIA-DAS Ingest API (CONNECT-DAET.ph Subsystem 10)',
    endpoint: '/api/analytics/ingest',
    method: 'POST',
    supported_subsystems: VALID_SUBSYSTEMS,
    supported_event_types: ['satisfaction_rating', 'arrival_count', 'economic_activity'],
    headers: {
      'x-ingest-key': 'Subsystem secret key (e.g. daet-sub9-key-2026)',
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subsystemId = String(body.subsystem_id || '').trim();
    const eventType = String(body.event_type || '').trim();
    const payload =
      body.payload && typeof body.payload === 'object' ? body.payload : {};
    const apiKey =
      request.headers.get('x-ingest-key') ||
      String(body.api_key || '').trim();

    if (!subsystemId || !eventType) {
      return NextResponse.json(
        {
          accepted: false,
          message: 'subsystem_id and event_type are required',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.rpc('ingest_subsystem_event', {
      p_subsystem_id: subsystemId,
      p_api_key: apiKey,
      p_event_type: eventType,
      p_payload: payload,
    });

    if (error) {
      return NextResponse.json(
        { accepted: false, message: error.message },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.accepted) {
      return NextResponse.json(
        {
          accepted: false,
          log_id: result?.log_id ?? null,
          message: result?.message ?? 'Ingestion rejected',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      accepted: true,
      log_id: result.log_id,
      message: result.message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        accepted: false,
        message: err instanceof Error ? err.message : 'Invalid JSON payload',
      },
      { status: 400 }
    );
  }
}
