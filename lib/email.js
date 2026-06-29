const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
	return String(value == null ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatValue(value) {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value, null, 2);
}

function flattenFields(source, prefix) {
	const entries = [];

	Object.keys(source || {}).forEach((key) => {
		const value = source[key];
		const label = prefix ? `${prefix}.${key}` : key;

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			entries.push(...flattenFields(value, label));
			return;
		}

		entries.push([label, formatValue(value)]);
	});

	return entries;
}

function buildHtmlSummary(data, title) {
	const fields = flattenFields(data || {});

	const rows = fields.map(([label, value]) => {
		return `<tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;vertical-align:top;background:#f9fafb;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:10px 12px;border:1px solid #e5e7eb;vertical-align:top;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`;
	}).join('');

	return [
		'<div style="font-family:Arial,sans-serif;background:#ffffff;color:#1f2937;line-height:1.5;">',
		`<h2 style="margin:0 0 16px;font-size:20px;">${escapeHtml(title || 'Form Submission')}</h2>`,
		'<table style="width:100%;border-collapse:collapse;font-size:14px;">',
		rows || '<tr><td style="padding:10px 12px;border:1px solid #e5e7eb;" colspan="2">No data provided</td></tr>',
		'</table>',
		'</div>'
	].join('');
}

function toPlainText(data) {
	const fields = flattenFields(data || {});

	if (!fields.length) {
		return ['No data provided'];
	}

	return fields.map(([label, value]) => `${label}: ${value}`);
}

function resolveAttachmentPath(attachmentPath) {
	if (!attachmentPath) return null;

	return path.isAbsolute(attachmentPath)
		? attachmentPath
		: path.resolve(process.cwd(), attachmentPath);
}

function buildAttachmentFromPath(attachmentPath) {
	const resolvedPath = resolveAttachmentPath(attachmentPath);
	if (!resolvedPath) return null;

	if (!fs.existsSync(resolvedPath)) {
		throw new Error('Attachment file not found: ' + attachmentPath);
	}

	const content = fs.readFileSync(resolvedPath);

	return {
		filename: path.basename(resolvedPath),
		content: content.toString('base64')
	};
}

function normalizeAttachments(options) {
	const attachments = [];

	if (options.attachmentPath) {
		attachments.push(buildAttachmentFromPath(options.attachmentPath));
	}

	if (Array.isArray(options.attachments)) {
		options.attachments.forEach((attachment) => {
			if (!attachment) return;

			if (attachment.path) {
				attachments.push(buildAttachmentFromPath(attachment.path));
				return;
			}

			if (attachment.content && attachment.filename) {
				attachments.push({
					filename: attachment.filename,
					content: attachment.content
				});
			}
		});
	}

	return attachments.filter(Boolean);
}

async function sendEmail(config, options) {
	if (!config || !config.resendApiKey) {
		throw new Error('Missing Resend API key');
	}

	if (!config.mailFrom) {
		throw new Error('Missing mail from address');
	}

	if (!options || !options.to || !options.subject) {
		throw new Error('Missing email recipient or subject');
	}

	const payload = {
		from: config.mailFrom,
		to: options.to,
		subject: options.subject,
		html: options.html || '',
		text: options.text || ''
	};

	const attachments = normalizeAttachments(options);
	if (attachments.length) {
		payload.attachments = attachments;
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: 'Bearer ' + config.resendApiKey,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});

	const responseText = await response.text();
	let responseBody = null;

	try {
		responseBody = responseText ? JSON.parse(responseText) : null;
	} catch (error) {
		responseBody = null;
	}

	if (!response.ok) {
		const message = responseBody && responseBody.message
			? responseBody.message
			: (responseText || 'Resend email request failed');
		throw new Error(message);
	}

	return responseBody || {};
}

// ─── Customer confirmation email ──────────────────────────────────────────────

const CONFIRM_FIELD_LABELS = {
  fullName: 'Ad Soyad',
  nationality: 'Uyruk',
  identityNumber: 'Kimlik / Pasaport No',
  birthDate: 'Doğum Tarihi',
  birthPlace: 'Doğum Yeri',
  professionalRegistryNo: 'Mesleki Sicil No',
  email: 'E-posta',
  phone: 'Sabit Telefon',
  mobilePhone: 'Cep Telefonu',
  company: 'Şirket / Kurum',
  jobTitle: 'Görev / Unvan',
  address: 'Adres',
  region: 'Bölge',
  invoiceType: 'Fatura Tipi',
  invoiceCompany: 'Fatura Şirketi',
  invoiceAddress: 'Fatura Adresi',
  invoiceRegion: 'Fatura Bölgesi',
  taxNumber: 'Vergi No',
  taxOffice: 'Vergi Dairesi',
  planLabel: 'Seçilen Plan',
  paymentMethod: 'Ödeme Yöntemi',
  certificatePrice: 'Sertifika Ücreti',
  tokenPrice: 'Token / Akıllı Çubuk Ücreti',
  setupPrice: 'Kurulum Ücreti',
  subtotal: 'Ara Toplam',
  kdvAmount: 'KDV (%20)',
  total: 'Toplam (KDV Dahil)',
  showEmailOnCertificate: 'Sertifikada E-posta Göster',
  publicDirectoryConsent: 'Kamu Dizini Onayı',
  notes: 'Notlar / Ek Bilgi',
};

