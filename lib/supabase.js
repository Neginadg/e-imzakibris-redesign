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
    throw new Error(text || ('Supabase insert failed with status ' + response.status));
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