#!/usr/bin/env python3
"""
Biology Professor Survey — Python Backend
Zero dependencies — uses only Python standard library.
Railway detects Python automatically, no config needed.

Start:  python server.py
Port:   reads PORT env var (Railway sets this automatically)
"""

import http.server
import json
import os
import re
import sqlite3
import hashlib
import secrets
import threading
import time
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
PORT        = int(os.environ.get('PORT', 3000))
DB_PATH     = os.path.join(os.path.dirname(__file__), 'survey.db')
SESSION_TTL = 4 * 60 * 60  # 4 hours in seconds
SALT        = 'bio_survey_salt_2025'

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
db_lock = threading.Lock()

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS responses (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                created TEXT NOT NULL DEFAULT (datetime('now')),
                data    TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token   TEXT PRIMARY KEY,
                expires INTEGER NOT NULL
            );
        """)
        # Seed default password if not set
        existing = conn.execute(
            "SELECT value FROM settings WHERE key='admin_password'"
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO settings (key,value) VALUES ('admin_password',?)",
                (hash_password('Botany0988'),)
            )
        conn.commit()

def hash_password(pw):
    return hashlib.sha256((pw + SALT).encode()).hexdigest()

# ─────────────────────────────────────────────
# SESSIONS
# ─────────────────────────────────────────────
def create_session():
    token   = secrets.token_hex(32)
    expires = int(time.time()) + SESSION_TTL
    with db_lock:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO sessions (token,expires) VALUES (?,?)",
                (token, expires)
            )
            conn.commit()
    return token

def validate_session(token):
    if not token:
        return False
    with db_lock:
        with get_db() as conn:
            row = conn.execute(
                "SELECT expires FROM sessions WHERE token=?", (token,)
            ).fetchone()
            if not row:
                return False
            if int(time.time()) > row['expires']:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
                conn.commit()
                return False
    return True

def destroy_session(token):
    with db_lock:
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            conn.commit()

def get_session_token(handler):
    cookie = handler.headers.get('Cookie', '')
    m = re.search(r'survey_session=([a-f0-9]+)', cookie)
    return m.group(1) if m else None

# Periodic session cleanup
def cleanup_sessions():
    while True:
        time.sleep(3600)
        with db_lock:
            with get_db() as conn:
                conn.execute("DELETE FROM sessions WHERE expires<?", (int(time.time()),))
                conn.commit()

threading.Thread(target=cleanup_sessions, daemon=True).start()

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def send_json(handler, status, obj):
    body = json.dumps(obj).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Content-Length', len(body))
    handler.end_headers()
    handler.wfile.write(body)

def read_body(handler):
    length = int(handler.headers.get('Content-Length', 0))
    if length == 0:
        return {}
    try:
        return json.loads(handler.rfile.read(length))
    except Exception:
        return {}

def serve_file(handler, path):
    try:
        with open(path, 'rb') as f:
            data = f.read()
        handler.send_response(200)
        handler.send_header('Content-Type', 'text/html; charset=utf-8')
        handler.send_header('Content-Length', len(data))
        handler.end_headers()
        handler.wfile.write(data)
    except FileNotFoundError:
        send_json(handler, 404, {'error': 'Not found'})

# ─────────────────────────────────────────────
# REQUEST HANDLER
# ─────────────────────────────────────────────
class SurveyHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Clean up Railway logs
        print(f"  {self.address_string()} {fmt % args}")

    def do_GET(self):
        path = urlparse(self.path).path

        # Serve frontend
        if path in ('/', '/index.html'):
            return serve_file(self, os.path.join(
                os.path.dirname(__file__), 'public', 'index.html'
            ))

        # Admin: requires auth
        token = get_session_token(self)
        if path.startswith('/api/admin/') and not validate_session(token):
            return send_json(self, 401, {'error': 'Unauthorized'})

        # Aggregate stats
        if path == '/api/admin/aggregate':
            return self.handle_aggregate()

        # List responses (summary)
        if path == '/api/admin/responses':
            return self.handle_list_responses()

        # Single response
        m = re.match(r'^/api/admin/responses/(\d+)$', path)
        if m:
            return self.handle_get_response(int(m.group(1)))

        # Export JSON
        if path == '/api/admin/export':
            return self.handle_export()

        send_json(self, 404, {'error': 'Not found'})

    def do_POST(self):
        path = urlparse(self.path).path
        body = read_body(self)

        # Submit survey (public)
        if path == '/api/responses':
            return self.handle_submit_response(body)

        # Admin login (public)
        if path == '/api/admin/login':
            return self.handle_login(body)

        # Admin logout
        if path == '/api/admin/logout':
            token = get_session_token(self)
            if token:
                destroy_session(token)
            self.send_response(200)
            self.send_header('Set-Cookie',
                'survey_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        # Auth required for everything below
        token = get_session_token(self)
        if not validate_session(token):
            return send_json(self, 401, {'error': 'Unauthorized'})

        # Change password
        if path == '/api/admin/password':
            return self.handle_change_password(body)

        send_json(self, 404, {'error': 'Not found'})

    def do_DELETE(self):
        path = urlparse(self.path).path
        token = get_session_token(self)
        if not validate_session(token):
            return send_json(self, 401, {'error': 'Unauthorized'})

        # Delete all responses
        if path == '/api/admin/responses':
            with db_lock:
                with get_db() as conn:
                    conn.execute("DELETE FROM responses")
                    conn.commit()
            return send_json(self, 200, {'ok': True})

        # Delete one response
        m = re.match(r'^/api/admin/responses/(\d+)$', path)
        if m:
            with db_lock:
                with get_db() as conn:
                    conn.execute("DELETE FROM responses WHERE id=?",
                                 (int(m.group(1)),))
                    conn.commit()
            return send_json(self, 200, {'ok': True})

        send_json(self, 404, {'error': 'Not found'})

    # ── Route handlers ───────────────────────

    def handle_submit_response(self, body):
        if not isinstance(body, dict):
            return send_json(self, 400, {'error': 'Invalid payload'})
        with db_lock:
            with get_db() as conn:
                cur = conn.execute(
                    "INSERT INTO responses (data) VALUES (?)",
                    (json.dumps(body),)
                )
                conn.commit()
                row_id = cur.lastrowid
        send_json(self, 201, {'ok': True, 'id': row_id})

    def handle_login(self, body):
        pw     = body.get('password', '')
        with get_db() as conn:
            row = conn.execute(
                "SELECT value FROM settings WHERE key='admin_password'"
            ).fetchone()
        if row and hash_password(pw) == row['value']:
            token = create_session()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Set-Cookie',
                f'survey_session={token}; HttpOnly; SameSite=Strict; '
                f'Path=/; Max-Age={SESSION_TTL}')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        else:
            send_json(self, 401, {'error': 'Invalid password'})

    def handle_list_responses(self):
        with get_db() as conn:
            rows = conn.execute(
                "SELECT id,created,data FROM responses ORDER BY id DESC"
            ).fetchall()
        summaries = []
        for r in rows:
            try:
                d = json.loads(r['data'])
            except Exception:
                d = {}
            summaries.append({
                'id':      r['id'],
                'created': r['created'],
                'q1':      d.get('q1', ''),
                'q3':      d.get('q3', ''),
                'q61':     d.get('q61', ''),
            })
        send_json(self, 200, summaries)

    def handle_get_response(self, rid):
        with get_db() as conn:
            row = conn.execute(
                "SELECT id,created,data FROM responses WHERE id=?", (rid,)
            ).fetchone()
        if not row:
            return send_json(self, 404, {'error': 'Not found'})
        try:
            d = json.loads(row['data'])
        except Exception:
            d = {}
        send_json(self, 200, {'id': row['id'], 'created': row['created'], 'data': d})

    def handle_aggregate(self):
        with get_db() as conn:
            rows = conn.execute("SELECT data FROM responses").fetchall()

        all_data = []
        for r in rows:
            try:
                all_data.append(json.loads(r['data']))
            except Exception:
                pass

        def tally(key, options):
            counts = {o: 0 for o in options}
            for d in all_data:
                v = d.get(key)
                if v and v in counts:
                    counts[v] += 1
            return counts

        prep_scores = []
        for d in all_data:
            try:
                v = float(d.get('q61', ''))
                if 1 <= v <= 10:
                    prep_scores.append(v)
            except (TypeError, ValueError):
                pass

        avg_prep = (
            f"{sum(prep_scores)/len(prep_scores):.1f}"
            if prep_scores else None
        )

        trend_opts = [
            'Students have become noticeably more prepared',
            'Students have become somewhat more prepared',
            'Preparedness has remained about the same',
            'Students have become somewhat less prepared',
            'Students have become noticeably less prepared',
        ]
        trend_counts = tally('q7', trend_opts)
        top_trend = max(trend_counts.items(), key=lambda x: x[1]) \
            if any(trend_counts.values()) else None

        ai_detect_opts = [
            'Yes, routinely for all submitted work',
            'Yes, selectively when I have reason to suspect AI use',
            'No, but I am considering it',
            'No, and I do not plan to use AI detection tools',
            'My institution prohibits or discourages third-party AI detection tools',
        ]
        ai_detect_counts = tally('q58', ai_detect_opts)
        detect_yes = (
            ai_detect_counts.get('Yes, routinely for all submitted work', 0) +
            ai_detect_counts.get('Yes, selectively when I have reason to suspect AI use', 0)
        )
        detect_pct = round(detect_yes / len(all_data) * 100) if all_data else None

        charts = {
            'q1': tally('q1', [
                'R1/R2 Doctoral University (high or very high research activity)',
                "Master's University",
                'Liberal Arts College / Baccalaureate College',
                'Community College or Two-Year Institution',
                'Other',
            ]),
            'q6':  tally('q6',  ['1','2','3','4','5']),
            'q7':  trend_counts,
            'q25': tally('q25', [
                'AP Biology students demonstrate noticeably stronger critical thinking skills',
                'AP Biology students demonstrate somewhat stronger critical thinking skills',
                'There is no consistent difference between the two groups',
                'AP Biology students demonstrate somewhat weaker critical thinking in some areas',
                'AP Biology students demonstrate noticeably weaker critical thinking in some areas',
                'I have not observed a pattern I am confident about',
            ]),
            'q43': tally('q43', [
                'Students are more likely to use AI to immediately find answers rather than working through problems',
                'Students use AI as a study aid in productive ways (e.g., concept explanation, practice problems)',
                'I see both productive and unproductive AI use in roughly equal measure',
                'AI use does not appear to significantly affect how students study',
                'I do not have enough information to assess this',
            ]),
            'q54': tally('q54', [
                'Yes, students may retake full major exams',
                'Yes, but only certain portions or selected questions',
                'Yes, in certain circumstances (e.g., documented illness or emergency only)',
                'No, major exams are not retaken but other work can substitute for a low score',
                'No, major exams cannot be retaken or replaced under any circumstance',
            ]),
            'q58': ai_detect_counts,
        }

        send_json(self, 200, {
            'total':         len(all_data),
            'avgPrep':       avg_prep,
            'prepScores':    prep_scores,
            'charts':        charts,
            'detectYesPct':  detect_pct,
            'topTrend':      list(top_trend) if top_trend else None,
        })

    def handle_change_password(self, body):
        curr    = body.get('current', '')
        new_pw  = body.get('newPassword', '')
        confirm = body.get('confirm', '')
        with get_db() as conn:
            row = conn.execute(
                "SELECT value FROM settings WHERE key='admin_password'"
            ).fetchone()
        if not row or hash_password(curr) != row['value']:
            return send_json(self, 400, {'error': 'Current password is incorrect.'})
        if len(new_pw) < 6:
            return send_json(self, 400, {'error': 'New password must be at least 6 characters.'})
        if new_pw != confirm:
            return send_json(self, 400, {'error': 'New passwords do not match.'})
        with db_lock:
            with get_db() as conn:
                conn.execute(
                    "UPDATE settings SET value=? WHERE key='admin_password'",
                    (hash_password(new_pw),)
                )
                conn.commit()
        send_json(self, 200, {'ok': True})

    def handle_export(self):
        with get_db() as conn:
            rows = conn.execute(
                "SELECT id,created,data FROM responses ORDER BY id ASC"
            ).fetchall()
        out = []
        for r in rows:
            try:
                d = json.loads(r['data'])
            except Exception:
                d = {}
            out.append({'id': r['id'], 'created': r['created'], **d})
        body = json.dumps(out, indent=2).encode()
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Disposition',
            f'attachment; filename="biology_survey_export_{date_str}.json"')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), SurveyHandler)
    print(f"\n  Biology Survey Server running at http://0.0.0.0:{PORT}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
