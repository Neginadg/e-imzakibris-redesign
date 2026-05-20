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

async function selectSupabaseRows(config, tableName, queryParams) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;
  var url = new URL(endpoint);
  var params = queryParams || {};

  Object.keys(params).forEach(function (key) {
    var value = params[key];
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  var response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: 'Bearer ' + config.supabaseServiceRoleKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    var text = await response.text();
    var message = text || ('Supabase select failed with status ' + response.status);
    throw new Error(message);
  }

  var data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function updateSupabaseRow(config, tableName, filters, payload) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;
  var url = new URL(endpoint);
  var query = filters || {};

  Object.keys(query).forEach(function (key) {
    var value = query[key];
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, 'eq.' + String(value));
  });

  var response = await fetch(url.toString(), {
    method: 'PATCH',
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

    var message = details && details.message
      ? details.message
      : (text || ('Supabase update failed with status ' + response.status));
    throw new Error(message);
  }

  var data = await response.json();
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data;
}

module.exports = {
  insertSupabaseRow,
  selectSupabaseRows,
  updateSupabaseRow
};