# Auth v0 — Phone+Password (MVP‑min) — PRD
**Owner:** Manjul • **Status:** Draft v0 • **Last updated:** 2025-08-22

## Purpose
Deliver the most basic, reliable account creation and login using phone number + password only. End‑to‑end: UI → API → DB. No OTP, no KYC, no over‑engineering.

**Principles:** Simplicity • Idempotency • Determinism • Privacy‑minimal • No regression

---

## 1) Scope

**In‑scope (v0):**
- Sign‑up with phone (E.164) + password
- Login with phone + password
- Session creation & logout
- Basic rate limiting and account lockout
- Minimal analytics/telemetry

**Out‑of‑scope (v0):**
- OTP / WhatsApp / email
- Password reset / change
- Social auth / device binding
- KYC, profile fields beyond phone

**Assumptions:**
- Single environment; Postgres available; HTTPS enforced by platform.

---

## 2) UX spec (minimal)

### 2.1 First screen: Login
- **Fields:** Phone number (with country code, E.164 — accepts spaces/dashes, will normalize), Password (masked)
- **Placeholder examples:** +12025550123, +447700900123, +919876543210
- **Primary action:** Log in
- **Secondary text link:** Create account
- **Errors:**
  - Invalid phone format → "Enter a valid phone number with country code, e.g., +12025550123 / +447700900123 / +919876543210"
  - Wrong password → "Phone or password is incorrect."
  - Account locked → "Too many attempts. Try again in 15 minutes."

### 2.2 Create account screen
- **Fields:** Phone number (with country code), Password, Confirm password
- **Primary action:** Create account
- **Success:** redirect to app home (autologin) or show "Account created" then Continue
- **Errors:**
  - Phone already registered → "That phone number already has an account."
  - Weak password → "Use 8+ characters."

**Accessibility:** Labels associated, large tap targets, disable button while submitting.

---

## 3) API contracts (stable)

**Base path:** `/auth`

### 3.1 POST /auth/signup
**Request**
```json
{ "phone": "+12025550123", "password": "string >= 8" }
```
**Responses**
- 201 Created → `{ "userId": "uuid" }` and sets session cookie
- 409 Conflict if phone exists
- 400 Bad Request invalid input

**Idempotency:** Sign‑up is idempotent by phone. A retried request after creation returns 409.

### 3.2 POST /auth/login
**Request**
```json
{ "phone": "+91…", "password": "…" }
```
**Responses**
- 200 OK and sets session cookie
- 401 Unauthorized invalid credentials
- 423 Locked if account is in lockout window

### 3.3 POST /auth/logout
**Request:** none  
**Response:** 204 No Content; clears session cookie.

**Cookie:** `Set-Cookie: sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600 (14 days)`

---

## 4) Data model (PostgreSQL)
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  password_hash bytea not null,
  failed_login_count int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  password_updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index on sessions(user_id);
```

---

## 5) Security & validation (minimal, sane)
- **Password hashing:** Argon2id (memory=64MB, iterations=2, parallelism=1). Library‑default salt per hash.
- **Validation:**
  - **Global phone support:** Accept any valid E.164 number worldwide. Parse/validate with libphonenumber (or equivalent). Input may contain spaces/dashes; normalize and store canonical E.164 (e.g., +12025550123).
  - **Reject:** numbers without a leading +, numbers with extensions (e.g., `;ext=123`), short codes, or regionally invalid lengths → 400.
  - **Password:** min length 8; no complexity rules (keep simple).
  - **Uniqueness:** Enforced on canonical `phone_e164` only.
- **Rate limits:**
  - Login attempts: 10/min per IP; 5/min per phone.
  - Sign‑up: 3/min per IP.
  - Lockout: After 6 failed logins in 10 minutes → lock 15 minutes (`locked_until`).
- **Sessions:** Opaque ID stored server‑side; cookie is HttpOnly+Secure.
- **Transport:** HTTPS required; HSTS by platform.

---

## 6) Backend design
- **Runtime:** Single service (Node.js + Express or NestJS) behind HTTPS.
- **Persistence:** PostgreSQL for users and sessions.
- **Caching:** None (v0).
- **Observability:** Structured logs; counters for signups/logins/lockouts; basic traces optional.
- **Config:** `DATABASE_URL`, `SESSION_TTL_DAYS` (default 14), `ARGON2_PARAMS`.

---

## 7) Flows

### 7.1 Sign‑up
1. Validate payload → normalize phone to E.164.
2. `insert into users(...)` with unique phone; on conflict → 409.
3. Hash password with Argon2id; store `password_hash`.
4. Create session row (`expires_at = now() + interval '14 days'`).
5. Set cookie; respond 201.

### 7.2 Login
1. Validate → fetch user by phone.
2. If `locked_until > now()` → 423.
3. Verify password.
4. On success: reset `failed_login_count`, `locked_until = null`; create session; set cookie; 200.
5. On failure: increment `failed_login_count`; if threshold reached set `locked_until`; 401/423.

### 7.3 Logout
1. Read cookie → revoke session (`revoked_at = now()`); clear cookie; 204.

---

## 8) Telemetry (minimal)
- `auth.signup.success`, `auth.signup.conflict`
- `auth.login.success`, `auth.login.failure`, `auth.login.locked`
- **Dimensions:** `country_code` (derived from E.164, e.g., 1,44,91), `ip_hash` (anonymized), `user_id` when available

---

## 9) Testing & non‑regression
- **Unit:** phone validation (E.164 parse/format with libphonenumber); Argon2 verify; lockout math.
- **Integration:**
  - signup → login → logout happy path
  - duplicate signup → 409
  - wrong password → 401
  - lockout → 423
  - multi‑country phones: +12025550123 (US), +447700900123 (UK), +919876543210 (IN) all succeed; 09876543210 (no +) fails with 400
- **Data invariants:** `sessions.expires_at > created_at`; unique `phone_e164` enforced.
- **Load sanity:** 50 RPS login burst within limits; p95 < 150ms on t3.small‑equiv.

**Gate:** build fails if any contract test or invariant fails.

---

## 10) Risks & mitigations
- Weak passwords → enforce min length; later add reset/strength.
- SIM swap/account takeover → out of scope v0; add OTP/device binding in v1.
- Brute force → rate limits + lockout.
- Privacy → store only phone + hash; no PII beyond that.

---

## 11) Rollout
- **M0 (1 day):** Schema, endpoints, minimal UI, cookie sessions.
- **M1 (next day):** Rate limits + lockout + telemetry.
- **Exit:** All tests pass; demo: create account, login, logout; duplicate signup returns 409.

---

## 12) Appendix — UI copy (en/hi)
- **Login title:** "Welcome back" / "वापसी पर स्वागत है"
- **Create account:** "Create your account" / "अपना खाता बनाएं"
- **Error (invalid phone):** "Enter a valid phone number with country code (e.g., +12025550123 / +447700900123 / +919876543210)" /
"कृपया देश कोड सहित मान्य फोन नंबर दर्ज करें (उदा., +12025550123 / +447700900123 / +919876543210)"