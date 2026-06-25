// SERVER-SIDE ONLY — never import this file from browser/client code.
// It uses the service role key which has full database access.
'use strict';

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL) throw new Error('Missing env var: SUPABASE_URL');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
