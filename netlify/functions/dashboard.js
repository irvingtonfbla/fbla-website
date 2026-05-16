const { getStore } = require('@netlify/blobs');

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

  const store = getStore('fbla-dashboard');

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
