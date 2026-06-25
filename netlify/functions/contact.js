'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, resolveOrigin, preflight } = require('./lib/cors');
const { contactSchema } = require('./lib/validate');
const { isRateLimited, getClientIp } = require('./lib/ratelimit');
const { verifyTurnstile } = require('./lib/turnstile');

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

  const result = contactSchema.safeParse(body);
  if (!result.success) {
    return r(400, result.error.errors[0]?.message || 'Invalid input', origin);
  }
  const { name, message, turnstileToken } = result.data;

  if (!await verifyTurnstile(turnstileToken)) {
    return r(400, 'Human verification failed — please try again', origin);
  }

  const { error } = await supabase
    .from('contacts')
    .insert({ name, message });

  if (error) {
    console.error('contact insert error:', error);
    return r(500, 'Failed to save message', origin);
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
