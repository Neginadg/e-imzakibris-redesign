const { sendJson } = require('../lib/http');
const { getRuntimeEnv } = require('../lib/env');
const { countSupabaseRows, selectSupabaseRows } = require('../lib/supabase');
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

// Every date-filtered query below is also restricted to source_file_name =
// 'website'. This table holds both real web submissions (imported_at set at
// genuine insert time) AND a large legacy bulk-imported historical dataset
// whose imported_at only reflects whenever that import happened to run —
// not the customer's real signup date (api/admin-customers.js already works
// around this the same way for display: it prefers kayit_tarihi, a free-text
// field, over imported_at for exactly this reason). Without this filter, a
// "since <date>" count silently sweeps in old legacy rows too.
const WEBSITE_SOURCE_FILTER = { source_file_name: 'eq.website' };

// Payment method values as actually written by the submission forms (see
// assets/js/main.js / api/application-submit.js) — reused as-is rather than
// invented categories. Anything else falls into "other" below.
// 'Nakit' (cash) and 'POS' are admin-only labels — customers never pick
// these on the public forms; an admin sets them when recording an in-person
// payment (e.g. via a manual SQL update), so the dashboard's payment-method
// breakdown can still recognize and count them by name instead of lumping
// them into "Diğer / Belirtilmemiş".
const KNOWN_PAYMENT_METHODS = ['Kredi Kartı', 'Havale/EFT', 'Teslimatta Ödeme', 'Nakit', 'POS', 'Ücretsiz'];

const TR_MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Revenue trend starts the same month "paid" tracking becomes meaningful —
// reuses PAID_SINCE_DATE rather than a second hardcoded cutoff.
const REVENUE_SINCE_DATE = PAID_SINCE_DATE;

