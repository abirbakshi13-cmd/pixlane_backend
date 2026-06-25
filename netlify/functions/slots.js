'use strict';

// GET /api/slots?week=N
// Returns { taken: { 'YYYY-MM-DD': ['HH:MM', ...] } }
// week=0 → current Mon–Fri, week=1 → next week, etc.

const supabase = require('../../lib/supabase');
const { corsHeaders, preflight } = require('./lib/cors');

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const week = parseInt((event.queryStringParameters || {}).week ?? '0', 10);
  if (isNaN(week) || week < 0 || week > 52) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid week parameter' }) };
  }

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
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Failed to fetch slots' }) };
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
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ taken }),
  };
};

function getWeekMonday(weeksOffset) {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weeksOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
