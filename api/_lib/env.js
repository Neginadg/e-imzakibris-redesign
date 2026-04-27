function requireEnv(name) {
  var value = process.env[name];
  if (!value) {
    throw new Error('Missing environment variable: ' + name);
  }
  return value;
}

function getRuntimeEnv() {
  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    resendApiKey: requireEnv('RESEND_API_KEY'),
    mailFrom: requireEnv('MAIL_FROM'),
    companyEmail: requireEnv('COMPANY_EMAIL'),
    bankAccountDetails: process.env.BANK_ACCOUNT_DETAILS || ''
  };
}

module.exports = {
  getRuntimeEnv
};
