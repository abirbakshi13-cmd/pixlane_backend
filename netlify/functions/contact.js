'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, preflight } = require('./lib/cors');

const MAX_NAME = 120;
const MAX_MSG  = 2000;

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

  const name    = (body.name    || '').trim();
  const message = (body.message || '').trim();

  if (!name)                      return respond(400, 'name is required');
  if (name.length > MAX_NAME)     return respond(400, `name must be ${MAX_NAME} characters or fewer`);
  if (!message)                   return respond(400, 'message is required');
  if (message.length > MAX_MSG)   return respond(400, `message must be ${MAX_MSG} characters or fewer`);

  const { error } = await supabase
    .from('contacts')
    .insert({ name, message });

  if (error) {
    console.error('contact insert error:', error);
    return respond(500, 'Failed to save message');
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};

function respond(statusCode, error) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify({ error }) };
}
