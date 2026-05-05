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
  var dateStr = ('0' + now.getDate()).slice(-2) + '.' + ('0' + (now.getMonth() + 1)).slice(-2) + '.' + now.getFullYear() + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">';
  html += '<div style="max-width:900px;margin:0 auto;">';
  
  // Greeting message
  html += '<div style="background:#f5f5f5;padding:15px;margin-bottom:20px;border-left:4px solid #d11c1c;">';
  html += '<p>Sayın ' + escapeHtml(data.full_name || '') + ', e-imza SATIN ALMA talebiniz alınmıştır. Ekibimiz sizinle iletişim kuracaktır. e-imza KIBRIS</p>';
  html += '</div>';
  
  // Main title
  html += '<h2 style="color:#d11c1c;text-align:center;margin:30px 0 20px;">e-imza Başvuru</h2>';
  
  // Application Info (2 column layout)
  html += '<table style="width:100%;border-collapse:collapse;margin:20px 0;">';
  html += '<tr style="background:#f0f0f0;">';
  html += '<td style="padding:10px;border:1px solid #ccc;font-weight:600;width:50%;">Başvuru Numarası:</td>';
  html += '<td style="padding:10px;border:1px solid #ccc;width:50%;">' + escapeHtml(appId || 'N/A') + '</td>';
  html += '<td style="padding:10px;border:1px solid #ccc;font-weight:600;width:50%;">Tarih:</td>';
  html += '<td style="padding:10px;border:1px solid #ccc;width:50%;">' + escapeHtml(dateStr) + '</td>';
  html += '</tr></table>';
  
  // Sales Amount - Only if prices exist
  if (payload.certificatePlan || payload.tokenAddon || payload.remoteSetup || payload.totalPrice) {
    html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">Satış Tutarı</h3>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    if (payload.certificatePlan) {
      html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Elektronik Sertifika:</td><td style="padding:10px;border:1px solid #ccc;text-align:right;">' + escapeHtml(payload.certificatePlan) + '</td></tr>';
    }
    if (payload.tokenAddon) {
      html += '<tr><td style="padding:10px;border:1px solid #ccc;">Akıllı Çubuk:</td><td style="padding:10px;border:1px solid #ccc;text-align:right;">' + escapeHtml(payload.tokenAddon) + '</td></tr>';
    }
    if (payload.remoteSetup) {
      html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Uzak Bağlantılı Kurulum:</td><td style="padding:10px;border:1px solid #ccc;text-align:right;">' + escapeHtml(payload.remoteSetup) + '</td></tr>';
    }
    if (payload.totalPrice) {
      html += '<tr style="background:#f0f0f0;"><td style="padding:10px;border:1px solid #ccc;font-weight:600;">KDV DAHİL TOPLAM TUTAR:</td><td style="padding:10px;border:1px solid #ccc;text-align:right;font-weight:600;">' + escapeHtml(payload.totalPrice) + '</td></tr>';
    }
    html += '</table>';
  }
  
  // Package Details
  if (payload.certificateType || payload.tokenIncluded || payload.installationIncluded) {
    html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">e-imza Paketi</h3>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    if (payload.certificateType) {
      html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Nitelikli Elektronik Sertifika:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.certificateType) + '</td></tr>';
    }
    if (payload.tokenIncluded !== undefined) {
      html += '<tr><td style="padding:10px;border:1px solid #ccc;">Akıllı Çubuk:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.tokenIncluded ? 'var' : 'yok') + '</td></tr>';
    }
    if (payload.installationIncluded !== undefined) {
      html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Adresinizde Kurulum:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.installationIncluded ? 'var' : 'yok') + '</td></tr>';
    }
    html += '</table>';
  }
  
  // Identity Information
  html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">Kimlik Bilgisi</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Adı / Soyadı:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(data.full_name || '') + '</td></tr>';
  if (payload.nationality) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Uyruk:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.nationality) + '</td></tr>';
  if (payload.identityNumber) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Pasaport No:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.identityNumber) + '</td></tr>';
  if (payload.birthDate) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Doğum Tarihi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.birthDate) + '</td></tr>';
  if (payload.birthPlace) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Doğum Yeri:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.birthPlace) + '</td></tr>';
  if (payload.professionalRegistryNo) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Mesleki Sicil No:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.professionalRegistryNo) + '</td></tr>';
  html += '</table>';
  
  // Contact & Delivery Information
  html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">İletişim ve Teslimat Bilgisi</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  if (payload.company) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Şirketi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.company) + '</td></tr>';
  if (payload.jobTitle) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Görevi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.jobTitle) + '</td></tr>';
  html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">E-posta Adresi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(data.email || '') + '</td></tr>';
  if (payload.showEmailOnCertificate !== undefined) html += '<tr><td style="padding:10px;border:1px solid #ccc;">E-posta adresinin sertifikada gösterilmesi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.showEmailOnCertificate ? 'istiyorum' : 'istemiyorum') + '</td></tr>';
  if (payload.address) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Adres:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.address) + '</td></tr>';
  if (payload.region) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Bölge:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.region) + '</td></tr>';
  if (data.phone) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Telefon Numarası:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(data.phone) + '</td></tr>';
  html += '</table>';
  
  // Invoice Information  
  if (payload.invoiceCompany || payload.invoiceAddress || payload.taxNumber) {
    html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">Fatura Bilgisi</h3>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    if (payload.invoiceCompany) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Çalıştığı Kurum:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.invoiceCompany) + '</td></tr>';
    if (payload.invoiceAddress) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Adres:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.invoiceAddress) + '</td></tr>';
    if (payload.invoiceRegion) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Bölge:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.invoiceRegion) + '</td></tr>';
    if (payload.taxNumber) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Vergi Numarası:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.taxNumber) + '</td></tr>';
    if (payload.taxOffice) html += '<tr style="background:#f9f9f9;"><td style="padding:10px;border:1px solid #ccc;">Vergi Dairesi:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.taxOffice) + '</td></tr>';
    if (payload.invoiceType) html += '<tr><td style="padding:10px;border:1px solid #ccc;">Fatura Türü:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(payload.invoiceType) + '</td></tr>';
    html += '</table>';
  }
  
  // Payment Method
  html += '<h3 style="margin:25px 0 12px;color:#333;font-size:15px;">Ödeme Şekli</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr><td style="padding:10px;border:1px solid #ccc;font-weight:600;">Ödeme Şekli:</td><td style="padding:10px;border:1px solid #ccc;">' + escapeHtml(data.payment_method || 'Havale/EFT') + '</td></tr>';
  html += '</table>';
  
  html += '</div></body></html>';
  
  return html;
}

