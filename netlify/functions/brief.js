'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, resolveOrigin, preflight } = require('./lib/cors');
const { createDepositStep } = require('./payment');
const { briefSchema } = require('./lib/validate');
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

  const result = briefSchema.safeParse(body);
  if (!result.success) {
    return r(400, result.error.errors[0]?.message || 'Invalid input', origin);
  }
  const { name, email, phone, project_type, industry, features, vision, timeline, budget, turnstileToken } = result.data;

  if (!await verifyTurnstile(turnstileToken)) {
    return r(400, 'Human verification failed — please try again', origin);
  }

  const descParts = [
    industry && ('Industry: ' + industry),
    features && ('Features: ' + features),
    vision   && ('Vision: '   + vision),
  ].filter(Boolean);

  const { data, error } = await supabase
    .from('briefs')
    .insert({
      name,
      email,
      phone:        phone        || null,
      project_type: project_type || null,
      description:  descParts.length ? descParts.join('\n') : null,
      budget:       budget       || null,
      timeline:     timeline     || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('brief insert error:', error);
    return r(500, 'Failed to save brief', origin);
  }

  let deposit;
  try {
    deposit = createDepositStep(data.id, 2000);
  } catch (err) {
    console.error('createDepositStep error:', err);
    return r(500, 'Payment setup failed', origin);
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, briefId: data.id, deposit }),
  };
};

function r(statusCode, error, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error }) };
}
