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

  const { name, email, project_type, description, budget, timeline } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)           return r(400, 'name is required', origin);
  if (!email || typeof email !== 'string')                                     return r(400, 'email is required', origin);
  if (!description || typeof description !== 'string' || description.trim() === '') return r(400, 'description is required', origin);
  if (name.length > 120)        return r(400, 'name must be 120 characters or fewer', origin);
  if (description.length > 2000) return r(400, 'description must be 2000 characters or fewer', origin);

  const { error } = await supabase
    .from('briefs')
    .insert({
      name: name.trim(),
      email: email.trim(),
      project_type: project_type ?? null,
      description: description.trim(),
      budget: budget ?? null,
      timeline: timeline ?? null,
    });

  if (error) {
    console.error('briefs insert error:', error);
    return r(500, 'Failed to save brief', origin);
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
