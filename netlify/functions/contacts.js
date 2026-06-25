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

  const { name, email, phone, message } = body;

  if (!name || !email || !message) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'name, email, and message are required' }) };
  }

  const { error } = await supabase
    .from('contacts')
    .insert({ name, email, phone: phone ?? null, message });

  if (error) {
    console.error('contacts insert error:', error);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Failed to save contact' }) };
  }

  return { statusCode: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
