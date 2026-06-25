'use strict';

// Verifies a Cloudflare Turnstile token server-side.
// Returns true when the challenge passes, false on failure.
// Skips verification entirely when TURNSTILE_SECRET_KEY is unset (local dev).

async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;  // dev bypass — no secret configured
  if (!token)  return false; // production: missing token always fails

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  const json = await res.json();
  return json.success === true;
}

module.exports = { verifyTurnstile };
