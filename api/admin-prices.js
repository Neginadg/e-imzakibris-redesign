const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows, upsertSupabaseRows } = require('../lib/supabase');
const { requireAdmin } = require('../lib/auth');

const TABLE = 'pricing';

const PRICE_LABELS = {
  '1y': '1 Yıllık Paket',
  '2y': '2 Yıllık Paket',
  '3y': '3 Yıllık Paket',
  stick: 'Akıllı Çubuk (Token)',
  install: 'Uzak Bağlantılı Kurulum',
  renewal: 'Yenileme Başvuru Ücreti',
  ts_1000: 'Zaman Damgası - 1.000 Adet',
  ts_5000: 'Zaman Damgası - 5.000 Adet',
  ts_10000: 'Zaman Damgası - 10.000 Adet',
  molohiya_1y: 'MOlOhiya - 1 Yıllık Lisans',
  molohiya_2y: 'MOlOhiya - 2 Yıllık Lisans',
  molohiya_3y: 'MOlOhiya - 3 Yıllık Lisans',
  renewal_1y: '1 Yıllık Yenileme',
  renewal_2y: '2 Yıllık Yenileme',
  renewal_3y: '3 Yıllık Yenileme'
};

const PRICE_KEYS = Object.keys(PRICE_LABELS);

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });
    await requireAdmin(config, req);

    if (req.method === 'GET') {
      const rows = await selectSupabaseRows(config, TABLE, { select: 'price_key,value' });
      const prices = {};
      rows.forEach((row) => {
        const value = Number(row.value);
        if (row.price_key && Number.isFinite(value)) prices[row.price_key] = value;
      });
      return sendJson(res, 200, { ok: true, prices });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const prices = body && typeof body.prices === 'object' && !Array.isArray(body.prices) ? body.prices : null;
      if (!prices) {
        return sendJson(res, 400, { ok: false, error: 'Missing prices object' });
      }

      const rows = [];
      for (const key of PRICE_KEYS) {
        if (!(key in prices)) continue;
        const value = Number(prices[key]);
        if (!Number.isFinite(value) || value < 0) {
          return sendJson(res, 400, { ok: false, error: `Invalid value for price key "${key}"` });
        }
        rows.push({ price_key: key, value, label: PRICE_LABELS[key] });
      }

      if (!rows.length) {
        return sendJson(res, 400, { ok: false, error: 'No valid price keys provided' });
      }

      await upsertSupabaseRows(config, TABLE, rows, 'price_key');
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};
