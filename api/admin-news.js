const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const {
  selectSupabaseRows,
  insertSupabaseRow,
  deleteSupabaseRow,
  uploadSupabaseFile
} = require('../lib/supabase');
const { requireAdmin, requireFullAdmin } = require('../lib/auth');

const TABLE = 'news';
const BUCKET = 'Public Bucket';

function getPublicUrl(config, storagePath) {
  const base = config.supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${storagePath}`;
}

function formatDisplayDateTR(dateStr) {
  const parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getBadgeClass(badge) {
  return badge === 'Sertifika' ? '' : 'news-badge--green';
}

function normalizeRow(row) {
  return {
    id: row.id,
    date: row.published_at ? String(row.published_at).slice(0, 10) : '',
    displayDate: row.display_date || '',
    badge: row.badge || 'Haber',
    badgeClass: row.badge_class || '',
    title: row.title || '',
    excerpt: row.excerpt || '',
    image: row.image_url || '',
    alt: row.image_alt || row.title || ''
  };
}

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const admin = await requireAdmin(config, req);
    requireFullAdmin(admin);

    if (req.method === 'GET') {
      const rows = await selectSupabaseRows(config, TABLE, {
        select: 'id,title,excerpt,image_url,image_alt,published_at,display_date,badge,badge_class,sort_order',
        order: 'published_at.desc'
      });
      return sendJson(res, 200, { ok: true, items: rows.map(normalizeRow) });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const date = String(body.date || '').trim();
      const title = String(body.title || '').trim();
      const excerpt = String(body.excerpt || '').trim();
      const badge = String(body.badge || 'Haber').trim();
      let imageUrl = String(body.image || '').trim();

      if (!date || !title || !excerpt) {
        return sendJson(res, 400, { ok: false, error: 'Tarih, başlık ve özet alanları zorunludur.' });
      }

      // If a data URL was uploaded from the file picker, push it to storage
      // and use the resulting public URL instead of storing the base64 blob.
      if (imageUrl.startsWith('data:')) {
        const match = /^data:([^;]+);base64,(.*)$/.exec(imageUrl);
        if (!match) {
          return sendJson(res, 400, { ok: false, error: 'Geçersiz görsel verisi.' });
        }
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const ext = mimeType.split('/')[1] ? `.${mimeType.split('/')[1]}` : '';
        const { randomUUID } = require('crypto');
        const storagePath = `news/${randomUUID()}${ext}`;
        await uploadSupabaseFile(config, BUCKET, storagePath, buffer, mimeType);
        imageUrl = getPublicUrl(config, storagePath);
      }

      if (!imageUrl) imageUrl = 'assets/img/news.png';

      const inserted = await insertSupabaseRow(config, TABLE, {
        title,
        excerpt,
        image_url: imageUrl,
        image_alt: title,
        published_at: `${date}T00:00:00.000Z`,
        display_date: formatDisplayDateTR(date),
        badge,
        badge_class: getBadgeClass(badge),
        sort_order: 0
      });

      return sendJson(res, 200, { ok: true, item: normalizeRow(inserted) });
    }

    if (req.method === 'DELETE') {
      const body = readJsonBody(req);
      const id = String(body.id || '').trim();
      if (!id) return sendJson(res, 400, { ok: false, error: 'Missing id' });

      await deleteSupabaseRow(config, TABLE, { id: `eq.${id}` });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};
