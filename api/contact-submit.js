const { sendJson, readJsonBody } = require('./_lib/http');
const { getRuntimeEnv } = require('./_lib/env');
const { insertSupabaseRow } = require('./_lib/supabase');
const { buildHtmlSummary, toPlainText, sendEmail } = require('./_lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const body = readJsonBody(req);

    const record = {
      full_name: String(body.full_name || '').trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim(),
      subject: String(body.subject || '').trim(),
      message: String(body.message || '').trim(),
      source_page: String(body.source_page || 'contact/index.html').trim()
    };

    if (!record.full_name || !record.email || !record.message) {
      return sendJson(res, 400, { ok: false, error: 'Missing required contact fields' });
    }

    const inserted = await insertSupabaseRow(config, 'contact_messages', record);

    const hasEmailConfig = Boolean(config.resendApiKey && config.mailFrom && config.companyEmail);
    if (!hasEmailConfig) {
      return sendJson(res, 200, {
        ok: true,
        stored: true,
        emailSent: false,
        id: inserted && inserted.id ? inserted.id : null,
        warning: 'Saved to database. Email notification is skipped because email configuration is missing.'
      });
    }

    const emailPayload = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      subject: record.subject,
      message: record.message,
      source_page: record.source_page
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni Iletisim Formu Mesaji',
        html: buildHtmlSummary(emailPayload, 'Contact Form Submission'),
        text: toPlainText(emailPayload).join('\n')
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
