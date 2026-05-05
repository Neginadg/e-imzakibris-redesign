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

function buildApplicationConfirmationEmail(data, appId) {
  var payload = data.payload || {};
  var now = new Date();
  var dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR');
  
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:800px;">';
  html += '<h2 style="color:#d11c1c;text-align:center;margin:20px 0;">e-imza Başvuru</h2>';
  
  // Application Info
  html += '<table style="width:100%;border-collapse:collapse;margin:20px 0;">';
  html += '<tr style="background:#f5f5f5;"><td style="padding:12px;border:1px solid #ddd;font-weight:600;width:40%;">Başvuru Numarası:</td><td style="padding:12px;border:1px solid #ddd;">' + escapeHtml(appId || '') + '</td></tr>';
  html += '<tr><td style="padding:12px;border:1px solid #ddd;font-weight:600;">Tarih:</td><td style="padding:12px;border:1px solid #ddd;">' + escapeHtml(dateStr) + '</td></tr>';
  html += '</table>';
  
  // Sales Amount (if available)
  if (payload.certificatePlan || payload.tokenAddon || payload.remoteSetup) {
    html += '<h3 style="margin:20px 0 10px;color:#333;">Satış Tutarı</h3>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    if (payload.certificatePlan) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Elektronik Sertifika:</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">' + escapeHtml(payload.certificatePlan) + ' TL</td></tr>';
    if (payload.tokenAddon) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Akıllı Çubuk:</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">' + escapeHtml(payload.tokenAddon) + ' TL</td></tr>';
    if (payload.remoteSetup) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Uzak Bağlantılı Kurulum:</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">' + escapeHtml(payload.remoteSetup) + ' TL</td></tr>';
    html += '</table>';
  }
  
  // Identity Information
  html += '<h3 style="margin:20px 0 10px;color:#333;">Kimlik Bilgisi</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Adı / Soyadı:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(data.full_name || '') + '</td></tr>';
  if (payload.nationality) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Uyruk:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.nationality) + '</td></tr>';
  if (payload.identityNumber) html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Pasaport/Kimlik No:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.identityNumber) + '</td></tr>';
  if (payload.birthDate) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Doğum Tarihi:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.birthDate) + '</td></tr>';
  if (payload.birthPlace) html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Doğum Yeri:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.birthPlace) + '</td></tr>';
  html += '</table>';
  
  // Contact Information
  html += '<h3 style="margin:20px 0 10px;color:#333;">İletişim Bilgisi</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  if (payload.company) html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Şirketi:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.company) + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">E-posta:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(data.email || '') + '</td></tr>';
  if (data.phone) html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Telefon:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(data.phone) + '</td></tr>';
  if (payload.address) html += '<tr><td style="padding:8px;border:1px solid #ddd;">Adres:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.address) + '</td></tr>';
  if (payload.region) html += '<tr style="background:#f5f5f5;"><td style="padding:8px;border:1px solid #ddd;">Bölge:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(payload.region) + '</td></tr>';
  html += '</table>';
  
  // Payment Method
  html += '<h3 style="margin:20px 0 10px;color:#333;">Ödeme Şekli</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">Ödeme Şekli:</td><td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(data.payment_method || 'Havale/EFT') + '</td></tr>';
  html += '</table>';
  
  html += '<p style="margin-top:30px;font-size:12px;color:#666;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen cevap vermeyin.</p>';
  html += '</div>';
  
  return html;
}

function buildApplicationPaymentEmail(appData, bankDetails) {
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:800px;">';
  html += '<h2 style="color:#d11c1c;text-align:center;margin:20px 0;">E-İMZA PAKETİNİZ</h2>';
  
  html += '<p>Sayın ' + escapeHtml(appData.full_name || '') + ',</p>';
  html += '<p>Elektronik imza paketiniz hazırdır. Ödeme şeklinize göre aşağıdaki bilgileri dikkatinize sunarız.</p>';
  
  // Payment Info
  if (appData.payment_method === 'Havale/EFT') {
    html += '<h3 style="color:#d11c1c;margin:20px 0 10px;">Havale/EFT Bilgileri:</h3>';
    html += '<pre style="background:#f5f5f5;padding:15px;border-left:4px solid #d11c1c;font-family:Arial,sans-serif;white-space:pre-wrap;">' + escapeHtml(bankDetails || 'Banka bilgileri silinmiştir.') + '</pre>';
  } else if (appData.payment_method === 'Teslimatta Ödeme') {
    html += '<h3 style="color:#d11c1c;margin:20px 0 10px;">Teslimatta Ödeme:</h3>';
    html += '<p>Ürün teslimi sırasında <strong>Nakit veya Kredi Kartı</strong> ile ödeme yapabilirsiniz.</p>';
    html += '<p><strong>Teslim Adresi:</strong></p>';
    html += '<p>Denizler Bilişim Hizmetleri Ltd. (e-imzaKIBRIS)<br/>Mehmet Ertuğruloğlu Sokak, NO:10, D-4<br/>Kumsal/Lefkoşa</p>';
  }
  
  html += '<p style="margin-top:30px;color:#666;"><strong>ÖNEMLİ NOT:</strong></p>';
  html += '<ul style="font-size:12px;color:#666;">';
  html += '<li>Elektronik imza tesliminde kimlik kontrolü yapılmaktadır. Lütfen kimlik kartınızı yanınıza almayı unutmayınız.</li>';
  html += '<li>Paket alındıktan sonra bilgisayar kurulumu için ek'deki dökümandan veya paket üzerindeki QR kodları okutarak bilgilendirici videolardan faydalanabilirsiniz.</li>';
  html += '<li>Herhangi bir sorunuz olması halinde telefonla veya online destek vereceğiz. GSM: 0548 8662279 (Whatsapp)</li>';
  html += '</ul>';
  
  html += '<p style="margin-top:30px;font-size:12px;color:#666;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen cevap vermeyin.</p>';
  html += '</div>';
  
  return html;
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
  sendEmail,
  buildApplicationConfirmationEmail,
  buildApplicationPaymentEmail
};