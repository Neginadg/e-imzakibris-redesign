const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { insertSupabaseRow } = require('../lib/supabase');
const { buildHtmlSummary, toPlainText, sendEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const body = readJsonBody(req);

    const record = {
      form_type: String(body.form_type || 'timestamp').trim(),
      full_name: String(body.full_name || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      application_type: String(body.application_type || '').trim(),
      plan_label: String(body.plan_label || '').trim(),
      total_text: String(body.total_text || '').trim(),
      payment_method: String(body.payment_method || 'Havale/EFT').trim(),
      source_page: String(body.source_page || 'support/tsonlineapplication.html').trim(),
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    };

    if (!record.full_name || !record.email) {
      return sendJson(res, 400, { ok: false, error: 'Missing required Zaman Damgası form fields' });
    }

    const inserted = await insertSupabaseRow(config, 'timestamp_application', record);

    const hasEmailConfig = Boolean(config.resendApiKey && config.mailFrom && config.companyEmail);
    if (!hasEmailConfig) {
      return sendJson(res, 200, {
        ok: true,
        stored: true,
        emailStatus: {
          company: false
        },
        id: inserted && inserted.id ? inserted.id : null,
        warning: 'Saved to database. Emails are skipped because email configuration is missing.'
      });
    }

    const companyMailData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      application_type: record.application_type,
      plan_label: record.plan_label,
      total_text: record.total_text,
      payment_method: record.payment_method,
      source_page: record.source_page,
      payload: record.payload
    };

    const emailStatus = {
      company: false
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni Zaman Damgasi Basvurusu',
        html: buildHtmlSummary(companyMailData, 'Zaman Damgasi Basvurusu'),
        text: toPlainText(companyMailData).join('\n')
      });
      emailStatus.company = true;
    } catch (error) {
      emailStatus.company = false;
    }

    return sendJson(res, 200, {
      ok: true,
      stored: true,
      emailStatus,
      id: inserted && inserted.id ? inserted.id : null,
      warning: emailStatus.company
        ? null
        : 'Saved to database but company email failed to send.'
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
