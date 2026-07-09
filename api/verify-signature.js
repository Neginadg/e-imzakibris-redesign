const { sendJson, readJsonBody } = require('../lib/http');

// DSS (Digital Signature Service) validation REST endpoint.
// Defaults to the EU DSS webapp-demo for testing.
// Set DSS_VALIDATION_URL env var in production to point to your own DSS instance.
const DSS_VALIDATE_URL =
  (process.env.DSS_VALIDATION_URL || '').trim() ||
  'https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/services/rest/validation/validateSignature';

function get(obj, ...keys) {
  for (const key of keys) {
    const val = obj && obj[key];
    if (val != null) return val;
  }
  return null;
}

// Message elements (Error/Warning) can serialize as plain strings or as
// { value, Key } objects depending on the DSS JAXB->JSON mapping.
function messageText(msg) {
  if (msg == null) return '';
  if (typeof msg === 'string') return msg;
  return get(msg, 'value', 'Value', '_') || '';
}

function collectMessages(...sources) {
  const out = [];
  sources.forEach(function (src) {
    if (src == null) return;
    const list = Array.isArray(src) ? src : [src];
    list.forEach(function (m) {
      const text = messageText(m);
      if (text) out.push(text);
    });
  });
  return out;
}

function parseSimpleReport(data) {
  const sr = get(data, 'SimpleReport', 'simpleReport');
  if (!sr) return null;

  const items = get(
    sr,
    'signatureOrTimestampOrEvidenceRecord',
    'SignatureOrTimestampOrEvidenceRecord',
    'signatureOrTimestamp',
    'SignatureOrTimestamp'
  ) || [];

  const signatures = items.map(function (item) {
    const sig = get(item, 'Signature', 'signature') || {};
    const level = get(sig, 'SignatureLevel', 'signatureLevel') || {};
    const adesDetails = get(sig, 'AdESValidationDetails', 'adESValidationDetails') || {};
    const qualDetails = get(sig, 'QualificationDetails', 'qualificationDetails') || {};

    const errors = collectMessages(
      get(sig, 'Errors', 'errors', 'Error', 'error'),
      get(adesDetails, 'Error', 'error'),
      get(qualDetails, 'Error', 'error')
    );
    const warnings = collectMessages(
      get(sig, 'Warnings', 'warnings', 'Warning', 'warning'),
      get(adesDetails, 'Warning', 'warning'),
      get(qualDetails, 'Warning', 'warning')
    );

    return {
      id: get(sig, 'Id', 'id') || '',
      format: get(sig, 'SignatureFormat', 'signatureFormat') || '',
      level: get(level, 'value', 'Value', '_') || '',
      levelDescription: get(level, 'description', 'Description') || '',
      signedBy: get(sig, 'SignedBy', 'signedBy') || '',
      bestSignatureTime: get(sig, 'BestSignatureTime', 'bestSignatureTime') || '',
      indication: get(sig, 'Indication', 'indication') || '',
      subIndication: get(sig, 'SubIndication', 'subIndication') || '',
      errors: errors,
      warnings: warnings
    };
  });

  return {
    validSignaturesCount: get(sr, 'ValidSignaturesCount', 'validSignaturesCount') || 0,
    signaturesCount: get(sr, 'SignaturesCount', 'signaturesCount') || 0,
    signatures
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = readJsonBody(req);

    if (!body.signedDocument || !body.signedDocument.bytes) {
      return sendJson(res, 400, { ok: false, error: 'İmzalı dosya eksik.' });
    }

    const dssRequest = {
      signedDocument: {
        bytes: body.signedDocument.bytes,
        name: body.signedDocument.name || 'document',
        digestAlgorithm: null
      },
      originalDocuments: Array.isArray(body.originalDocuments)
        ? body.originalDocuments.map(function (doc) {
            return { bytes: doc.bytes, name: doc.name || 'original', digestAlgorithm: null };
          })
        : [],
      policy: null,
      tokenExtractionStrategy: 'NONE',
      signatureId: null
    };

    const dssRes = await fetch(DSS_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(dssRequest)
    });

    if (!dssRes.ok) {
      const text = await dssRes.text().catch(function () { return String(dssRes.status); });
      throw new Error('Doğrulama servisi hatası (' + dssRes.status + '): ' + text);
    }

    const data = await dssRes.json();
    const report = parseSimpleReport(data);

    return sendJson(res, 200, { ok: true, report });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Sunucu hatası' });
  }
};
