'use strict';

const supabase = require('../lib/supabase');
const setCors = require('./_cors');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, project_type, description, budget, timeline } = req.body ?? {};

  if (!name || !email || !description) {
    return res.status(400).json({ error: 'name, email, and description are required' });
  }

  const { error } = await supabase
    .from('briefs')
    .insert({ name, email, project_type: project_type ?? null, description, budget: budget ?? null, timeline: timeline ?? null });

  if (error) {
    console.error('briefs insert error:', error);
    return res.status(500).json({ error: 'Failed to save brief' });
  }

  return res.status(201).json({ success: true });
};
