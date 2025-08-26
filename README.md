# Vibha Net — Auth v0

Minimal, global phone+password authentication. Deterministic, idempotent, privacy‑minimal.

## Quickstart (dev)
```bash
# Prereqs: Node 20+, PostgreSQL 14+, Git
git clone https://github.com/manjulsinghal1410/vyaapar.git
cd vyaapar

# Install deps
npm install

# Configure env (copy/paste into .env)
# See "Environment" below

# Run dev server
npm run dev
```

## Environment
Create `.env` in repo root:
```env
# Server
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/vibhanet_auth

# Sessions
SESSION_TTL_DAYS=14

# Argon2id (library defaults are fine; override if needed)
ARGON2_MEMORY_MB=64
ARGON2_ITERATIONS=2
ARGON2_PARALLELISM=1
```

## Database
Apply schema using **PRD §4** SQL (users, sessions). Example:
```bash
psql "$DATABASE_URL" -f schema.sql
```

## Runbook (dev)
- `npm run dev` — start API (hot reload)
- `npm test` — run unit/integration/acceptance suites (when added)
- `npm run lint` / `npm run format` — code hygiene

## API (from PRD §3)
`/auth/signup` → create user + session  
`/auth/login`  → login + session  
`/auth/logout` → revoke session

### cURL examples
```bash
# Sign up
curl -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+447700900123","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+447700900123","password":"secret123"}' \
  -c cookies.txt -b cookies.txt

# Logout
curl -X POST http://localhost:3000/auth/logout -b cookies.txt -c cookies.txt -i
```

## Features
✓ **Phone + Password Auth** - Simple, secure authentication  
✓ **Global Phone Support** - E.164 format, 20+ countries  
✓ **Country Dropdown UI** - Easy phone number entry  
✓ **Session Management** - Secure HttpOnly cookies  
✓ **Rate Limiting** - Prevents abuse (signup: 3/min, login: 10/min)  
✓ **Account Lockout** - Security after 6 failed attempts  
✓ **Password Security** - Argon2id hashing with secure defaults  
✓ **Structured Logging** - Full telemetry and metrics  

## Testing & Non‑Regression
See **PRD §9** for the definitive acceptance criteria. All functionality has been tested and verified working.

## Project Docs Map
- **PRD:** `./PRD.md` (source of truth)
- **Planning (AI):** `./CLAUDE.md` (guardrails & loop)

## Tech Stack
- **Backend:** Node.js + Express 4 + TypeScript
- **Database:** PostgreSQL
- **Security:** Argon2id, HttpOnly cookies, rate limiting
- **Phone Validation:** libphonenumber-js

## Notes
- Global phone support: accept + normalize any valid E.164
- Sessions: opaque server‑side; cookie is HttpOnly, Secure, SameSite=Lax
- Keep v0 intentionally simple: no OTP, no password reset