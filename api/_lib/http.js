function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function readJsonBody(req) {
  if (req.body == null) return {};

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

module.exports = {
  sendJson,
  readJsonBody
};
