'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, resolveOrigin, preflight } = require('./lib/cors');
const { isRateLimited, getClientIp } = require('./lib/ratelimit');

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  const origin = resolveOrigin(event);

  if (event.httpMethod !== 'POST') {
    return r(405, 'Method not allowed', origin);
  }

  if (isRateLimited(getClientIp(event))) {
    return r(429, 'Too many requests', origin);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return r(400, 'Invalid JSON', origin);
  }

  const { name, email, phone, service, preferred_date, preferred_time, notes } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)    return r(400, 'name is required', origin);
  if (!email || typeof email !== 'string')                              return r(400, 'email is required', origin);
  if (!service || typeof service !== 'string' || service.trim() === '') return r(400, 'service is required', origin);
  if (name.length > 120)   return r(400, 'name must be 120 characters or fewer', origin);
  if (service.length > 50) return r(400, 'service must be 50 characters or fewer', origin);

  const { error } = await supabase
    .from('bookings')
    .insert({
      name: name.trim(),
      email: email.trim(),
      phone: phone ?? null,
      service: service.trim(),
      preferred_date: preferred_date ?? null,
      preferred_time: preferred_time ?? null,
      notes: notes ?? null,
    });

  if (error) {
    console.error('bookings insert error:', error);
    return r(500, 'Failed to save booking', origin);
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};

function r(statusCode, error, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error }) };
}
