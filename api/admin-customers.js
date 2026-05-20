const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows, updateSupabaseRow } = require('../lib/supabase');

function normalizeAdminCodes(payload) {
  const adminCodes = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload.admin_codes && typeof payload.admin_codes === 'object' && !Array.isArray(payload.admin_codes)
      ? payload.admin_codes
      : {}
    : {};

  return {
    pin_code: String(adminCodes.pin_code || ''),
    puk_code: String(adminCodes.puk_code || ''),
    generated_at: String(adminCodes.generated_at || '')
  };
}

function normalizeCustomerRecord(row) {
  const payload = row && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {};
  const adminCodes = normalizeAdminCodes(payload);

  return {
    id: row.id,
    full_name: String(row.full_name || '').trim(),
    email: String(row.email || '').trim(),
    phone: String(row.phone || '').trim(),
    identity_number: String(row.identity_number || '').trim(),
    payment_method: String(row.payment_method || '').trim(),
    source_page: String(row.source_page || '').trim(),
    payload,
    admin_codes: adminCodes,
    pin_code: adminCodes.pin_code,
    puk_code: adminCodes.puk_code,
    generated_at: adminCodes.generated_at,
    created_at: row.created_at
  };
}

function generateNumericCode(length) {
  const crypto = require('crypto');
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += crypto.randomInt(0, 10).toString();
  }
  return value;
}

function buildSearchQuery(term) {
  const trimmed = String(term || '').trim();
  if (!trimmed) return null;

  const escaped = trimmed.replace(/\*/g, '');
  if (!escaped) return null;

  return [
    `full_name.ilike.*${escaped}*`,
    `email.ilike.*${escaped}*`,
    `phone.ilike.*${escaped}*`,
    `identity_number.ilike.*${escaped}*`
  ].join(',');
}

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });

    if (req.method === 'GET') {
      const query = String((req.query && req.query.q) || '').trim();
      const params = {
        select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
        order: 'created_at.desc',
        limit: query ? '25' : '20'
      };

      const searchQuery = buildSearchQuery(query);
      if (searchQuery) {
        params.or = `(${searchQuery})`;
      }

      const rows = await selectSupabaseRows(config, 'applications', params);
      return sendJson(res, 200, {
        ok: true,
        items: rows.map(normalizeCustomerRecord)
      });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const applicationId = String(body.application_id || body.id || '').trim();
      if (!applicationId) {
        return sendJson(res, 400, { ok: false, error: 'Missing application_id' });
      }

      const rows = await selectSupabaseRows(config, 'applications', {
        select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
        id: `eq.${applicationId}`,
        limit: '1'
      });

      const current = rows[0];
      if (!current) {
        return sendJson(res, 404, { ok: false, error: 'Customer record not found' });
      }

      const payload = current.payload && typeof current.payload === 'object' && !Array.isArray(current.payload)
        ? Object.assign({}, current.payload)
        : {};

      const regenerate = body.regenerate !== false;
      const existingCodes = normalizeAdminCodes(payload);
      const pinCode = regenerate || !existingCodes.pin_code ? generateNumericCode(4) : existingCodes.pin_code;
      const pukCode = regenerate || !existingCodes.puk_code ? generateNumericCode(4) : existingCodes.puk_code;

      payload.admin_codes = {
        pin_code: pinCode,
        puk_code: pukCode,
        generated_at: new Date().toISOString()
      };

      const updated = await updateSupabaseRow(config, 'applications', { id: applicationId }, { payload });
      return sendJson(res, 200, {
        ok: true,
        record: normalizeCustomerRecord(updated || current)
      });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};