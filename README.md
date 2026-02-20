# Biology Professor Survey — Server Edition
## Requirements
- Node.js v22 or higher (uses built-in `node:sqlite` — no npm install needed)

## Setup & Start

```bash
# Navigate to this folder
cd survey-server

# Start the server
node server.js

# The survey will be live at:
#   http://localhost:3000
```

To run on a different port:
```bash
PORT=8080 node server.js
```

## Files
```
survey-server/
├── server.js          ← Backend (Node.js, built-in modules only)
├── survey.db          ← SQLite database (auto-created on first run)
├── README.md
└── public/
    └── index.html     ← Frontend (served by the server)
```

## Admin Access
- Visit the site and click **Administrator Login** (bottom-right corner)
- Default password: **Botany0988**
- Change your password from the Settings tab in the admin portal

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Serves the survey frontend |
| POST | `/api/responses` | No | Submit a survey response |
| POST | `/api/admin/login` | No | Authenticate (sets session cookie) |
| POST | `/api/admin/logout` | Yes | End session |
| GET | `/api/admin/aggregate` | Yes | Aggregate stats for dashboard |
| GET | `/api/admin/responses` | Yes | List all responses (summary) |
| GET | `/api/admin/responses/:id` | Yes | Full response by ID |
| DELETE | `/api/admin/responses/:id` | Yes | Delete one response |
| DELETE | `/api/admin/responses` | Yes | Delete all responses |
| POST | `/api/admin/password` | Yes | Change admin password |
| GET | `/api/admin/export` | Yes | Download all responses as JSON |

## Deploying to the Public Internet

### Option A — Railway (free tier, easiest)
1. Create a free account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`
3. From this folder run: `railway login && railway up`
4. Railway will give you a public URL automatically.

### Option B — Render (free tier)
1. Push this folder to a GitHub repository
2. Create a new "Web Service" at https://render.com
3. Set Start Command to: `node server.js`
4. Set Node version to 22 in environment variables: `NODE_VERSION=22`

### Option C — VPS (DigitalOcean, Linode, etc.)
```bash
# On your server:
node server.js &

# Or use pm2 to keep it running:
npm install -g pm2
pm2 start server.js --name biology-survey
pm2 save
pm2 startup
```

### HTTPS / Custom Domain
For production, place the server behind a reverse proxy like **nginx** or **Caddy**
that handles SSL termination. Both have free, auto-renewing Let's Encrypt support.

Example Caddy config (`/etc/caddy/Caddyfile`):
```
yoursurvey.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Data Backup
Responses are stored in `survey.db` (SQLite). Back this file up regularly.
You can also download a JSON export any time from the admin Settings tab.

## Security Notes
- Sessions expire after 4 hours of inactivity
- Passwords are stored as SHA-256 hashes (salted)
- The admin session uses HttpOnly, SameSite=Strict cookies
- For production, add HTTPS (see above) — never send passwords over plain HTTP
