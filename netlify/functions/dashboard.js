const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

// Local file store — used when Netlify Blobs isn't configured (local dev without netlify link)
function createLocalStore(storeName) {
  const dir = path.join(process.cwd(), '.netlify', 'blobs-local', storeName);
  return {
    get: async (key, opts) => {
      const file = path.join(dir, `${key}.json`);
      try {
        if (!fs.existsSync(file)) return null;
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return opts && opts.type === 'json' ? data : JSON.stringify(data);
      } catch { return null; }
    },
    setJSON: async (key, value) => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2));
    },
    delete: async (key) => {
      const file = path.join(dir, `${key}.json`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    },
  };
}

function getStoreForEnv(name) {
  try {
    const s = getStore(name);
    // probe that it's actually configured (throws if not)
    if (!process.env.NETLIFY_BLOBS_CONTEXT && !process.env.NETLIFY_LOCAL_BLOBS_PATH) {
      // check env vars Blobs needs
      if (!process.env.SITE_ID && !process.env.NETLIFY_SITE_ID) throw new Error('no siteID');
    }
    return s;
  } catch {
    if (process.env.NETLIFY_DEV) console.log('[blobs] using local file store (run `netlify link` for real Blobs)');
    return createLocalStore(name);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const RESOURCES = ['minutes', 'tasks', 'strikes', 'events', 'awards', 'roster'];

function checkAuth(event) {
  const auth = event.headers.authorization || '';
  const pw = auth.replace('Bearer ', '');
  return pw && pw === process.env.ADMIN_PASSWORD;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function read(store, key) {
  try {
    const data = await store.get(key, { type: 'json' });
    return data ?? { items: [] };
  } catch {
    return { items: [] };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS };
  }

  const params = event.queryStringParameters || {};
  const resource = params.resource;

  if (!resource || !RESOURCES.includes(resource)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Valid resource parameter required: ' + RESOURCES.join(', ') }),
    };
  }

  // Awards GET is public (for the public awards page)
  const isPublicRead = resource === 'awards' && event.httpMethod === 'GET';

  if (!isPublicRead && !checkAuth(event)) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const store = getStoreForEnv('fbla-dashboard');

  try {
    // GET — list all items
    if (event.httpMethod === 'GET') {
      const data = await read(store, resource);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    }

    // POST — create item
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const data = await read(store, resource);
      const item = { ...body, id: genId(), createdAt: new Date().toISOString() };
      data.items.push(item);
      await store.setJSON(resource, data);
      return { statusCode: 201, headers: CORS, body: JSON.stringify(item) };
    }

    // PUT — update item
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...updates } = body;
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };
      const data = await read(store, resource);
      const idx = data.items.findIndex((x) => x.id === id);
      if (idx === -1) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Not found' }) };
      data.items[idx] = { ...data.items[idx], ...updates, updatedAt: new Date().toISOString() };
      await store.setJSON(resource, data);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data.items[idx]) };
    }

    // DELETE — remove item
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };
      const data = await read(store, resource);
      data.items = data.items.filter((x) => x.id !== id);
      await store.setJSON(resource, data);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('[dashboard]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
