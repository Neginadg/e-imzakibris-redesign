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
    resendApiKey: '',
    mailFrom: '',
    companyEmail: '',
    bankAccountDetails: process.env.BANK_ACCOUNT_DETAILS || ''
  };

  if (requireEmailConfig) {
    runtime.resendApiKey = requireEnv('RESEND_API_KEY');
    runtime.mailFrom = requireEnv('MAIL_FROM');
    runtime.companyEmail = requireEnv('COMPANY_EMAIL');
  } else {
    runtime.resendApiKey = process.env.RESEND_API_KEY || '';
    runtime.mailFrom = process.env.MAIL_FROM || '';
    runtime.companyEmail = process.env.COMPANY_EMAIL || '';
  }

  return runtime;
}

module.exports = {
  getRuntimeEnv
};