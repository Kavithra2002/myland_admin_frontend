import fs from 'fs';
import path from 'path';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function loadReviews(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.reviews || [];
  } catch {
    return [];
  }
}

function saveReviews(file, reviews) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ reviews }, null, 2)}\n`);
}

function attach(server, reviewsFile) {
  server.middlewares.use(async (req, res, next) => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];
    const match = pathname.match(/^\/api\/reviews(?:\/([^/?]+))?$/);
    if (!match) return next();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const id = match[1];
    let reviews = loadReviews(reviewsFile);

    try {
      if (req.method === 'GET' && !id) {
        const url = new URL(rawUrl, 'http://localhost');
        const project = url.searchParams.get('project');
        const status = url.searchParams.get('status');
        let result = reviews;
        if (project) result = result.filter((item) => item.projectSlug === project);
        if (status) result = result.filter((item) => item.status === status);
        result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        json(res, 200, { reviews: result });
        return;
      }

      if (req.method === 'POST' && !id) {
        const body = await readBody(req);
        const name = String(body.name || '').trim();
        const message = String(body.message || '').trim();
        const rating = Number(body.rating);
        const projectSlug = String(body.projectSlug || '').trim();
        const projectTitle = String(body.projectTitle || '').trim();

        if (!name || name.length < 2) {
          json(res, 400, { message: 'Please enter your name.' });
          return;
        }
        if (!message || message.length < 8) {
          json(res, 400, { message: 'Please write a slightly longer review.' });
          return;
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          json(res, 400, { message: 'Please choose a rating from 1 to 5.' });
          return;
        }
        if (!projectSlug) {
          json(res, 400, { message: 'Project is required.' });
          return;
        }

        const review = {
          id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          projectSlug,
          projectTitle: projectTitle || projectSlug,
          name,
          message,
          rating,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        reviews.unshift(review);
        saveReviews(reviewsFile, reviews);
        json(res, 201, { review });
        return;
      }

      if (req.method === 'PATCH' && id) {
        const body = await readBody(req);
        const nextStatus = body.status;
        if (!['approved', 'rejected', 'pending'].includes(nextStatus)) {
          json(res, 400, { message: 'Invalid status.' });
          return;
        }
        const index = reviews.findIndex((item) => item.id === id);
        if (index === -1) {
          json(res, 404, { message: 'Review not found.' });
          return;
        }
        reviews[index] = {
          ...reviews[index],
          status: nextStatus,
          moderatedAt: new Date().toISOString(),
        };
        saveReviews(reviewsFile, reviews);
        json(res, 200, { review: reviews[index] });
        return;
      }

      if (req.method === 'DELETE' && id) {
        const next = reviews.filter((item) => item.id !== id);
        if (next.length === reviews.length) {
          json(res, 404, { message: 'Review not found.' });
          return;
        }
        saveReviews(reviewsFile, next);
        json(res, 200, { ok: true });
        return;
      }

      json(res, 405, { message: 'Method not allowed' });
    } catch (err) {
      json(res, 500, { message: err.message || 'Review API error' });
    }
  });
}

export function reviewApiPlugin(reviewsFile) {
  return {
    name: 'review-api',
    configureServer(server) {
      attach(server, reviewsFile);
    },
    configurePreviewServer(server) {
      attach(server, reviewsFile);
    },
  };
}
