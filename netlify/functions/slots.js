'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, resolveOrigin, preflight } = require('./lib/cors');
const { slotsSchema } = require('./lib/validate');

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  const origin = resolveOrigin(event);

  if (event.httpMethod !== 'GET') {
    return r(405, 'Method not allowed', origin);
  }

  const result = slotsSchema.safeParse(event.queryStringParameters || {});
  if (!result.success) {
    return r(400, result.error.errors[0]?.message || 'Invalid week parameter', origin);
  }
  const { week } = result.data;

  const monday = getWeekMonday(week);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const { data, error } = await supabase
    .from('bookings')
    .select('slot_date, slot_time')
    .gte('slot_date', toDateStr(monday))
    .lte('slot_date', toDateStr(friday))
    .not('status', 'eq', 'cancelled');

  if (error) {
    console.error('slots query error:', error);
    return r(500, 'Failed to fetch slots', origin);
  }

  // Group by date; normalise HH:MM:SS → HH:MM if Postgres returns with seconds
  const taken = {};
  for (const row of data) {
    const d = row.slot_date;
    if (!taken[d]) taken[d] = [];
    taken[d].push((row.slot_time || '').slice(0, 5));
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ taken }),
  };
};

function r(statusCode, error, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error }) };
}

function getWeekMonday(weeksOffset) {
  const now    = new Date();
  const day    = now.getDay();
  const diff   = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weeksOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
