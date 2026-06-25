'use strict';

// POST /api/book
// Body: { date, time, name, phone, biz, desc }
// Inserts into `bookings`, creates a Google Calendar event, returns { success, bookingId }.
// Returns 409 on unique-constraint violation (slot already taken).

const supabase = require('../../lib/supabase');
const { corsHeaders, preflight } = require('./lib/cors');
const { createCalendarEvent }    = require('./lib/gcal');

const VALID_TIMES        = new Set(['10:00', '11:00', '14:00', '15:00', '16:00']);
const PG_UNIQUE_VIOLATION = '23505';

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const date  = (body.date  || '').trim();
  const time  = (body.time  || '').trim();
  const name  = (body.name  || '').trim();
  const phone = (body.phone || '').trim();
  const biz   = (body.biz   || '').trim();
  const desc  = (body.desc  || '').trim();

  if (!name)                                   return r(400, 'name is required');
  if (!phone)                                  return r(400, 'phone is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))      return r(400, 'invalid date format (expected YYYY-MM-DD)');
  if (!VALID_TIMES.has(time))                  return r(400, 'invalid time slot');

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
      return r(409, 'That slot was just taken — please pick another time.');
    }
    console.error('book insert error:', error);
    return r(500, 'Failed to save booking');
  }

  // Google Calendar — non-fatal: log the error but still return success
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
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, bookingId: data.id }),
  };
};

function r(statusCode, error) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify({ error }) };
}
