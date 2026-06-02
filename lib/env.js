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
    smtpPort: 0,
    smtpUser: '',
    smtpPass: '',
    mailFrom: '',
    companyEmail: '',
    customerAttachmentPath: process.env.CUSTOMER_ATTACHMENT_PATH || '',
    bankAccountDetails: process.env.BANK_ACCOUNT_DETAILS || ''
  };

  if (requireEmailConfig) {
    runtime.smtpHost = requireEnv('SMTP_HOST');
    runtime.smtpPort = Number(requireEnv('SMTP_PORT'));
    runtime.smtpUser = requireEnv('SMTP_USER');
    runtime.smtpPass = requireEnv('SMTP_PASS');
    runtime.mailFrom = requireEnv('MAIL_FROM');
    runtime.companyEmail = requireEnv('COMPANY_EMAIL');
  } else {
    runtime.smtpHost = process.env.SMTP_HOST || '';
    runtime.smtpPort = Number(process.env.SMTP_PORT || 0);
    runtime.smtpUser = process.env.SMTP_USER || '';
    runtime.smtpPass = process.env.SMTP_PASS || '';
    runtime.mailFrom = process.env.MAIL_FROM || '';
    runtime.companyEmail = process.env.COMPANY_EMAIL || '';
  }

  return runtime;
}

module.exports = {
  getRuntimeEnv
};