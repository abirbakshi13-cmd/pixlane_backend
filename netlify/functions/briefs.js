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

  const { name, email, project_type, description, budget, timeline } = body;

  if (!name || !email || !description) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'name, email, and description are required' }) };
  }

  const { error } = await supabase
    .from('briefs')
    .insert({ name, email, project_type: project_type ?? null, description, budget: budget ?? null, timeline: timeline ?? null });

  if (error) {
    console.error('briefs insert error:', error);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Failed to save brief' }) };
  }

  return { statusCode: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
