/**
 * Biology Professor Survey — Backend Server
 * Uses only Node.js built-in modules (Node 22+):
 *   http, fs, path, crypto, url, node:sqlite
 *
 * Start:  node server.js
 * Default port: 3000  (set PORT env var to change)
 */

'use strict';

const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const { URL }    = require('url');
const { DatabaseSync } = require('node:sqlite');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const PORT        = process.env.PORT || 3000;
const DB_PATH     = path.join(__dirname, 'survey.db');
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours in ms

// ─────────────────────────────────────────────
// DATABASE SETUP
// ─────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS responses (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    created   TEXT NOT NULL DEFAULT (datetime('now')),
    data      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token     TEXT PRIMARY KEY,
    expires   INTEGER NOT NULL
  );
`);

// Seed default password hash if not present
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'bio_survey_salt_2025').digest('hex');
}

const existingPw = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
if (!existingPw) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").run(hashPassword('Botany0988'));
}

// ─────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────
function createSession() {
  const token   = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_TTL;
  db.prepare("INSERT INTO sessions (token, expires) VALUES (?, ?)").run(token, expires);
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const row = db.prepare("SELECT expires FROM sessions WHERE token = ?").get(token);
  if (!row) return false;
  if (Date.now() > row.expires) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function getSessionToken(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/survey_session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

// Clean up expired sessions periodically
setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
}, 60 * 60 * 1000);

// ─────────────────────────────────────────────
// STATIC FILE HELPER
// ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { json(res, 404, { error: 'Not found' }); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ─────────────────────────────────────────────
// JSON HELPERS
// ─────────────────────────────────────────────
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2e6) req.destroy(); });
    req.on('end',  () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname  = parsedUrl.pathname;
  const method    = req.method;

  // CORS headers (allow same-origin; adjust if hosting on separate domain)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // ── Serve frontend ──────────────────────────
  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    return serveFile(res, path.join(__dirname, 'public', 'index.html'));
  }

  // ── API routes ──────────────────────────────

  // POST /api/responses — submit a survey response (public)
  if (method === 'POST' && pathname === '/api/responses') {
    const body = await readBody(req);
    if (!body || typeof body !== 'object') {
      return json(res, 400, { error: 'Invalid payload' });
    }
    const stmt = db.prepare("INSERT INTO responses (data) VALUES (?)");
    const info = stmt.run(JSON.stringify(body));
    return json(res, 201, { ok: true, id: info.lastInsertRowid });
  }

  // POST /api/admin/login — authenticate
  if (method === 'POST' && pathname === '/api/admin/login') {
    const body = await readBody(req);
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    if (stored && hashPassword(body.password || '') === stored.value) {
      const token = createSession();
      res.setHeader('Set-Cookie', `survey_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}`);
      return json(res, 200, { ok: true });
    }
    return json(res, 401, { error: 'Invalid password' });
  }

  // POST /api/admin/logout
  if (method === 'POST' && pathname === '/api/admin/logout') {
    const token = getSessionToken(req);
    if (token) destroySession(token);
    res.setHeader('Set-Cookie', 'survey_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  // ── All routes below require auth ──────────
  const token = getSessionToken(req);
  if (pathname.startsWith('/api/admin/') && !validateSession(token)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  // GET /api/admin/responses — list all responses (summary)
  if (method === 'GET' && pathname === '/api/admin/responses') {
    const rows = db.prepare("SELECT id, created, data FROM responses ORDER BY id DESC").all();
    const summaries = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.data); } catch {}
      return {
        id:      r.id,
        created: r.created,
        q1:      d.q1  || '',
        q3:      d.q3  || '',
        q61:     d.q61 || '',
      };
    });
    return json(res, 200, summaries);
  }

  // GET /api/admin/responses/:id — full response
  if (method === 'GET' && pathname.match(/^\/api\/admin\/responses\/\d+$/)) {
    const id  = parseInt(pathname.split('/').pop(), 10);
    const row = db.prepare("SELECT id, created, data FROM responses WHERE id = ?").get(id);
    if (!row) return json(res, 404, { error: 'Not found' });
    let d = {};
    try { d = JSON.parse(row.data); } catch {}
    return json(res, 200, { id: row.id, created: row.created, data: d });
  }

  // DELETE /api/admin/responses/:id
  if (method === 'DELETE' && pathname.match(/^\/api\/admin\/responses\/\d+$/)) {
    const id = parseInt(pathname.split('/').pop(), 10);
    db.prepare("DELETE FROM responses WHERE id = ?").run(id);
    return json(res, 200, { ok: true });
  }

  // DELETE /api/admin/responses — delete all
  if (method === 'DELETE' && pathname === '/api/admin/responses') {
    db.prepare("DELETE FROM responses").run();
    return json(res, 200, { ok: true });
  }

  // GET /api/admin/aggregate — computed stats for dashboard
  if (method === 'GET' && pathname === '/api/admin/aggregate') {
    const rows = db.prepare("SELECT data FROM responses").all();
    const allData = rows.map(r => { try { return JSON.parse(r.data); } catch { return {}; } });

    function tally(key, options) {
      const counts = {};
      options.forEach(o => counts[o] = 0);
      allData.forEach(d => {
        const v = d[key];
        if (v && counts[v] !== undefined) counts[v]++;
      });
      return counts;
    }

    const prepScores = allData.map(d => parseFloat(d.q61)).filter(v => !isNaN(v) && v >= 1 && v <= 10);
    const avgPrep    = prepScores.length ? (prepScores.reduce((a,b)=>a+b,0)/prepScores.length) : null;

    const trendCounts = tally('q7', [
      'Students have become noticeably more prepared',
      'Students have become somewhat more prepared',
      'Preparedness has remained about the same',
      'Students have become somewhat less prepared',
      'Students have become noticeably less prepared',
    ]);

    const aiDetectCounts = tally('q58', [
      'Yes, routinely for all submitted work',
      'Yes, selectively when I have reason to suspect AI use',
      'No, but I am considering it',
      'No, and I do not plan to use AI detection tools',
      'My institution prohibits or discourages third-party AI detection tools',
    ]);

    const detectYes = (aiDetectCounts['Yes, routinely for all submitted work'] || 0) +
                      (aiDetectCounts['Yes, selectively when I have reason to suspect AI use'] || 0);

    return json(res, 200, {
      total:    allData.length,
      avgPrep:  avgPrep ? avgPrep.toFixed(1) : null,
      prepScores,
      charts: {
        q1:  tally('q1',  ['R1/R2 Doctoral University (high or very high research activity)','Master\'s University','Liberal Arts College / Baccalaureate College','Community College or Two-Year Institution','Other']),
        q6:  tally('q6',  ['1','2','3','4','5']),
        q7:  trendCounts,
        q25: tally('q25', ['AP Biology students demonstrate noticeably stronger critical thinking skills','AP Biology students demonstrate somewhat stronger critical thinking skills','There is no consistent difference between the two groups','AP Biology students demonstrate somewhat weaker critical thinking in some areas','AP Biology students demonstrate noticeably weaker critical thinking in some areas','I have not observed a pattern I am confident about']),
        q43: tally('q43', ['Students are more likely to use AI to immediately find answers rather than working through problems','Students use AI as a study aid in productive ways (e.g., concept explanation, practice problems)','I see both productive and unproductive AI use in roughly equal measure','AI use does not appear to significantly affect how students study','I do not have enough information to assess this']),
        q54: tally('q54', ['Yes, students may retake full major exams','Yes, but only certain portions or selected questions','Yes, in certain circumstances (e.g., documented illness or emergency only)','No, major exams are not retaken but other work can substitute for a low score','No, major exams cannot be retaken or replaced under any circumstance']),
        q58: aiDetectCounts,
      },
      detectYesPct: allData.length > 0 ? Math.round(detectYes / allData.length * 100) : null,
      topTrend: Object.entries(trendCounts).sort((a,b)=>b[1]-a[1])[0] || null,
    });
  }

  // POST /api/admin/password — change password
  if (method === 'POST' && pathname === '/api/admin/password') {
    const body = await readBody(req);
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    if (!stored || hashPassword(body.current || '') !== stored.value) {
      return json(res, 400, { error: 'Current password is incorrect.' });
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      return json(res, 400, { error: 'New password must be at least 6 characters.' });
    }
    if (body.newPassword !== body.confirm) {
      return json(res, 400, { error: 'New passwords do not match.' });
    }
    db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(hashPassword(body.newPassword));
    return json(res, 200, { ok: true });
  }

  // GET /api/admin/export — download all responses as JSON
  if (method === 'GET' && pathname === '/api/admin/export') {
    const rows = db.prepare("SELECT id, created, data FROM responses ORDER BY id ASC").all();
    const out  = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.data); } catch {}
      return { id: r.id, created: r.created, ...d };
    });
    const body = JSON.stringify(out, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="biology_survey_export_${new Date().toISOString().split('T')[0]}.json"`,
      'Content-Length': Buffer.byteLength(body),
    });
    return res.end(body);
  }

  // 404 fallback
  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n  Biology Survey Server running at http://localhost:${PORT}\n`);
});
