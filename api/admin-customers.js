const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows, updateSupabaseRow } = require('../lib/supabase');

const DEFAULT_CUSTOMER_TABLE = 'eimza_kibris_applications_2026';

function getCustomerTableName() {
  return String(process.env.ADMIN_CUSTOMERS_TABLE || DEFAULT_CUSTOMER_TABLE).trim();
}

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

function normalizeCustomerRecord(row, tableName) {
  const payload = row && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {};
  const adminCodes = normalizeAdminCodes(payload);
  const isLegacy = tableName === 'applications';

  const fullName = isLegacy ? row.full_name : row.adi_soyadi;
  const email = isLegacy ? row.email : row.e_posta_adresi;
  const phone = isLegacy ? row.phone : (row.cep_telefon_numarasi || row.telefon_numarasi);
  const identityNumber = isLegacy ? row.identity_number : row.kimlik_pasaport_numarasi;
  const paymentMethod = isLegacy ? row.payment_method : row.odeme_sekli;
  const sourcePage = isLegacy ? row.source_page : 'eimza-kibris-import';
  const pinCode = isLegacy ? adminCodes.pin_code : (row.pin || adminCodes.pin_code || '');
  const pukCode = isLegacy ? adminCodes.puk_code : (row.puk || adminCodes.puk_code || '');

  return {
    id: row.id,
    full_name: String(fullName || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    identity_number: String(identityNumber || '').trim(),
    payment_method: String(paymentMethod || '').trim(),
    source_page: String(sourcePage || '').trim(),
    payload,
    admin_codes: adminCodes,
    pin_code: String(pinCode || ''),
    puk_code: String(pukCode || ''),
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

function buildSearchQuery(term, tableName) {
  const trimmed = String(term || '').trim();
  if (!trimmed) return null;

  const escaped = trimmed.replace(/\*/g, '');
  if (!escaped) return null;

  if (tableName === 'applications') {
    return [
      `full_name.ilike.*${escaped}*`,
      `email.ilike.*${escaped}*`,
      `phone.ilike.*${escaped}*`,
      `identity_number.ilike.*${escaped}*`
    ].join(',');
  }

  return [
    `adi_soyadi.ilike.*${escaped}*`,
    `e_posta_adresi.ilike.*${escaped}*`,
    `telefon_numarasi.ilike.*${escaped}*`,
    `cep_telefon_numarasi.ilike.*${escaped}*`,
    `kimlik_pasaport_numarasi.ilike.*${escaped}*`
  ].join(',');
}

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const tableName = getCustomerTableName();

    if (req.method === 'GET') {
      const query = String((req.query && req.query.q) || '').trim();
      const params = tableName === 'applications'
        ? {
          select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
          order: 'created_at.desc',
          limit: query ? '25' : '20'
        }
        : {
          select: 'id,adi_soyadi,e_posta_adresi,telefon_numarasi,cep_telefon_numarasi,kimlik_pasaport_numarasi,odeme_sekli,pin,puk,payload,created_at',
          order: 'created_at.desc',
          limit: query ? '25' : '20'
        };

      const searchQuery = buildSearchQuery(query, tableName);
      if (searchQuery) {
        params.or = `(${searchQuery})`;
      }

      const rows = await selectSupabaseRows(config, tableName, params);
      return sendJson(res, 200, {
        ok: true,
        items: rows.map((row) => normalizeCustomerRecord(row, tableName))
      });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const applicationId = String(body.application_id || body.id || '').trim();
      if (!applicationId) {
        return sendJson(res, 400, { ok: false, error: 'Missing application_id' });
      }

      const manualPin = typeof body.pin_code === 'string' ? body.pin_code.trim() : '';
      const manualPuk = typeof body.puk_code === 'string' ? body.puk_code.trim() : '';

      const rows = await selectSupabaseRows(config, tableName, tableName === 'applications'
        ? {
          select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
          id: `eq.${applicationId}`,
          limit: '1'
        }
        : {
          select: 'id,adi_soyadi,e_posta_adresi,telefon_numarasi,cep_telefon_numarasi,kimlik_pasaport_numarasi,odeme_sekli,pin,puk,payload,created_at',
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

      const regenerate = body.regenerate !== false && !manualPin && !manualPuk;
      const existingCodes = normalizeAdminCodes(payload);
      const pinCode = manualPin || (regenerate || !existingCodes.pin_code ? generateNumericCode(4) : existingCodes.pin_code);
      const pukCode = manualPuk || (regenerate || !existingCodes.puk_code ? generateNumericCode(4) : existingCodes.puk_code);

      payload.admin_codes = {
        pin_code: pinCode,
        puk_code: pukCode,
        generated_at: (regenerate || manualPin || manualPuk) ? new Date().toISOString() : existingCodes.generated_at
      };

      const updated = tableName === 'applications'
        ? await updateSupabaseRow(config, tableName, { id: applicationId }, { payload })
        : await updateSupabaseRow(config, tableName, { id: applicationId }, { payload, pin: pinCode, puk: pukCode });
      return sendJson(res, 200, {
        ok: true,
        record: normalizeCustomerRecord(updated || current, tableName)
      });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};