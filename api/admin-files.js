const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const {
  insertSupabaseRow,
  selectSupabaseRows,
  updateSupabaseRow,
  deleteSupabaseRow,
  uploadSupabaseFile,
  deleteSupabaseFile
} = require('../lib/supabase');

const BUCKET = 'Public Bucket';
const DOCS_TABLE = 'documents';

function getPublicUrl(config, storagePath) {
  const base = config.supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${storagePath}`;
}

function extractStoragePath(config, fileUrl) {
  if (!fileUrl) return null;
  const marker = `/storage/v1/object/public/${encodeURIComponent(BUCKET)}/`;
  const altMarker = `/storage/v1/object/public/Public%20Bucket/`;
  const idx = fileUrl.indexOf(marker) !== -1
    ? fileUrl.indexOf(marker) + marker.length
    : fileUrl.indexOf(altMarker) !== -1
      ? fileUrl.indexOf(altMarker) + altMarker.length
      : -1;
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx));
}

function normalizeDoc(row) {
  const meta = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata))
    ? row.metadata
    : {};

  return {
    id: row.id,
    table: row.section_type,
    name: row.file_name || row.title || '',
    file_url: row.file_url || '',
    type: row.mime_type || 'application/octet-stream',
    size: row.file_size || 0,
    uploadedAt: row.created_at || row.updated_at || '',
    // Spread all metadata fields for compatibility with the admin panel's
    // formatRecordSummary / renderTableItems which read them directly
    ...meta,
    // Explicit overrides for known date fields stored in dedicated columns
    certificateStartDate: row.start_date || meta.certificateStartDate || '',
    certificateEndDate: row.end_date || meta.certificateEndDate || '',
    documentName: meta.documentName || row.title || ''
  };
}

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });

    // ── GET: list documents ──────────────────────────────────────────────────
    if (req.method === 'GET') {
      const table = String((req.query && req.query.table) || '').trim();
      const params = {
        select: 'id,section_type,title,file_name,file_url,file_size,mime_type,start_date,end_date,metadata,created_at',
        order: 'created_at.desc'
      };
      if (table) params.section_type = `eq.${table}`;

      const rows = await selectSupabaseRows(config, DOCS_TABLE, params);
      return sendJson(res, 200, { ok: true, items: rows.map(normalizeDoc) });
    }

    // ── POST: upload a new file ──────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const { fileData, fileName, fileType, fileSize, table, ...metaFields } = body;

      if (!fileData || !fileName || !table) {
        return sendJson(res, 400, { ok: false, error: 'Missing fileData, fileName, or table' });
      }

      // Decode base64 data URL → binary buffer
      const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      const buffer = Buffer.from(base64, 'base64');
      const mimeType = fileType || 'application/octet-stream';

      // Build a collision-free storage path
      const { randomUUID } = require('crypto');
      const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
      const storagePath = `${table}/${randomUUID()}${ext}`;

      await uploadSupabaseFile(config, BUCKET, storagePath, buffer, mimeType);
      const fileUrl = getPublicUrl(config, storagePath);

      // Save metadata to documents table
      const startDate = (metaFields.certificateStartDate && metaFields.certificateStartDate.trim())
        ? metaFields.certificateStartDate.trim() : null;
      const endDate = (metaFields.certificateEndDate && metaFields.certificateEndDate.trim())
        ? metaFields.certificateEndDate.trim() : null;

      const docPayload = {
        section_type: table,
        title: metaFields.documentName || fileName,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize || buffer.length,
        mime_type: mimeType,
        metadata: metaFields,
        display_order: 0
      };
      if (startDate) docPayload.start_date = startDate;
      if (endDate) docPayload.end_date = endDate;

      const inserted = await insertSupabaseRow(config, DOCS_TABLE, docPayload);
      return sendJson(res, 200, { ok: true, item: normalizeDoc(inserted) });
    }

    // ── PATCH: update metadata (no file replacement) ─────────────────────────
    if (req.method === 'PATCH') {
      const body = readJsonBody(req);
      const { id, ...fields } = body;
      if (!id) return sendJson(res, 400, { ok: false, error: 'Missing id' });

      const docUpdate = { metadata: fields };
      if (fields.documentName) docUpdate.title = fields.documentName;
      if (fields.certificateStartDate && fields.certificateStartDate.trim()) {
        docUpdate.start_date = fields.certificateStartDate.trim();
      }
      if (fields.certificateEndDate && fields.certificateEndDate.trim()) {
        docUpdate.end_date = fields.certificateEndDate.trim();
      }

      const updated = await updateSupabaseRow(config, DOCS_TABLE, { id: `eq.${id}` }, docUpdate);
      return sendJson(res, 200, { ok: true, item: normalizeDoc(updated) });
    }

    // ── DELETE: remove file + document record ────────────────────────────────
    if (req.method === 'DELETE') {
      const body = readJsonBody(req);
      const { id, file_url } = body;
      if (!id) return sendJson(res, 400, { ok: false, error: 'Missing id' });

      // Delete from Supabase Storage
      const storagePath = extractStoragePath(config, file_url);
      if (storagePath) {
        try {
          await deleteSupabaseFile(config, BUCKET, storagePath);
        } catch (_) {
          // File may already be gone; continue to delete the DB record
        }
      }

      await deleteSupabaseRow(config, DOCS_TABLE, { id: `eq.${id}` });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
