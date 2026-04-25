const REPO_OWNER = 'irvingtonfbla';
const REPO_NAME = 'fbla-website';
const FILE_PATH = 'src/data/redirects.json';
const BRANCH = 'main';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Verify the officer password
function checkAuth(event) {
  const authHeader = event.headers.authorization || '';
  const password = authHeader.replace('Bearer ', '');
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return false;
  }
  return true;
}

// Get the redirects file from GitHub
async function getFile() {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'irvingtonfbla-admin',
      },
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to fetch redirects file');
  }
  const data = await res.json();
  const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(decoded), sha: data.sha };
}

// Update the redirects file on GitHub
async function updateFile(newContent, sha, message) {
  const token = process.env.GITHUB_TOKEN;
  const encoded = Buffer.from(JSON.stringify(newContent, null, 2) + '\n').toString('base64');
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'irvingtonfbla-admin',
      },
      body: JSON.stringify({
        message,
        content: encoded,
        sha,
        branch: BRANCH,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to update file');
  }
  return res.json();
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Check password
  if (!checkAuth(event)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid password' }),
    };
  }

  try {
    // GET — list all links
    if (event.httpMethod === 'GET') {
      const { content } = await getFile();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(content),
      };
    }

    // POST — create a new link
    if (event.httpMethod === 'POST') {
      const { slug, url } = JSON.parse(event.body);

      if (!slug || !url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Both slug and url are required' }),
        };
      }

      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
        };
      }

      const { content, sha } = await getFile();

      if (content[slug]) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: `The slug "${slug}" already exists` }),
        };
      }

      content[slug] = url;
      await updateFile(content, sha, `Add redirect: /${slug}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, slug, url }),
      };
    }

    // DELETE — remove a link
    if (event.httpMethod === 'DELETE') {
      const { slug } = JSON.parse(event.body);

      if (!slug) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Slug is required' }),
        };
      }

      const { content, sha } = await getFile();

      if (!content[slug]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `No link found with slug "${slug}"` }),
        };
      }

      delete content[slug];
      await updateFile(content, sha, `Remove redirect: /${slug}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
