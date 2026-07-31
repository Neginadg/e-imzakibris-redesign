const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verifies a Cloudflare Turnstile token server-side. Client-side widget
// checks are UX only — this is the actual security boundary that stops bots
// from ever reaching the database insert.
//
// If TURNSTILE_SECRET_KEY isn't configured yet, verification is skipped
// (with a warning) so existing forms don't break before the site is set up
// in the Cloudflare dashboard. Once the secret key is set, this becomes a
// hard requirement — a missing/invalid token is rejected.
async function verifyTurnstileToken(config, token, remoteIp) {
  if (!config.turnstileSecretKey) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping bot-verification for this submission.');
    return true;
  }

  if (!token) return false;

  const params = new URLSearchParams();
  params.append('secret', config.turnstileSecretKey);
  params.append('response', token);
  if (remoteIp) params.append('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return !!(data && data.success);
  } catch (error) {
    console.error('Turnstile verification request failed:', error.message || error);
    return false;
  }
}

// Vercel exposes the caller's IP via the x-forwarded-for header (may be a
// comma-separated list if there are multiple proxies — the first entry is
// the original client).
function getClientIp(req) {
  const header = (req.headers && req.headers['x-forwarded-for']) || '';
  return String(header).split(',')[0].trim();
}

module.exports = { verifyTurnstileToken, getClientIp };
