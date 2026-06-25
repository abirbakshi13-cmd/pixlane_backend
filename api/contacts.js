'use strict';

const supabase = require('../lib/supabase');
const setCors = require('./_cors');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, message } = req.body ?? {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }

  const { error } = await supabase
    .from('contacts')
    .insert({ name, email, phone: phone ?? null, message });

  if (error) {
    console.error('contacts insert error:', error);
    return res.status(500).json({ error: 'Failed to save contact' });
  }

  return res.status(201).json({ success: true });
};
