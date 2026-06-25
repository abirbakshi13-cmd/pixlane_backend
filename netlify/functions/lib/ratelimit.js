'use strict';

// Sliding-window in-memory rate limiter.
// Each Netlify Function is a separate Lambda process, so this Map is naturally
// scoped per endpoint. Effective against spam/bots on low-traffic sites.
// For multi-instance production hardening, replace with Upstash Redis.

const windows = new Map(); // ip -> [timestamp, ...]
const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_HITS   = 5;

function isRateLimited(ip) {
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;

  let hits = (windows.get(ip) || []).filter(t => t > cutoff);

  if (hits.length >= MAX_HITS) {
    windows.set(ip, hits);
    return true;
  }

  hits.push(now);
  windows.set(ip, hits);

  // Evict stale entries to prevent unbounded growth in long-lived instances
  if (windows.size > 5000) {
    for (const [key, ts] of windows) {
      if (ts.every(t => t <= cutoff)) windows.delete(key);
    }
  }

  return false;
}

function getClientIp(event) {
  const fwd = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-For'] || '';
  return fwd.split(',')[0].trim() || event.headers?.['client-ip'] || 'unknown';
}

module.exports = { isRateLimited, getClientIp };
