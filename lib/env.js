function requireEnv(name) {
  var value = process.env[name];
  if (!value) {
    throw new Error('Missing environment variable: ' + name);
  }
  return value;
}

function getRuntimeEnv(options) {
  var settings = options || {};
  var requireEmailConfig = settings.requireEmail !== false;

  var runtime = {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    mailFrom: '',
    companyEmail: '',
    customerAttachmentPath: process.env.CUSTOMER_ATTACHMENT_PATH || '',
    bankAccountDetails: process.env.BANK_ACCOUNT_DETAILS || '',
    paypointMerchantCode: process.env.PAYPOINT_MERCHANT_CODE || '',
    paypointMerchantUser: process.env.PAYPOINT_MERCHANT_USER || '',
    paypointSecretKey: process.env.PAYPOINT_SECRET_KEY || '',
    // 'test' (default, safe) or 'production'. Only switch once the test flow
    // has been verified end-to-end with PayPoint.
    paypointEnv: (process.env.PAYPOINT_ENV || 'test').trim().toLowerCase(),
    // Optional overrides in case PayPoint's documented hosts need correcting
    // once real testing starts (see deploy notes in lib/paypoint.js).
    paypointApiBaseUrl: (process.env.PAYPOINT_API_BASE_URL || '').trim(),
    paypointEcomBaseUrl: (process.env.PAYPOINT_ECOM_BASE_URL || '').trim()
  };

  if (requireEmailConfig) {
    runtime.smtpHost = requireEnv('SMTP_HOST').trim();
    runtime.smtpUser = requireEnv('SMTP_USER').trim();
    runtime.smtpPass = requireEnv('SMTP_PASS').trim();
    runtime.mailFrom = requireEnv('MAIL_FROM').trim();
    runtime.companyEmail = requireEnv('COMPANY_EMAIL').trim();
  } else {
    runtime.smtpHost = (process.env.SMTP_HOST || '').trim();
    runtime.smtpPort = parseInt((process.env.SMTP_PORT || '587').trim(), 10);
    runtime.smtpUser = (process.env.SMTP_USER || '').trim();
    runtime.smtpPass = (process.env.SMTP_PASS || '').trim();
    runtime.mailFrom = (process.env.MAIL_FROM || '').trim();
    runtime.companyEmail = (process.env.COMPANY_EMAIL || '').trim();
  }

  return runtime;
}

module.exports = {
  getRuntimeEnv
};