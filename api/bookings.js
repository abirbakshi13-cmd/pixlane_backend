'use strict';

const supabase = require('../lib/supabase');
const setCors = require('./_cors');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, service, preferred_date, preferred_time, notes } = req.body ?? {};

  if (!name || !email || !service) {
    return res.status(400).json({ error: 'name, email, and service are required' });
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      name,
      email,
      phone: phone ?? null,
      service,
      preferred_date: preferred_date ?? null,
      preferred_time: preferred_time ?? null,
      notes: notes ?? null,
    });

  if (error) {
    console.error('bookings insert error:', error);
    return res.status(500).json({ error: 'Failed to save booking' });
  }

  return res.status(201).json({ success: true });
};