// Mirrors extractFinalPrice() in assets/js/main.js. renewal_requests has no
// numeric price column at all — but the KDV-inclusive total the customer
// actually paid is baked into the free-text renewalTerm/molohiyaLicense
// strings the form submits, e.g. "1 Yıllık Yenileme 2650.₺ + KDV = 3074.₺".
// Pulling the number back out of that label gives the real historical price
// charged at submission time, not today's price list.
function extractPriceFromLabel(text) {
  const raw = String(text || '');
  const match = raw.match(/=\s*([0-9][0-9.,]*)\s*\.?\s*₺/i) || raw.match(/([0-9][0-9.,]*)\s*\.?\s*₺/i);
  if (!match) return 0;
  const normalized = match[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

// Fallback for plain currency text (total_text, or the legacy-import
// kdv_dahil_toplam_tutar_tl column) when no numeric payload value exists.
function parseCurrencyText(text) {
  const raw = String(text || '').trim();
  if (!raw || /ücretsiz/i.test(raw)) return 0;
  const match = raw.match(/([0-9][0-9.,]*)/);
  if (!match) return 0;
  const normalized = match[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function monthKeyOf(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

// Every calendar month from REVENUE_SINCE_DATE up to the current month
// (inclusive) — so the chart always extends to "now" as time passes.
function buildMonthKeys(sinceIso) {
  const start = new Date(sinceIso);
  const now = new Date();
  const keys = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth();
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(year + '-' + String(month + 1).padStart(2, '0'));
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return keys;
}

// e-imza website submissions always carry the KDV-inclusive total in
// payload.pricing.total (a plain number, set by the online application
// form). kdv_dahil_toplam_tutar_tl is only a fallback for older rows.
function eimzaRowAmount(row) {
  const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : {};
  const pricingTotal = payload.pricing && Number(payload.pricing.total);
  if (Number.isFinite(pricingTotal)) return pricingTotal;
  return parseCurrencyText(row && row.kdv_dahil_toplam_tutar_tl);
}

function renewalRowAmount(row) {
  const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : {};
  const termPrice = extractPriceFromLabel(payload.renewalTerm);
  const licenseValue = payload.molohiyaLicense;
  const licensePrice = licenseValue && licenseValue !== '-' ? extractPriceFromLabel(licenseValue) : 0;
  return termPrice + licensePrice;
}

// molohiya_application stores the final KDV-inclusive total as a plain
// number at payload.total.
function molohiyaRowAmount(row) {
  const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : {};
  const total = Number(payload.total);
  if (Number.isFinite(total)) return total;
  return parseCurrencyText(row && row.total_text);
}

// timestamp_application follows the same payload.pricing.total shape as
// e-imza (same form-builder pattern in assets/js/main.js).
function timestampRowAmount(row) {
  const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : {};
  const pricingTotal = payload.pricing && Number(payload.pricing.total);
  if (Number.isFinite(pricingTotal)) return pricingTotal;
  return parseCurrencyText(row && row.total_text);
}

// molohiya_application / timestamp_application have no admin-managed
// payment_done covering every payment method the way eimza/renewal do —
// there, payment_done is only ever flipped by the PayPoint card callback
// (see the comment above PAID_SINCE_DATE). So a card order only counts once
// actually completed; a non-card order (bank transfer / cash on delivery)
// is counted at face value since this schema has no confirmation step for
// those yet.
function isCountableOrder(row) {
  return row.payment_method !== 'Kredi Kartı' || row.payment_done === true;
}

// Now that renewal_requests / molohiya_application / timestamp_application
// all have the same admin-managed payment_done + delivered columns as
// eimza_kibris_applications_2026 (see supabase/09_forms_status_tracking.sql),
// this surfaces the same paid/unpaid + delivered/pending breakdown for them
// on the main Dashboard tab, not just inside the Customer Center.
const PRODUCT_STATUS_TABLES = {
  renewal: 'renewal_requests',
  molohiya: 'molohiya_application',
  timestamp: 'timestamp_application'
};

async function fetchProductStatus(config) {
  const keys = Object.keys(PRODUCT_STATUS_TABLES);
  const perProduct = await Promise.all(keys.map(function (key) {
    const table = PRODUCT_STATUS_TABLES[key];
    return Promise.all([
      countSupabaseRows(config, table, { payment_done: 'eq.true' }),
      countSupabaseRows(config, table, { payment_done: 'eq.false' }),
      countSupabaseRows(config, table, { delivered: 'eq.true' }),
      countSupabaseRows(config, table, { delivered: 'eq.false' })
    ]);
  }));

  const productStatus = {};
  keys.forEach(function (key, i) {
    const paid = perProduct[i][0];
    const unpaid = perProduct[i][1];
    const delivered = perProduct[i][2];
    const pending = perProduct[i][3];
    productStatus[key] = { paid: paid, unpaid: unpaid, delivered: delivered, pending: pending };
  });
  return productStatus;
}

async function fetchRevenueTrend(config, customerTable) {
  const monthKeys = buildMonthKeys(REVENUE_SINCE_DATE);
  const makeEmptySeries = function () {
    return monthKeys.reduce(function (acc, key) {
      acc[key] = 0;
      return acc;
    }, {});
  };
  const series = {
    eimza: makeEmptySeries(),
    renewal: makeEmptySeries(),
    molohiya: makeEmptySeries(),
    timestamp: makeEmptySeries()
  };

  const [eimzaRows, renewalRows, molohiyaRows, timestampRows] = await Promise.all([
    selectSupabaseRows(config, customerTable, Object.assign({
      select: 'imported_at,payload,kdv_dahil_toplam_tutar_tl',
      payment_done: 'eq.true',
      imported_at: 'gte.' + REVENUE_SINCE_DATE,
      limit: '10000'
    }, WEBSITE_SOURCE_FILTER)),
    selectSupabaseRows(config, 'renewal_requests', {
      select: 'created_at,payload',
      payment_done: 'eq.true',
      created_at: 'gte.' + REVENUE_SINCE_DATE,
      limit: '10000'
    }),
    selectSupabaseRows(config, 'molohiya_application', {
      select: 'created_at,payment_method,payment_done,payload,total_text',
      created_at: 'gte.' + REVENUE_SINCE_DATE,
      limit: '10000'
    }),
    selectSupabaseRows(config, 'timestamp_application', {
      select: 'created_at,payment_method,payment_done,payload,total_text',
      created_at: 'gte.' + REVENUE_SINCE_DATE,
      limit: '10000'
    })
  ]);

  eimzaRows.forEach(function (row) {
    const key = monthKeyOf(row.imported_at);
    if (key && key in series.eimza) series.eimza[key] += eimzaRowAmount(row);
  });
  renewalRows.forEach(function (row) {
    const key = monthKeyOf(row.created_at);
    if (key && key in series.renewal) series.renewal[key] += renewalRowAmount(row);
  });
  molohiyaRows.forEach(function (row) {
    if (!isCountableOrder(row)) return;
    const key = monthKeyOf(row.created_at);
    if (key && key in series.molohiya) series.molohiya[key] += molohiyaRowAmount(row);
  });
  timestampRows.forEach(function (row) {
    if (!isCountableOrder(row)) return;
    const key = monthKeyOf(row.created_at);
    if (key && key in series.timestamp) series.timestamp[key] += timestampRowAmount(row);
  });

  const round2 = function (n) { return Math.round(n * 100) / 100; };
  const months = monthKeys.map(function (key) {
    const parts = key.split('-');
    const eimza = round2(series.eimza[key]);
    const renewal = round2(series.renewal[key]);
    const molohiya = round2(series.molohiya[key]);
    const timestamp = round2(series.timestamp[key]);
    return {
      month: key,
      label: TR_MONTH_NAMES[Number(parts[1]) - 1] + ' ' + parts[0],
      eimza: eimza,
      renewal: renewal,
      molohiya: molohiya,
      timestamp: timestamp,
      total: round2(eimza + renewal + molohiya + timestamp)
    };
  });

  return { sinceDate: REVENUE_SINCE_DATE, currency: 'TRY', months: months };
}

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
      revenueTrend,
      productStatus,
      ...paymentMethodCounts
    ] = await Promise.all([
      countSupabaseRows(config, customerTable, {}),
      countSupabaseRows(config, customerTable, Object.assign({ imported_at: 'gte.' + APPLICATIONS_SINCE_DATE }, WEBSITE_SOURCE_FILTER)),
      countSupabaseRows(config, 'renewal_requests', {}),
      countSupabaseRows(config, 'molohiya_application', {}),
      countSupabaseRows(config, 'timestamp_application', {}),
      countSupabaseRows(config, customerTable, Object.assign({ payment_done: 'eq.true', imported_at: 'gte.' + PAID_SINCE_DATE }, WEBSITE_SOURCE_FILTER)),
      countSupabaseRows(config, customerTable, Object.assign({ payment_done: 'eq.false', imported_at: 'gte.' + PAID_SINCE_DATE }, WEBSITE_SOURCE_FILTER)),
      countSupabaseRows(config, customerTable, { signature_ready: 'eq.true' }),
      countSupabaseRows(config, customerTable, { signature_ready: 'eq.false' }),
      countSupabaseRows(config, customerTable, { payment_done: 'eq.true' }),
      fetchRevenueTrend(config, customerTable),
      fetchProductStatus(config),
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
      },
      revenueTrend: revenueTrend,
      productStatus: productStatus
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Server error' });
  }
};
