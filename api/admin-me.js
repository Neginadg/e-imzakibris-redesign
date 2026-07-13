const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { requireAdmin } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const admin = await requireAdmin(config, req);
    return sendJson(res, 200, { ok: true, email: admin.email, role: admin.role });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};
