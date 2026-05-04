async function insertSupabaseRow(config, tableName, payload) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;

  var response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: 'Bearer ' + config.supabaseServiceRoleKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    var text = await response.text();
    var details = null;
    try {
      details = text ? JSON.parse(text) : null;
    } catch (error) {
      details = null;
    }

    if (details && details.code === '42501') {
      throw new Error('Supabase RLS blocked insert. Check Vercel SUPABASE_SERVICE_ROLE_KEY and use the service_role secret key (not anon/publishable key).');
    }

    var message = details && details.message
      ? details.message
      : (text || ('Supabase insert failed with status ' + response.status));
    throw new Error(message);
  }

  var data = await response.json();
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data;
}

module.exports = {
  insertSupabaseRow
};