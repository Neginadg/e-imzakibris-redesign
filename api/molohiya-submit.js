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
      form_type: String(body.form_type || 'molohiya').trim(),
      full_name: String(body.full_name || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      identity_number: String(body.identity_number || '').trim(),
      plan_label: String(body.plan_label || '').trim(),
      total_text: String(body.total_text || '').trim(),
      payment_method: String(body.payment_method || 'Havale/EFT').trim(),
      source_page: String(body.source_page || 'products/molohiya.html').trim(),
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    };

    if (!record.full_name || !record.email) {
      return sendJson(res, 400, { ok: false, error: 'Missing required MOlOhiya form fields' });
    }

    const inserted = await insertSupabaseRow(config, 'molohiya_application', record);

    const hasEmailConfig = Boolean(config.resendApiKey && config.mailFrom && config.companyEmail);
    if (!hasEmailConfig) {
      return sendJson(res, 200, {
        ok: true,
        stored: true,
        emailStatus: {
          company: false,
          customerConfirmation: false
        },
        id: inserted && inserted.id ? inserted.id : null,
        warning: 'Saved to database. Emails are skipped because email configuration is missing.'
      });
    }

    const companyMailData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      identity_number: record.identity_number,
      plan_label: record.plan_label,
      total_text: record.total_text,
      payment_method: record.payment_method,
      source_page: record.source_page,
      payload: record.payload
    };

    const customerSummaryData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      identity_number: record.identity_number,
      plan_label: record.plan_label,
      total_text: record.total_text,
      payment_method: record.payment_method,
      payload: record.payload
    };

    const emailStatus = {
      company: false,
      customerConfirmation: false
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni MOlOhiya Satin Alma Talebiniz',
        html: buildHtmlSummary(companyMailData, 'MOlOhiya Satin Alma Formu'),
        text: toPlainText(companyMailData).join('\n')
      });
      emailStatus.company = true;
    } catch (error) {
      emailStatus.company = false;
    }

    try {
      await sendEmail(config, {
        to: record.email,
        subject: 'MOlOhiya Satin Alma Talebiniz Alinmistir',
        html: '<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;"><div style="background:#f5f5f5;padding:15px;margin-bottom:20px;border-left:4px solid #d11c1c;"><p>Sayın ' + (record.full_name || 'Müşteri') + ', MOlOhiya satin alma talebiniz alınmıştır. Ekibimiz sizinle iletişim kuracaktır. e-imza KIBRIS</p></div><p>Talebiniz başarıyla kaydedilmiştir. En kısa sürede sizin ile iletişim kurulacaktır.</p></div>',
        text: 'Talebiniz alınmıştır. En kısa sürede iletişim kurulacaktır.'
      });
      emailStatus.customerConfirmation = true;
    } catch (error) {
      emailStatus.customerConfirmation = false;
    }

    return sendJson(res, 200, {
      ok: true,
      stored: true,
      emailStatus,
      id: inserted && inserted.id ? inserted.id : null,
      warning: emailStatus.company && emailStatus.customerConfirmation
        ? null
        : 'Saved to database but one or more emails failed to send.'
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
