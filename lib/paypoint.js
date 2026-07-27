const crypto = require('crypto');
const { insertSupabaseRow } = require('./supabase');

// Hosts per the PayPoint TRNC API spec v1.5, corrected 2026-07 against a real
// example checkout form PayPoint's IT team sent directly (psp_cy.html): the
// hosted gateway page lives on a dedicated "psp." subdomain
// (https://psp.paypointcyprus.com/ecom), separate from paypointcyprus.com
// itself (their public/consumer bill-pay site — POSTing there was silently
// falling through to that site's generic homepage instead of a checkout
// session). The REST reg/check calls against https://paypointcyprus.com/ecom
// are separately confirmed working (real TrnKey returned), so apiBase is left
// as-is. Override via PAYPOINT_API_BASE_URL / PAYPOINT_ECOM_BASE_URL env vars
// without a code change if this ever needs correcting again.
function getPaypointHosts(config) {
  if (config.paypointEnv === 'production') {
    return {
      apiBase: config.paypointApiBaseUrl || 'https://paypointcyprus.com/ecom',
      ecomBase: config.paypointEcomBaseUrl || 'https://psp.paypointcyprus.com/ecom'
    };
  }

  // Test/sandbox — the spec uses the same host for both the REST API and
  // the hosted gateway page.
  return {
    apiBase: config.paypointApiBaseUrl || 'https://psp-test.paypoint.com.tr',
    ecomBase: config.paypointEcomBaseUrl || 'https://psp-test.paypoint.com.tr/ecom'
  };
}

// Per spec 4.3: values sorted A-Z per the method's field list (fixed field
// order given by PayPoint, not alphabetized by us), joined with ':', signed
// with HMAC-SHA512 using the merchant secret key, hex-encoded, uppercased.
function buildSignature(secretKey, parts) {
  const signatureString = parts.map((part) => (part == null ? '' : String(part))).join(':');
  const hmac = crypto.createHmac('sha512', secretKey);
  hmac.update(signatureString, 'utf8');
  return hmac.digest('hex').toUpperCase();
}

function assertPaypointConfigured(config) {
  if (!config.paypointMerchantCode || !config.paypointMerchantUser || !config.paypointSecretKey) {
    throw new Error('PayPoint is not configured (missing PAYPOINT_MERCHANT_CODE / PAYPOINT_MERCHANT_USER / PAYPOINT_SECRET_KEY).');
  }
}

// Generates a numeric transaction id PayPoint requires (Long type) —
// millisecond timestamp + 3 random digits, comfortably within Number.MAX_SAFE_INTEGER.
function generateMerchantTrnId() {
  const rand = Math.floor(Math.random() * 900) + 100;
  return Number(String(Date.now()) + String(rand));
}

async function registerTransaction(config, { merchantTrnId, amount, currency, description, merchantField, lang }) {
  assertPaypointConfigured(config);
  const { apiBase } = getPaypointHosts(config);

  const signature = buildSignature(config.paypointSecretKey, [
    config.paypointMerchantCode,
    config.paypointMerchantUser,
    merchantTrnId,
    amount,
    currency,
    description,
    merchantField || '',
    lang
  ]);

  const body = {
    MerchantCode: config.paypointMerchantCode,
    MerchantUser: config.paypointMerchantUser,
    MerchantTrnId: merchantTrnId,
    Amount: amount,
    Currency: currency,
    Description: description,
    MerchantField: merchantField || '',
    Lang: lang,
    Signature: signature
  };

  const response = await fetch(apiBase.replace(/\/+$/, '') + '/api/acquiring/reg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error('PayPoint registration request failed (HTTP ' + response.status + ')');
  }
  if (data.ResultCode !== 0) {
    throw new Error(data.ResultMessage || ('PayPoint registration failed (code ' + data.ResultCode + ')'));
  }

  return data.ReturnObject;
}

// Shared by all four submit endpoints for the 'Kredi Kartı' branch: inserts
// the pending record (payment_done: false) then registers the transaction
// with PayPoint, returning everything the browser needs to submit the
// hidden auto-post form to PayPoint's hosted gateway page.
async function beginCreditCardCheckout(config, { tableName, record, amount, description }) {
  const merchantTrnId = generateMerchantTrnId();
  const recordWithPayment = Object.assign({}, record, {
    payment_done: false,
    merchant_trn_id: merchantTrnId
  });

  const inserted = await insertSupabaseRow(config, tableName, recordWithPayment);

  const paypointResult = await registerTransaction(config, {
    merchantTrnId,
    amount,
    currency: 949,
    description,
    merchantField: String((inserted && inserted.id) || ''),
    lang: 'tr'
  });

  const { ecomBase } = getPaypointHosts(config);

  return {
    inserted,
    checkout: {
      gatewayUrl: ecomBase,
      merchantCode: config.paypointMerchantCode,
      merchantUser: config.paypointMerchantUser,
      merchantTrnId,
      trnKey: paypointResult.TrnKey,
      amount,
      currency: 949,
      description,
      lang: 'tr'
    }
  };
}

async function checkTransactionStatus(config, { merchantTrnId }) {
  assertPaypointConfigured(config);
  const { apiBase } = getPaypointHosts(config);

  // Per the spec's own PHP sample (4.5): the check method's signature is
  // just MerchantCode:MerchantUser:MerchantTrnId — not documented in prose,
  // only revealed in the example code's comment.
  const signature = buildSignature(config.paypointSecretKey, [
    config.paypointMerchantCode,
    config.paypointMerchantUser,
    merchantTrnId
  ]);

  const body = {
    MerchantCode: config.paypointMerchantCode,
    MerchantUser: config.paypointMerchantUser,
    MerchantTrnId: merchantTrnId,
    Signature: signature
  };

  const response = await fetch(apiBase.replace(/\/+$/, '') + '/api/acquiring/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error('PayPoint status check request failed (HTTP ' + response.status + ')');
  }
  if (data.ResultCode !== 0) {
    throw new Error(data.ResultMessage || ('PayPoint status check failed (code ' + data.ResultCode + ')'));
  }

  return data.ReturnObject;
}

// Transaction status codes per spec Appendix 4.1
const PAYPOINT_STATUS = {
  INITIALIZATION: 0,
  PROCESSING: 1,
  ERROR: 2,
  COMPLETED: 3,
  CANCEL: 4,
  REFUND: 5
};

module.exports = {
  getPaypointHosts,
  buildSignature,
  generateMerchantTrnId,
  registerTransaction,
  checkTransactionStatus,
  beginCreditCardCheckout,
  PAYPOINT_STATUS
};
