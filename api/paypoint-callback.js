const { sendJson, readJsonBody } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { updateSupabaseRow, selectSupabaseRows } = require('../lib/supabase');
const { checkTransactionStatus, PAYPOINT_STATUS } = require('../lib/paypoint');
const { buildHtmlSummary, toPlainText, sendEmail, buildCustomerConfirmationHtml, buildCustomerConfirmationText } = require('../lib/email');

// This is the URL_CALLBACK given to PayPoint at onboarding. It fires
// server-to-server after a transaction is processed (spec III.3). Content-
// Type is documented only as "form-data" — assumed to be
// application/x-www-form-urlencoded (simple key/value fields, no files),
// which Vercel parses into req.body the same way as JSON. If PayPoint
// actually sends true multipart/form-data, this will need a multipart
// parser (e.g. busboy) added.

const TABLES = [
  {
    tableName: 'eimza_kibris_applications_2026',
    nameCol: 'adi_soyadi',
    emailCol: 'e_posta_adresi',
    companySubject: 'Yeni E-Imza Basvurusu (Kredi Kartı Ödemesi Onaylandı)',
    sendCustomerConfirmation: true
  },
  {
    tableName: 'renewal_requests',
    nameCol: 'full_name',
    emailCol: 'email',
    companySubject: 'Yeni Yenileme Basvurusu (Kredi Kartı Ödemesi Onaylandı)',
    sendCustomerConfirmation: false
  },
  {
    tableName: 'molohiya_application',
    nameCol: 'full_name',
    emailCol: 'email',
    companySubject: 'Yeni MOlOhiya Satin Alma Talebi (Kredi Kartı Ödemesi Onaylandı)',
    sendCustomerConfirmation: false
  },
  {
    tableName: 'timestamp_application',
    nameCol: 'full_name',
    emailCol: 'email',
    companySubject: 'Yeni Zaman Damgasi Basvurusu (Kredi Kartı Ödemesi Onaylandı)',
    sendCustomerConfirmation: false
  }
];

async function findRecordByTrnId(config, merchantTrnId) {
  for (const tableConfig of TABLES) {
    const rows = await selectSupabaseRows(config, tableConfig.tableName, {
      merchant_trn_id: `eq.${merchantTrnId}`,
      limit: '1'
    });
    if (rows.length) {
      return { tableConfig, row: rows[0] };
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const body = readJsonBody(req);
    const merchantTrnId = Number(body.MerchantTrnId || body.merchantTrnId);

    if (!Number.isFinite(merchantTrnId)) {
      // Acknowledge anyway so PayPoint doesn't retry a malformed callback forever.
      return sendJson(res, 200, { ok: false, error: 'Missing MerchantTrnId' });
    }

    const found = await findRecordByTrnId(config, merchantTrnId);
    if (!found) {
      return sendJson(res, 200, { ok: false, error: 'No matching record for MerchantTrnId ' + merchantTrnId });
    }

    // Don't trust the callback body's own fields for the actual decision —
    // independently re-verify by calling PayPoint's REST status check
    // (signed by us), per the spec's own recommendation (III.3, step G).
    const status = await checkTransactionStatus(config, { merchantTrnId });

    const { tableConfig, row } = found;
    const isCompleted = Number(status.Status) === PAYPOINT_STATUS.COMPLETED;

    await updateSupabaseRow(
      config,
      tableConfig.tableName,
      { id: `eq.${row.id}` },
      {
        payment_done: isCompleted,
        paypoint_response: status
      }
    );

    if (isCompleted) {
      const hasEmailConfig = Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.mailFrom && config.companyEmail);
      if (hasEmailConfig) {
        const customerEmail = row[tableConfig.emailCol] || '';
        const customerName = row[tableConfig.nameCol] || '';
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};

        const mailData = {
          full_name: customerName,
          email: customerEmail,
          payment_method: 'Kredi Kartı',
          payment_amount: status.Amount != null ? (Number(status.Amount) / 100).toFixed(2) + ' TL' : '',
          source_page: payload.source_page || '',
          payload
        };

        try {
          await sendEmail(config, {
            to: config.companyEmail,
            subject: tableConfig.companySubject,
            html: buildHtmlSummary(mailData, tableConfig.companySubject),
            text: toPlainText(mailData).join('\n')
          });
        } catch (e) {
          // best-effort — payment status is already saved regardless
        }

        if (tableConfig.sendCustomerConfirmation && customerEmail) {
          try {
            await sendEmail(config, {
              to: customerEmail,
              subject: 'E-İmza Başvurunuz Alındı – e-İmza Kıbrıs',
              html: buildCustomerConfirmationHtml(mailData),
              text: buildCustomerConfirmationText(mailData)
            });
          } catch (e) {
            // best-effort
          }
        }
      }
    }

    return sendJson(res, 200, { ok: true, status: status.Status });
  } catch (error) {
    // Acknowledge with 200 so PayPoint doesn't retry-storm on our own
    // errors; the failure is still visible in Vercel's function logs.
    console.error('paypoint-callback error:', error);
    return sendJson(res, 200, { ok: false, error: error.message || 'Server error' });
  }
};
