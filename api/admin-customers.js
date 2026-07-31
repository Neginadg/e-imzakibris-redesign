const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows, updateSupabaseRow, insertSupabaseRow } = require('../lib/supabase');
const { requireAdmin, requireFullAdmin } = require('../lib/auth');

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

// Some older records were submitted before the identity number was captured
// as a top-level column — it still exists nested in the raw form payload.
// Falls back to that so those records aren't shown as missing an ID number.
function extractPayloadIdentityNumber(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (payload.application && typeof payload.application === 'object' && payload.application.identityNumber) {
    return String(payload.application.identityNumber).trim();
  }
  if (payload.identityNumber) return String(payload.identityNumber).trim();
  return '';
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
    identity_number: String(row.kimlik_pasaport_numarasi || '').trim() || extractPayloadIdentityNumber(payload),
    payment_method: String(row.odeme_sekli || '').trim(),
    source_page: String((payload && payload.source_page) || '').trim(),
    payload,
    admin_codes: adminCodes,
    pin_code: String(row.pin || adminCodes.pin_code || ''),
    puk_code: String(row.puk || adminCodes.puk_code || ''),
    generated_at: adminCodes.generated_at,
    created_at: String(row.kayit_tarihi || row.imported_at || ''),
    payment_done: !!row.payment_done,
    payment_done_changed_by: row.payment_done_changed_by || null,
    payment_done_changed_at: row.payment_done_changed_at || null,
    receipt_written: !!row.receipt_written,
    receipt_written_changed_by: row.receipt_written_changed_by || null,
    receipt_written_changed_at: row.receipt_written_changed_at || null,
    signature_ready: !!row.signature_ready,
    signature_ready_changed_by: row.signature_ready_changed_by || null,
    signature_ready_changed_at: row.signature_ready_changed_at || null,
    delivered: !!row.delivered,
    delivered_changed_by: row.delivered_changed_by || null,
    delivered_changed_at: row.delivered_changed_at || null
  };
}

// Any admin (Viewer or Full) may confirm a status (tick: pending → done).
// Only a Full Admin may remove a confirmed status (untick: done → pending) —
// enforced below via the requested value, and again via Supabase RLS as a
// backstop against direct-to-Supabase writes that bypass this API
// (see supabase/08_customer_status_security.sql).
const STATUS_FIELDS = ['payment_done', 'receipt_written', 'signature_ready', 'delivered'];
const STATUS_META_COLUMNS = STATUS_FIELDS.reduce(function (acc, field) {
  acc[field] = { by: field + '_changed_by', at: field + '_changed_at' };
  return acc;
}, {});

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
    const admin = await requireAdmin(config, req);
    const tableName = getCustomerTableName();

    if (req.method === 'GET') {
      const query = String((req.query && req.query.q) || '').trim();
      const dateFrom = String((req.query && req.query.dateFrom) || '').trim();
      const dateTo = String((req.query && req.query.dateTo) || '').trim();
      const offset = Math.max(0, parseInt(String((req.query && req.query.offset) || '0'), 10) || 0);
      const limit = Math.min(Math.max(1, parseInt(String((req.query && req.query.limit) || '20'), 10) || 20), 200);

      const dateCol = tableName === 'applications' ? 'created_at' : 'imported_at';
      const statusMetaSelect = STATUS_FIELDS.map(function (field) {
        var cols = STATUS_META_COLUMNS[field];
        return cols.by + ',' + cols.at;
      }).join(',');

      const params = tableName === 'applications'
        ? {
          select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at,payment_done,receipt_written,signature_ready,delivered,' + statusMetaSelect,
          order: 'created_at.desc',
          limit: String(limit),
          offset: String(offset)
        }
        : {
          select: 'id,adi_soyadi,e_posta_adresi,telefon_numarasi,cep_telefon_numarasi,kimlik_pasaport_numarasi,odeme_sekli,pin,puk,payload,kayit_tarihi,imported_at,payment_done,receipt_written,signature_ready,delivered,' + statusMetaSelect,
          order: 'imported_at.desc',
          limit: String(limit),
          offset: String(offset)
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
      requireFullAdmin(admin);
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
        ? await updateSupabaseRow(config, tableName, { id: `eq.${applicationId}` }, { payload })
        : await updateSupabaseRow(config, tableName, { id: `eq.${applicationId}` }, { payload, pin: pinCode, puk: pukCode });
      return sendJson(res, 200, {
        ok: true,
        record: normalizeCustomerRecord(updated || current, tableName)
      });
    }

    // ── PATCH: confirm/change a status flag (payment_done / receipt_written / signature_ready / delivered) ──
    if (req.method === 'PATCH') {
      const body = readJsonBody(req);
      const applicationId = String(body.id || '').trim();
      const field = String(body.field || '').trim();

      if (!applicationId || !STATUS_FIELDS.includes(field)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid id or field' });
      }

      const newValue = !!body.value;

      // Ticking (confirming) is open to any admin. Unticking (removing an
      // already-confirmed status) is Full Admin only.
      if (!newValue) {
        requireFullAdmin(admin);
      }

      const metaCols = STATUS_META_COLUMNS[field];
      const nowIso = new Date().toISOString();

      const currentRows = await selectSupabaseRows(config, tableName, {
        id: `eq.${applicationId}`,
        select: `id,${field}`,
        limit: '1'
      });
      if (!currentRows.length) {
        return sendJson(res, 404, { ok: false, error: 'Kayıt bulunamadı' });
      }
      const oldValue = !!currentRows[0][field];

      const updated = await updateSupabaseRow(
        config,
        tableName,
        { id: `eq.${applicationId}` },
        {
          [field]: newValue,
          [metaCols.by]: admin.email || admin.id,
          [metaCols.at]: nowIso
        }
      );

      // Audit trail is best-effort — a logging failure must not undo (or
      // appear to undo) a status change that already succeeded.
      try {
        await insertSupabaseRow(config, 'customer_status_audit_log', {
          table_name: tableName,
          application_id: applicationId,
          field,
          old_value: oldValue,
          new_value: newValue,
          changed_by_user_id: admin.id,
          changed_by_email: admin.email || null,
          changed_by_role: admin.role
        });
      } catch (auditError) {
        console.error('customer_status_audit_log insert failed:', auditError.message || auditError);
      }

      return sendJson(res, 200, { ok: true, record: normalizeCustomerRecord(updated, tableName) });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};