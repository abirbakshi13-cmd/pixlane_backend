'use strict';

const supabase = require('../../lib/supabase');
const { corsHeaders, preflight } = require('./lib/cors');
const { createDepositStep } = require('./payment');

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

  const { project_type, industry, features, timeline, vision, name, phone, email, budget } = body;

  if (!name || !email) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'name and email are required' }) };
  }

  // Compose description from all wizard detail fields so nothing is lost
  const descParts = [
    industry && ('Industry: '  + industry),
    features && ('Features: '  + features),
    vision   && ('Vision: '    + vision),
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
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Failed to save brief' }) };
  }

  let deposit;
  try {
    deposit = createDepositStep(data.id, 2000);
  } catch (err) {
    console.error('createDepositStep error:', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Payment setup failed' }) };
  }

  return {
    statusCode: 201,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, briefId: data.id, deposit }),
  };
};
