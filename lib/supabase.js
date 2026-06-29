function buildSupabaseHeaders(config, extraHeaders) {
  return Object.assign({
    apikey: config.supabaseServiceRoleKey,
    Authorization: 'Bearer ' + config.supabaseServiceRoleKey
  }, extraHeaders || {});
}

function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';

  var parts = [];
  Object.keys(params).forEach(function (key) {
    if (params[key] == null) return;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key])));
  });

  return parts.length ? ('?' + parts.join('&')) : '';
}

async function insertSupabaseRow(config, tableName, payload) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;

  var response = await fetch(endpoint, {
    method: 'POST',
    headers: buildSupabaseHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
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

async function selectSupabaseRows(config, tableName, params) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;
  var url = endpoint + buildQueryString(params);

  var response = await fetch(url, {
    method: 'GET',
    headers: buildSupabaseHeaders(config, {
      Accept: 'application/json'
    })
  });

  if (!response.ok) {
    var text = await response.text();
    throw new Error(text || ('Supabase select failed with status ' + response.status));
  }

  var data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function updateSupabaseRow(config, tableName, filter, payload) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;
  var url = endpoint + buildQueryString(filter);

  var response = await fetch(url, {
    method: 'PATCH',
    headers: buildSupabaseHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    var text = await response.text();
    throw new Error(text || ('Supabase update failed with status ' + response.status));
  }

  var data = await response.json();
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data;
}

async function deleteSupabaseRow(config, tableName, filter) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + tableName;
  var url = endpoint + buildQueryString(filter);

  var response = await fetch(url, {
    method: 'DELETE',
    headers: buildSupabaseHeaders(config)
  });

  if (!response.ok) {
    var text = await response.text();
    throw new Error(text || ('Supabase delete failed with status ' + response.status));
  }

  return true;
}

async function uploadSupabaseFile(config, bucketName, filePath, buffer, contentType) {
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') +
    '/storage/v1/object/' + encodeURIComponent(bucketName) + '/' + filePath;

  var response = await fetch(endpoint, {
    method: 'POST',
    headers: buildSupabaseHeaders(config, {
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true'
    }),
    body: buffer
  });

  if (!response.ok) {
    var text = await response.text();
    throw new Error(text || ('Supabase storage upload failed with status ' + response.status));
  }

  return await response.json();
}

async function deleteSupabaseFile(config, bucketName, filePaths) {
  var paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  var endpoint = config.supabaseUrl.replace(/\/+$/, '') +
    '/storage/v1/object/' + encodeURIComponent(bucketName);

  var response = await fetch(endpoint, {
    method: 'DELETE',
    headers: buildSupabaseHeaders(config, {
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ prefixes: paths })
  });

  if (!response.ok) {
    var text = await response.text();
    throw new Error(text || ('Supabase storage delete failed with status ' + response.status));
  }

  return true;
}

module.exports = {
  insertSupabaseRow,
  selectSupabaseRows,
  updateSupabaseRow,
  deleteSupabaseRow,
  uploadSupabaseFile,
  deleteSupabaseFile
};