const CONFIRM_SKIP = new Set([
  'source_page', 'admin_codes', 'privacyConsent', 'invoiceSameAsContact',
]);

function flattenConfirmPairs(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const pairs = [];
  Object.keys(obj).forEach(function (key) {
    if (CONFIRM_SKIP.has(key)) return;
    const value = obj[key];
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      flattenConfirmPairs(value).forEach(function (p) { pairs.push(p); });
      return;
    }
    const str = value == null ? '' : String(value);
    if (str === '' || str === '-' || str === 'false') return;
    const label = CONFIRM_FIELD_LABELS[key] || key;
    pairs.push({ label, value: str === 'true' ? 'Evet' : str });
  });
  return pairs;
}

function buildCustomerConfirmationHtml(data) {
  const fullName = escapeHtml(data.full_name || data.fullName || '');
  const pairs = flattenConfirmPairs(
    Object.assign({}, data.payload || {})
  );

  const rows = pairs.map(function (p) {
    return '<tr>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:42%;vertical-align:top;white-space:nowrap;">' +
        escapeHtml(p.label) +
      '</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;color:#1f2937;vertical-align:top;">' +
        escapeHtml(p.value) +
      '</td>' +
    '</tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">' +

    // Header
    '<tr><td style="background:#0f172a;padding:28px 36px;">' +
    '<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">e-İmza Kıbrıs</h1>' +
    '<p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Nitelikli Elektronik Sertifika Hizmetleri</p>' +
    '</td></tr>' +

    // Body
    '<tr><td style="padding:36px 36px 0;">' +
    '<p style="margin:0 0 8px;font-size:16px;color:#1f2937;">Sayın <strong>' + fullName + '</strong>,</p>' +
    '<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">E-İmza başvurunuz için teşekkür ederiz. Başvurunuzu başarıyla aldık ve ekibimiz işleminizi incelemeye başlamıştır.</p>' +
    '<p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#0f172a;">Gönderdiğiniz bilgilerin özeti:</p>' +
    '</td></tr>' +

    // Table
    '<tr><td style="padding:0 36px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:14px;">' +
    (rows || '<tr><td colspan="2" style="padding:12px;color:#6b7280;">Bilgi bulunamadı.</td></tr>') +
    '</table>' +
    '</td></tr>' +

    // Closing
    '<tr><td style="padding:28px 36px 36px;">' +
    '<p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 16px;border-radius:4px;">' +
    'Başvurunuz ekibimize iletildi. Elektronik imzanız hazır olduğunda sizi <strong>e-posta</strong> ile bilgilendireceğiz.' +
    '</p>' +
    '<p style="margin:0;font-size:14px;color:#374151;">Hizmetimizi tercih ettiğiniz için teşekkür ederiz.</p>' +
    '<p style="margin:16px 0 0;font-size:14px;color:#374151;font-weight:600;">e-İmza Kıbrıs Ekibi</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:18px 36px;">' +
    '<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">' +
    'e-İmza Kıbrıs &nbsp;|&nbsp; info@e-imzakibris.com &nbsp;|&nbsp; +90 (539) 120 51 15<br/>' +
    'Bu e-posta, başvurunuzun alındığını onaylamak amacıyla otomatik olarak gönderilmiştir.' +
    '</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>';
}

function buildCustomerConfirmationText(data) {
  const fullName = data.full_name || data.fullName || '';
  const pairs = flattenConfirmPairs(Object.assign({}, data.payload || {}));
  const lines = [
    'Sayın ' + fullName + ',',
    '',
    'E-İmza başvurunuz için teşekkür ederiz.',
    'Başvurunuzu başarıyla aldık ve ekibimiz işleminizi incelemeye başlamıştır.',
    '',
    'Gönderdiğiniz bilgilerin özeti:',
    '─────────────────────────────────',
  ];
  pairs.forEach(function (p) {
    lines.push(p.label + ': ' + p.value);
  });
  lines.push('─────────────────────────────────');
  lines.push('');
  lines.push('Başvurunuz ekibimize iletildi. Elektronik imzanız hazır olduğunda sizi e-posta ile bilgilendireceğiz.');
  lines.push('');
  lines.push('Hizmetimizi tercih ettiğiniz için teşekkür ederiz.');
  lines.push('e-İmza Kıbrıs Ekibi');
  return lines.join('\n');
}

module.exports = {
	buildHtmlSummary,
	toPlainText,
	sendEmail,
	buildCustomerConfirmationHtml,
	buildCustomerConfirmationText,
};
