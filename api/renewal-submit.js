const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { insertSupabaseRow } = require('../lib/supabase');
const { buildHtmlSummary, toPlainText, sendEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv();
    const body = readJsonBody(req);

    const record = {
      full_name: String(body.full_name || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      identity_number: String(body.identity_number || '').trim(),
      payment_method: String(body.payment_method || 'Havale/EFT').trim(),
      source_page: String(body.source_page || 'support/renewal.html').trim(),
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    };

    if (!record.full_name || !record.email) {
      return sendJson(res, 400, { ok: false, error: 'Missing required renewal fields' });
    }

    const inserted = await insertSupabaseRow(config, 'renewal_requests', record);

    const companyMailData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      identity_number: record.identity_number,
      payment_method: record.payment_method,
      source_page: record.source_page,
      payload: record.payload
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni Yenileme Basvurusu',
        html: buildHtmlSummary(companyMailData, 'Renewal Request Submission'),
        text: toPlainText(companyMailData).join('\n')
      });

      return sendJson(res, 200, {
        ok: true,
        stored: true,
        emailSent: true,
        id: inserted && inserted.id ? inserted.id : null
      });
    } catch (emailError) {
      return sendJson(res, 200, {
        ok: true,
        stored: true,
        emailSent: false,
        warning: 'Saved to database but company email failed to send.'
      });
    }
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
