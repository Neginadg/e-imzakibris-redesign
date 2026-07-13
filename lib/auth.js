const { selectSupabaseRows } = require('./supabase');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Verifies the caller's Supabase session (Authorization: Bearer <access_token>)
// and confirms the user is listed in public.admins. Throws a 401/403 error
// (with .statusCode set) if not — callers should catch and respond with it.
async function requireAdmin(config, req) {
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    throw httpError(401, 'Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }

  const endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/auth/v1/user';
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: 'Bearer ' + token
    }
  });

  if (!response.ok) {
    throw httpError(401, 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
  }

  const user = await response.json().catch(() => null);
  if (!user || !user.id) {
    throw httpError(401, 'Geçersiz oturum.');
  }

  const admins = await selectSupabaseRows(config, 'admins', {
    user_id: `eq.${user.id}`,
    select: 'user_id,role'
  });

  if (!admins.length) {
    throw httpError(403, 'Bu hesabın admin paneline erişim yetkisi yok.');
  }

  return { id: user.id, email: user.email, role: admins[0].role || 'admin' };
}

// Call after requireAdmin() to additionally gate an action to full admins
// only. The 'viewer' role (read-only Customer Center access) is rejected.
function requireFullAdmin(admin) {
  if (!admin || admin.role !== 'admin') {
    throw httpError(403, 'Bu işlem için tam yetkili admin girişi gereklidir.');
  }
}

module.exports = { requireAdmin, requireFullAdmin };
