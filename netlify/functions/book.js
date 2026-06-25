'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, resolveOrigin, preflight } = require('./lib/cors');
const { createCalendarEvent } = require('./lib/gcal');
const { bookSchema } = require('./lib/validate');
const { isRateLimited, getClientIp } = require('./lib/ratelimit');

const PG_UNIQUE_VIOLATION = '23505';

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  const origin = resolveOrigin(event);

  if (event.httpMethod !== 'POST') {
    return r(405, 'Method not allowed', origin);
  }

  if (isRateLimited(getClientIp(event))) {
    return r(429, 'Too many requests — please wait a few minutes before trying again', origin);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return r(400, 'Invalid JSON', origin);
  }

  const result = bookSchema.safeParse(body);
  if (!result.success) {
    return r(400, result.error.errors[0]?.message || 'Invalid input', origin);
  }
  const { date, time, name, phone, biz, desc } = result.data;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      slot_date:   date,
      slot_time:   time,
      name,
      phone,
      business:    biz  || null,
      description: desc || null,
      status:      'confirmed',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return r(409, 'That slot was just taken — please pick another time.', origin);
    }
    console.error('book insert error:', error);
    return r(500, 'Failed to save booking', origin);
  }

  // Google Calendar — non-fatal: log but still return success
  try {
    const eventId = await createCalendarEvent(date, time, name, phone, biz, desc);
    await supabase
      .from('bookings')
      .update({ calendar_event_id: eventId })
      .eq('id', data.id);
  } catch (calErr) {
    console.error('Google Calendar event failed (non-fatal):', calErr.message);
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, bookingId: data.id }),
  };
};

function r(statusCode, error, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error }) };
}
