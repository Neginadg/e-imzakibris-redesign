const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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
		content
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
	if (!config || !config.smtpHost) {
		throw new Error('Missing SMTP host');
	}

	if (!config.mailFrom) {
		throw new Error('Missing mail from address');
	}

	if (!options || !options.to || !options.subject) {
		throw new Error('Missing email recipient or subject');
	}

	const transport = nodemailer.createTransport({
		host: config.smtpHost,
		port: Number(config.smtpPort) || 25,
		secure: Number(config.smtpPort) === 465,
		auth: config.smtpUser && config.smtpPass
			? {
					user: config.smtpUser,
					pass: config.smtpPass
				}
			: undefined
	});

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

	return transport.sendMail(payload);
}

module.exports = {
	buildHtmlSummary,
	toPlainText,
	sendEmail
};
