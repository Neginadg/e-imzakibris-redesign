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
      source_page: String(body.source_page || 'support/onlineapplication.html').trim(),
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    };

    if (!record.full_name || !record.email) {
      return sendJson(res, 400, { ok: false, error: 'Missing required application fields' });
    }

    const inserted = await insertSupabaseRow(config, 'applications', record);

    const companyMailData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      identity_number: record.identity_number,
      payment_method: record.payment_method,
      source_page: record.source_page,
      payload: record.payload
    };

    const customerSummaryData = {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      identity_number: record.identity_number,
      payment_method: record.payment_method,
      payload: record.payload
    };

    const paymentText = config.bankAccountDetails
      ? 'Odeme icin banka hesap bilgileri:\n\n' + config.bankAccountDetails
      : 'Odeme bilgileri su an sistemde tanimli degil. Lutfen destek ekibimizle iletisime geciniz.';

    const emailStatus = {
      company: false,
      customerConfirmation: false,
      customerPayment: false
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni Basvuru Formu',
        html: buildHtmlSummary(companyMailData, 'Application Form Submission'),
        text: toPlainText(companyMailData).join('\n')
      });
      emailStatus.company = true;
    } catch (error) {
      emailStatus.company = false;
    }

    try {
      await sendEmail(config, {
        to: record.email,
        subject: 'Basvuru Onayi',
        html: buildHtmlSummary(customerSummaryData, 'Basvurunuz Alindi'),
        text: toPlainText(customerSummaryData).join('\n')
      });
      emailStatus.customerConfirmation = true;
    } catch (error) {
      emailStatus.customerConfirmation = false;
    }

    try {
      await sendEmail(config, {
        to: record.email,
        subject: 'Odeme Bilgileri',
        html: '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;"><h2>Odeme Bilgileri</h2><p>Basvurunuz icin tesekkur ederiz.</p><pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border:1px solid #ddd;">' + paymentText + '</pre></div>',
        text: paymentText
      });
      emailStatus.customerPayment = true;
    } catch (error) {
      emailStatus.customerPayment = false;
    }

    return sendJson(res, 200, {
      ok: true,
      stored: true,
      emailStatus,
      id: inserted && inserted.id ? inserted.id : null,
      warning: emailStatus.company && emailStatus.customerConfirmation && emailStatus.customerPayment
        ? null
        : 'Saved to database but one or more emails failed to send.'
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
};
