const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { selectSupabaseRows } = require('../lib/supabase');

const DOCS_TABLE = 'documents';

function normalizeDoc(row) {
  const meta = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata))
    ? row.metadata
    : {};
  return {
    id: row.id,
    table: row.section_type,
    name: row.file_name || row.title || '',
    file_url: row.file_url || '',
    size: row.file_size || 0,
    certificateStartDate: row.start_date || meta.certificateStartDate || '',
    certificateEndDate: row.end_date || meta.certificateEndDate || '',
    ...meta,
    documentName: meta.documentName || row.title || ''
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const table = String((req.query && req.query.table) || '').trim();

    if (!table) {
      return sendJson(res, 400, { ok: false, error: 'Missing table parameter' });
    }

    const params = {
      select: 'id,section_type,title,file_name,file_url,file_size,start_date,end_date,metadata,display_order,created_at',
      section_type: `eq.${table}`,
      order: 'display_order.asc,created_at.asc'
    };

    const rows = await selectSupabaseRows(config, DOCS_TABLE, params);
    return sendJson(res, 200, { ok: true, items: rows.map(normalizeDoc) });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
