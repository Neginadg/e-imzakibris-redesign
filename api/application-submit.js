const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { insertSupabaseRow } = require('../lib/supabase');
const { buildHtmlSummary, toPlainText, sendEmail, buildCustomerConfirmationHtml, buildCustomerConfirmationText } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const body = readJsonBody(req);

    const record = {
      source_file_name: 'website',
      adi_soyadi: String(body.full_name || '').trim(),
      e_posta_adresi: String(body.email || '').trim(),
      cep_telefon_numarasi: String(body.phone || '').trim(),
      kimlik_pasaport_numarasi: String(body.identity_number || '').trim(),
      odeme_sekli: String(body.payment_method || 'Havale/EFT').trim(),
      durum: 'Yeni',
      payload: Object.assign(
        { source_page: String(body.source_page || 'support/onlineapplication.html').trim() },
        body.payload && typeof body.payload === 'object' ? body.payload : {}
      )
    };

    if (!record.adi_soyadi || !record.e_posta_adresi) {
      return sendJson(res, 400, { ok: false, error: 'Missing required application fields' });
    }

    const inserted = await insertSupabaseRow(config, 'eimza_kibris_applications_2026', record);

    const hasEmailConfig = Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.mailFrom && config.companyEmail);
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
      full_name: record.adi_soyadi,
      email: record.e_posta_adresi,
      phone: record.cep_telefon_numarasi,
      identity_number: record.kimlik_pasaport_numarasi,
      payment_method: record.odeme_sekli,
      source_page: record.payload.source_page,
      payload: record.payload
    };

    const customerSummaryData = {
      full_name: record.adi_soyadi,
      email: record.e_posta_adresi,
      phone: record.cep_telefon_numarasi,
      identity_number: record.kimlik_pasaport_numarasi,
      payment_method: record.odeme_sekli,
      payload: record.payload
    };

    const emailStatus = {
      company: false,
      customerConfirmation: false
    };

    try {
      await sendEmail(config, {
        to: config.companyEmail,
        subject: 'Yeni E-Imza Basvurusu',
        html: buildHtmlSummary(companyMailData, 'E-Imza Basvuru Formu'),
        text: toPlainText(companyMailData).join('\n')
      });
      emailStatus.company = true;
    } catch (error) {
      emailStatus.company = false;
    }

    try {
      await sendEmail(config, {
        to: record.e_posta_adresi,
        subject: 'E-İmza Başvurunuz Alındı – e-İmza Kıbrıs',
        html: buildCustomerConfirmationHtml(customerSummaryData),
        text: buildCustomerConfirmationText(customerSummaryData)
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
