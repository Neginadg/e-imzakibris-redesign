const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { countSupabaseRows } = require('../lib/supabase');
const { requireAdmin } = require('../lib/auth');

const DEFAULT_CUSTOMER_TABLE = 'eimza_kibris_applications_2026';

function getCustomerTableName() {
  return String(process.env.ADMIN_CUSTOMERS_TABLE || DEFAULT_CUSTOMER_TABLE).trim();
}

// "Paid" is only ever confirmed here (payment_done ticked in the Customer
// Center, covering every payment method — not just card payments). The
// other three submission tables also carry a payment_done column, but for
// timestamp/molohiya it is only ever set by the PayPoint callback for card
// payments — a bank-transfer or cash-on-delivery order there has no way to
// be marked paid, so including them would make every non-card order look
// permanently unpaid. (renewal_requests now has an admin-managed
// payment_done via api/admin-requests.js too, but not yet the
// receipt_written/signature_ready/delivered columns that ship alongside it
// on the e-imza table, so it's left out here until that's confirmed.) So
// payment/signature stats are scoped to the e-imza customer table, the one
// with a complete, real, admin-managed workflow for every payment method.
const PAID_SINCE_DATE = '2026-01-01T00:00:00.000Z';

// "Applications" counts only e-imza applications submitted from this date
// onward — "Electronic Signature Users" stays the all-time total.
const APPLICATIONS_SINCE_DATE = '2026-06-30T00:00:00.000Z';

// Payment method values as actually written by the submission forms (see
// assets/js/main.js / api/application-submit.js) — reused as-is rather than
// invented categories. Anything else falls into "other" below.
const KNOWN_PAYMENT_METHODS = ['Kredi Kartı', 'Havale/EFT', 'Teslimatta Ödeme', 'Ücretsiz'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const config = getRuntimeEnv({ requireEmail: false });
    await requireAdmin(config, req);

    const customerTable = getCustomerTableName();

    const [
      signatureUsers,
      applications,
      renewals,
      molohiya,
      timestamp,
      paidSince2026,
      unpaidSince2026,
      signatureIssued,
      signaturePending,
      paidAllTime,
      ...paymentMethodCounts
    ] = await Promise.all([
      countSupabaseRows(config, customerTable, {}),
      countSupabaseRows(config, customerTable, { imported_at: 'gte.' + APPLICATIONS_SINCE_DATE }),
      countSupabaseRows(config, 'renewal_requests', {}),
      countSupabaseRows(config, 'molohiya_application', {}),
      countSupabaseRows(config, 'timestamp_application', {}),
      countSupabaseRows(config, customerTable, { payment_done: 'eq.true', imported_at: 'gte.' + PAID_SINCE_DATE }),
      countSupabaseRows(config, customerTable, { payment_done: 'eq.false', imported_at: 'gte.' + PAID_SINCE_DATE }),
      countSupabaseRows(config, customerTable, { signature_ready: 'eq.true' }),
      countSupabaseRows(config, customerTable, { signature_ready: 'eq.false' }),
      countSupabaseRows(config, customerTable, { payment_done: 'eq.true' }),
      ...KNOWN_PAYMENT_METHODS.map(function (method) {
        return countSupabaseRows(config, customerTable, { payment_done: 'eq.true', odeme_sekli: 'eq.' + method });
      })
    ]);

    const paymentMethods = KNOWN_PAYMENT_METHODS.map(function (method, index) {
      return { method: method, count: paymentMethodCounts[index] };
    });
    const knownTotal = paymentMethodCounts.reduce(function (sum, n) { return sum + n; }, 0);
    const otherCount = Math.max(0, paidAllTime - knownTotal);
    if (otherCount > 0) {
      paymentMethods.push({ method: 'Diğer / Belirtilmemiş', count: otherCount });
    }

    return sendJson(res, 200, {
      ok: true,
      stats: {
        signatureUsers: signatureUsers,
        applications: applications,
        renewals: renewals,
        molohiya: molohiya,
        timestamp: timestamp
      },
      paymentStatus: {
        paid: paidSince2026,
        unpaid: unpaidSince2026,
        sinceDate: PAID_SINCE_DATE
      },
      paymentMethods: paymentMethods,
      signatureStatus: {
        issued: signatureIssued,
        pending: signaturePending
      }
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};
