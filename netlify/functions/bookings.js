'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, preflight } = require('./lib/cors');

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

  const { name, email, phone, service, preferred_date, preferred_time, notes } = body;

  if (!name || !email || !service) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'name, email, and service are required' }) };
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      name,
      email,
      phone: phone ?? null,
      service,
      preferred_date: preferred_date ?? null,
      preferred_time: preferred_time ?? null,
      notes: notes ?? null,
    });

  if (error) {
    console.error('bookings insert error:', error);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Failed to save booking' }) };
  }

  return { statusCode: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