function buildApplicationPaymentEmail(appData, bankDetails) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">';
  html += '<div style="max-width:800px;margin:0 auto;">';
  
  // Title
  html += '<h1 style="color:#d11c1c;text-align:center;margin:30px 0 20px;font-size:20px;">E-İMZA PAKETİNİZ</h1>';
  
  // Greeting
  var payload = appData.payload || {};
  var planText = payload.certificateType || '1 YILLIK';
  html += '<p>Merhaba, ' + escapeHtml(planText) + '</p>';
  
  // Message
  html += '<p>Elektronik imza paketiniz hazırdır. Ek\'de Kurulum ve Kullanım Klavuzları ile e-faturanız bulunmaktadır.</p>';
  html += '<p>Mesai saatleri içerisinde (08:30-13.00 / 14.00-17:00), Aşağıdaki adresten alabilirsiniz.</p>';
  
  // Total Amount (If available)
  if (payload.totalPrice) {
    html += '<div style="background:#ffffdd;padding:12px;border:2px solid #d11c1c;margin:20px 0;text-align:center;">';
    html += '<p style="margin:0;color:#d11c1c;font-weight:600;font-size:16px;">Toplam fatura tutarı: ' + escapeHtml(payload.totalPrice) + '</p>';
    html += '</div>';
  }
  
  // Payment Instructions
  if (appData.payment_method === 'Havale/EFT') {
    html += '<p style="color:#d11c1c;font-weight:600;margin:20px 0 10px;">Havale için:</p>';
    html += '<p style="margin:5px 0;">Denizler Bilişim Hizmetleri Limited</p>';
    html += '<p style="margin:5px 0;">Türkiye Garanti Bankası Lefkoşa Şubesi</p>';
    html += '<p style="margin:5px 0;"><strong>//IBAN TR34 0006 2000 4930 0006 2946 90//</strong></p>';
  } else if (appData.payment_method === 'Teslimatta Ödeme') {
    html += '<p style="color:#d11c1c;font-weight:600;margin:20px 0 10px;">Teslimatta Ödeme:</p>';
    html += '<p>Nakit veya Kredi Kartı ile Ofisimize</p>';
    html += '<p style="margin:15px 0;"><strong>Adres:</strong> Mehmet Ertuğruloğlu Sokak, NO:10, D-4 Kumsal/Lefkoşa</p>';
    html += '<p style="margin:15px 0;"><strong>Denizler Bilişim Hizmetleri Ltd. (e-imzaKIBRIS)</strong></p>';
    html += '<p style="margin:15px 0;">Konum: <a href="https://goo.gl/maps/xPmo64X3WG9Lm4yXA">https://goo.gl/maps/xPmo64X3WG9Lm4yXA</a></p>';
  } else if (bankDetails) {
    html += '<p style="color:#d11c1c;font-weight:600;margin:20px 0 10px;">Ödeme Bilgileri:</p>';
    html += '<pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;">' + escapeHtml(bankDetails) + '</pre>';
  }
  
  // Fatura Section
  html += '<h2 style="color:#d11c1c;margin:30px 0 15px;font-size:16px;">FATURA</h2>';
  html += '<p><strong>Değerli Müşterimiz,</strong></p>';
  html += '<p>Şirketimizden aldığınız hizmet alımına ilişkin hazırlanmış olan e-faturayı ekte dikkatinize sunarız.</p>';
  html += '<p>Denizler Bilişim Hizmetleri Limited olarak e-fatura mükellefi olduğumuz için tüm fatura gönderimleri elektronik ortamda yapılmakta olup, ayrıca fiziki / basılı fatura gönderimi yapılmamaktadır.</p>';
  
  // Setup Instructions
  html += '<h3 style="margin:20px 0 10px;font-size:14px;">Paket aldıktan sonra bilgisayar kurulumu için;</h3>';
  html += '<p>Ek\'deki dökümandan VEYA paket üzerindeki QR kodları okutarak bilgilendirici videolardan faydalanabilirsiniz.</p>';
  
  // Support Info
  html += '<h3 style="margin:20px 0 10px;font-size:14px;">İhtiyacınız olması halinde</h3>';
  html += '<p>Telefoniyen veya online destek vereceğiz.</p>';
  html += '<p><strong>GSM: 0548 8662279 Whatsapp</strong></p>';
  
  // Important Notes
  html += '<h3 style="color:#d11c1c;margin:25px 0 15px;font-size:14px;">ÖNEMLİ NOT:</h3>';
  html += '<ul style="margin:0;padding-left:20px;">';
  html += '<li style="margin:8px 0;">Elektronik imza tesliminde kimlik kontrolü yapılmaktadır, lütfen kimlik kartınızı yanınıza almayı unutmayınız.</li>';
  html += '<li style="margin:8px 0;">Eğer imzanız bir başkası tarafından teslim alınacaksa, lütfen yetki verdiğiniz kişiyi bize bildiriniz.</li>';
  html += '</ul>';
  
  // Footer
  html += '<div style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#666;">';
  html += '<p><strong>e-imza KIBRIS</strong></p>';
  html += '<p>Mehmet Ertuğruloğlu Sokak, NO:10, D-4 Kumsal/Lefkoşa/Kuzey Kıbrıs</p>';
  html += '<p>TEL: 0090 392 2280960</p>';
  html += '<p><a href="mailto:satis@e-imzakibris.com">satis@e-imzakibris.com</a></p>';
  html += '<p><em>Save a tree... Please do not print this e-mail unless you really need to.</em></p>';
  html += '</div>';
  
  html += '</div></body></html>';
  
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