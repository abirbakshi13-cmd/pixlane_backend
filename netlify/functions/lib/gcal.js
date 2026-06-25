'use strict';

// Google Calendar service-account helper.
// Uses only Node built-ins (crypto + fetch) — no googleapis package needed.
// Swap or extend this module when moving to a richer GCal integration.

const crypto = require('crypto');

async function createCalendarEvent(date, time, name, phone, biz, desc) {
  const serviceEmail = process.env.GOOGLE_SA_EMAIL;
  const rawKey       = process.env.GOOGLE_SA_PRIVATE_KEY;
  const calendarId   = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceEmail || !rawKey || !calendarId) {
    throw new Error('Missing env vars: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_CALENDAR_ID');
  }

  // Env vars often store the PEM with literal \n — expand them
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const accessToken = await fetchAccessToken(serviceEmail, privateKey);

  const [h, m] = time.split(':').map(Number);
  const endHour = String(h + 1).padStart(2, '0');
  const endMin  = String(m).padStart(2, '0');

  const event = {
    summary: `Strategy Call — ${name}`,
    description: [
      `Name: ${name}`,
      `Phone: ${phone}`,
      biz  && `Business: ${biz}`,
      desc && `About: ${desc}`,
    ].filter(Boolean).join('\n'),
    start: { dateTime: `${date}T${time}:00+05:30`,              timeZone: 'Asia/Kolkata' },
    end:   { dateTime: `${date}T${endHour}:${endMin}:00+05:30`, timeZone: 'Asia/Kolkata' },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(event),
    }
  );

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GCal API error: ${json.error?.message || JSON.stringify(json.error)}`);
  }
  return json.id;
}

async function fetchAccessToken(serviceEmail, privateKey) {
  const now     = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss:   serviceEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  const unsigned = `${header}.${payload}`;
  const signer   = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const sig = signer.sign(privateKey, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${unsigned}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${json.error_description || json.error}`);
  }
  return json.access_token;
}

function b64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

module.exports = { createCalendarEvent };
