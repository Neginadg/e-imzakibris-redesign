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

function normalizeCustomerRecord(row) {
  const payload = row && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {};
  const adminCodes = normalizeAdminCodes(payload);

  return {
    id: row.id,
    full_name: String(row.adi_soyadi || '').trim(),
    email: String(row.e_posta_adresi || '').trim(),
    phone: String(row.cep_telefon_numarasi || row.telefon_numarasi || '').trim(),
    identity_number: String(row.kimlik_pasaport_numarasi || '').trim(),
    payment_method: String(row.odeme_sekli || '').trim(),
    source_page: String((payload && payload.source_page) || '').trim(),
    payload,
    admin_codes: adminCodes,
    pin_code: String(row.pin || adminCodes.pin_code || ''),
    puk_code: String(row.puk || adminCodes.puk_code || ''),
    generated_at: adminCodes.generated_at,
    created_at: String(row.kayit_tarihi || row.imported_at || '')
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
  const escaped = String(term || '').trim().replace(/\*/g, '');
  if (!escaped) return null;

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
      const dateFrom = String((req.query && req.query.dateFrom) || '').trim();
      const dateTo = String((req.query && req.query.dateTo) || '').trim();

      const dateCol = tableName === 'applications' ? 'created_at' : 'imported_at';
      const params = tableName === 'applications'
        ? {
          select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
          order: 'created_at.desc',
          limit: query || dateFrom || dateTo ? '100' : '20'
        }
        : {
          select: 'id,adi_soyadi,e_posta_adresi,telefon_numarasi,cep_telefon_numarasi,kimlik_pasaport_numarasi,odeme_sekli,pin,puk,payload,kayit_tarihi,imported_at',
          order: 'imported_at.desc',
          limit: query || dateFrom || dateTo ? '100' : '20'
        };

      // Date range filter — array values produce repeated keys for PostgREST
      const dateFilters = [];
      if (dateFrom) dateFilters.push('gte.' + dateFrom + 'T00:00:00.000Z');
      if (dateTo) dateFilters.push('lte.' + dateTo + 'T23:59:59.999Z');
      if (dateFilters.length === 1) params[dateCol] = dateFilters[0];
      else if (dateFilters.length === 2) params[dateCol] = dateFilters;

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
          select: 'id,adi_soyadi,e_posta_adresi,telefon_numarasi,cep_telefon_numarasi,kimlik_pasaport_numarasi,odeme_sekli,pin,puk,payload,kayit_tarihi,imported_at',
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