function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, function (char) { return char.toUpperCase(); });
}

function toHtmlRows(input, prefix) {
  var rows = [];
  var entries = Object.entries(input || {});

  entries.forEach(function (entry) {
    var key = entry[0];
    var value = entry[1];
    var label = prefix ? prefix + ' - ' + formatLabel(key) : formatLabel(key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      rows = rows.concat(toHtmlRows(value, label));
      return;
    }

    var printable = Array.isArray(value) ? value.join(', ') : value;
    rows.push('<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">' + escapeHtml(label) + '</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(printable == null ? '' : printable) + '</td></tr>');
  });

  return rows;
}

function buildHtmlSummary(data, title) {
  var rows = toHtmlRows(data, '');
  return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;">'
    + '<h2 style="margin:0 0 12px;">' + escapeHtml(title) + '</h2>'
    + '<table style="border-collapse:collapse;width:100%;max-width:760px;">'
    + rows.join('')
    + '</table>'
    + '</div>';
}

function toPlainText(input, prefix, output) {
  var result = output || [];
  Object.entries(input || {}).forEach(function (entry) {
    var key = entry[0];
    var value = entry[1];
    var label = prefix ? prefix + ' - ' + formatLabel(key) : formatLabel(key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      toPlainText(value, label, result);
      return;
    }

    var printable = Array.isArray(value) ? value.join(', ') : value;
    result.push(label + ': ' + (printable == null ? '' : String(printable)));
  });
  return result;
}

async function sendEmail(config, message) {
  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.resendApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.mailFrom,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  var payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    var details = payload && payload.message ? payload.message : 'Email send failed';
    throw new Error(details);
  }

  return payload;
}

module.exports = {
  buildHtmlSummary,
  toPlainText,
  sendEmail
};
