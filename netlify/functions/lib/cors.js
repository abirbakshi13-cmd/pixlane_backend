'use strict';

// Origin allowlist: always include local dev; add production domain via env var.
const ALLOWED = new Set([
  'http://localhost:8888',   // netlify dev default port
  'http://localhost:3000',   // fallback local dev
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN.trim()] : []),
]);

function resolveOrigin(event) {
  const requested = (event.headers?.origin || event.headers?.Origin || '').trim();
  return ALLOWED.has(requested) ? requested : null;
}

// Pass the resolved origin (from resolveOrigin) so every response reflects
// exactly the caller's origin rather than a static wildcard.
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary':                         'Origin',
    // Security headers on every API response
    'X-Content-Type-Options':  'nosniff',
    'X-Frame-Options':         'DENY',
    'Referrer-Policy':         'strict-origin-when-cross-origin',
  };
}

function preflight(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(resolveOrigin(event)), body: '' };
  }
  return null;
}

module.exports = { corsHeaders, resolveOrigin, preflight };
