const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows } = require('../lib/supabase');

// Public, read-only, intentionally minimal: the payment result landing page
// polls this with the MerchantTrnId PayPoint appended to the redirect URL,
// to show whether the callback has already confirmed payment. No customer
// PII is returned — only a boolean and the raw PayPoint status code.

const TABLES = [
  'eimza_kibris_applications_2026',
  'renewal_requests',
  'molohiya_application',
  'timestamp_application'
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const merchantTrnId = Number((req.query && req.query.merchantTrnId) || '');

    if (!Number.isFinite(merchantTrnId)) {
      return sendJson(res, 400, { ok: false, error: 'Missing merchantTrnId' });
    }

    for (const tableName of TABLES) {
      const rows = await selectSupabaseRows(config, tableName, {
        merchant_trn_id: `eq.${merchantTrnId}`,
        select: 'payment_done,paypoint_response',
        limit: '1'
      });

      if (rows.length) {
        const row = rows[0];
        const response = row.paypoint_response && typeof row.paypoint_response === 'object' ? row.paypoint_response : null;
        return sendJson(res, 200, {
          ok: true,
          found: true,
          paymentDone: !!row.payment_done,
          status: response ? response.Status : null
        });
      }
    }

    return sendJson(res, 200, { ok: true, found: false });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
