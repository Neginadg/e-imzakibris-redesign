const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows } = require('../lib/supabase');

const TABLE_CONFIGS = {
  timestamp: {
    tableName: 'timestamp_application',
    select: 'id,form_type,full_name,email,phone,application_type,plan_label,total_text,payment_method,source_page,payload,created_at',
    dateCol: 'created_at',
    searchCols: ['full_name', 'email', 'phone'],
    normalize: function (row) {
      return {
        id: row.id,
        form_type: row.form_type || 'Zaman Damgası',
        full_name: String(row.full_name || '').trim(),
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        identity_number: '',
        application_type: String(row.application_type || '').trim(),
        plan_label: String(row.plan_label || '').trim(),
        total_text: String(row.total_text || '').trim(),
        payment_method: String(row.payment_method || '').trim(),
        source_page: String(row.source_page || '').trim(),
        payload: row.payload || {},
        created_at: row.created_at || ''
      };
    }
  },
  molohiya: {
    tableName: 'molohiya_application',
    select: 'id,form_type,full_name,email,phone,identity_number,plan_label,total_text,payment_method,source_page,payload,created_at',
    dateCol: 'created_at',
    searchCols: ['full_name', 'email', 'phone', 'identity_number'],
    normalize: function (row) {
      return {
        id: row.id,
        form_type: row.form_type || 'Molohiya',
        full_name: String(row.full_name || '').trim(),
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        identity_number: String(row.identity_number || '').trim(),
        plan_label: String(row.plan_label || '').trim(),
        total_text: String(row.total_text || '').trim(),
        payment_method: String(row.payment_method || '').trim(),
        source_page: String(row.source_page || '').trim(),
        payload: row.payload || {},
        created_at: row.created_at || ''
      };
    }
  },
  renewal: {
    tableName: 'renewal_requests',
    select: 'id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at',
    dateCol: 'created_at',
    searchCols: ['full_name', 'email', 'phone', 'identity_number'],
    normalize: function (row) {
      return {
        id: row.id,
        form_type: 'Yenileme',
        full_name: String(row.full_name || '').trim(),
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        identity_number: String(row.identity_number || '').trim(),
        plan_label: '',
        total_text: '',
        payment_method: String(row.payment_method || '').trim(),
        source_page: String(row.source_page || '').trim(),
        payload: row.payload || {},
        created_at: row.created_at || ''
      };
    }
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });

    const tableKey = String((req.query && req.query.table) || '').trim();
    const cfg = TABLE_CONFIGS[tableKey];
    if (!cfg) {
      return sendJson(res, 400, {
        ok: false,
        error: 'Unknown table: ' + tableKey + '. Valid: ' + Object.keys(TABLE_CONFIGS).join(', ')
      });
    }

    const q = String((req.query && req.query.q) || '').trim();
    const dateFrom = String((req.query && req.query.dateFrom) || '').trim();
    const dateTo = String((req.query && req.query.dateTo) || '').trim();
    const sortDir = String((req.query && req.query.sort) || 'desc').trim() === 'asc' ? 'asc' : 'desc';
    const limit = Math.min(parseInt(String((req.query && req.query.limit) || '50'), 10) || 50, 200);

    var params = {
      select: cfg.select,
      order: cfg.dateCol + '.' + sortDir,
      limit: String(limit)
    };

    // Date range filter — array emits repeated query-string keys for PostgREST
    var dateFilters = [];
    if (dateFrom) dateFilters.push('gte.' + dateFrom + 'T00:00:00.000Z');
    if (dateTo) dateFilters.push('lte.' + dateTo + 'T23:59:59.999Z');
    if (dateFilters.length === 1) params[cfg.dateCol] = dateFilters[0];
    else if (dateFilters.length === 2) params[cfg.dateCol] = dateFilters;

    // Full-text OR search across name, email, phone, identity columns
    if (q) {
      var escaped = q.replace(/\*/g, '');
      var orParts = cfg.searchCols.map(function (col) {
        return col + '.ilike.*' + escaped + '*';
      });
      params.or = '(' + orParts.join(',') + ')';
    }

    var rows = await selectSupabaseRows(config, cfg.tableName, params);
    return sendJson(res, 200, { ok: true, items: rows.map(cfg.normalize) });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
