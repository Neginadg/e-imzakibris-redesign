function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function readJsonBody(req) {
  if (req.body == null) return {};

  // Vercel leaves the body as a raw Buffer for content-types it doesn't
  // recognize (e.g. multipart/form-data) — `typeof` a Buffer is 'object',
  // so without this check it would silently pass through as if it were
  // already-parsed fields, and every property read off it would be
  // undefined. Callers that may receive multipart bodies should use
  // readFormFields instead.
  if (Buffer.isBuffer(req.body)) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch (error) {
      return {};
    }
  }

  if (typeof req.body === 'object') {
    return req.body;
  }

  return {};
}

function getMultipartBoundary(contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType || ''));
  if (!match) return null;
  return (match[1] || match[2] || '').trim();
}

// Minimal multipart/form-data parser for simple key/value fields (no file
// uploads expected from PayPoint's callback). Not a general-purpose parser.
function parseMultipartFields(raw, boundary) {
  const fields = {};
  if (!raw || !boundary) return fields;

  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  const marker = '--' + boundary;

  text.split(marker).forEach((segment) => {
    const part = segment.replace(/^\r\n/, '');
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const headers = part.slice(0, headerEnd);
    const nameMatch = /name="([^"]+)"/i.exec(headers);
    if (!nameMatch) return;

    const value = part.slice(headerEnd + 4).replace(/\r\n$/, '');
    fields[nameMatch[1]] = value;
  });

  return fields;
}

// Reads request fields regardless of whether the caller sent JSON,
// application/x-www-form-urlencoded, or multipart/form-data — needed for
// PayPoint's callback, whose actual content-type is only loosely documented
// as "form-data". Vercel auto-parses the first two into req.body already;
// for multipart it leaves req.body as a raw Buffer, which we parse here.
function readFormFields(req) {
  const contentType = (req.headers && (req.headers['content-type'] || req.headers['Content-Type'])) || '';
  if (/multipart\/form-data/i.test(contentType) && Buffer.isBuffer(req.body)) {
    return parseMultipartFields(req.body, getMultipartBoundary(contentType));
  }
  return readJsonBody(req);
}

module.exports = {
  sendJson,
  readJsonBody,
  readFormFields
};