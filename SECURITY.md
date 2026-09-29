# Security Policy

TikitiHub handles real money and personal data. Security issues are treated seriously and responsibly.

---

## Supported Versions

Only the latest commit on `main` is supported. Older commits and forks are not.

| Version | Supported |
|---|---|
| Latest on `main` | :white_check_mark: |
| Any released tag | :x: (pre-1.0, no tags) |
| Forks and derivatives | :x: |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email the maintainer directly:

📧 **vincent.musau404@gmail.com**

Include as much of the following as you can:

- **Type of issue** — SQL injection, XSS, auth bypass, information disclosure, CSRF, race condition, etc.
- **Affected component** — backend endpoint, frontend route, service, database layer
- **Affected version** — commit hash or date
- **Steps to reproduce** — the minimum sequence that demonstrates the issue
- **Proof of concept** — a curl command, script, or screenshot
- **Impact assessment** — what an attacker can achieve
- **Suggested fix** — optional, but helpful
- **Your contact info** — for follow-up questions

If you need to send sensitive data (tokens, payloads), encrypt it with PGP. Ask for the public key in your initial email.

---

## What Counts as a Vulnerability

### In scope

- Authentication bypass or privilege escalation
- JWT forging, signature bypass, or replay
- SQL/NoSQL injection
- Cross-site scripting (XSS), CSRF, SSRF
- Data exposure — leaking passwords, tokens, other users' bookings, or personal data
- Race conditions leading to overselling or double-spending
- Payment bypass — M-Pesa callback forgery, price manipulation, refund manipulation
- Business logic abuse — negative quantities, integer overflow, unbounded resource consumption
- Dependency vulnerabilities in libraries the app directly uses

### Out of scope

- Denial of service via volume alone (rate-limiting is a separate concern; report configuration suggestions as regular issues)
- Self-XSS requiring the victim to paste code into their own console
- Missing security headers on non-production local development
- Outdated dependency warnings with no known exploit in the current context
- Attacks that require a compromised user's device
- Social engineering of project maintainers

---

## Our Commitment

When you report a vulnerability:

1. **We acknowledge within 72 hours.**
2. **We provide an initial assessment within 7 days** — confirming whether it's a real issue, its severity, and an estimated fix timeline.
3. **We keep you updated** as we work on a fix.
4. **We credit you in the release notes** once a fix is deployed, unless you prefer to remain anonymous.
5. **We do not pursue legal action** against researchers acting in good faith (see Safe Harbour below).

If you don't hear back within 72 hours, assume the email was lost and follow up.

---

## Severity Guidelines

| Severity | Examples | Target fix time |
|---|---|---|
| Critical | Auth bypass, RCE, payment manipulation, mass data exposure | 24 hours |
| High | Privilege escalation, single-user data exposure, token leakage | 3 days |
| Medium | XSS in authenticated context, CSRF with state change, info disclosure | 2 weeks |
| Low | XSS requiring unusual interaction, verbose error messages, minor info leaks | Next release |

---

## Safe Harbour

We will not pursue legal action against security researchers who:

- Act in good faith and follow this policy
- Do not access, modify, or delete other users' data
- Do not degrade service for other users
- Do not use the vulnerability for personal gain
- Report promptly and give us a reasonable window to fix before disclosing publicly
- Do not test against production users without explicit permission

If you're unsure whether a test is in scope, email first and ask. We'd rather answer a question than have someone avoid reporting.

---

## Existing Security Posture

For context, here's what the current codebase does to reduce risk. If you find a gap in any of these, that's worth reporting.

### Authentication

- Passwords hashed with BCrypt (`PasswordEncoder`)
- JWT-signed tokens (HS256), 24-hour expiry, secret loaded from environment
- Malformed and tampered tokens rejected in `JwtAuthenticationFilter`
- No user enumeration on login — identical error for wrong email and wrong password
- Email verification required before login is allowed

### Authorization

- Role-based (`ROLE_CUSTOMER`, `ROLE_AGENT`, `ROLE_ADMIN`)
- Enforced in `SecurityConfig` at the URL level
- Business operations (booking, redemption) scoped to the authenticated user
- Organizer endpoints scoped to the caller's own events

### Data Handling

- No entities returned directly from controllers — DTOs strip sensitive fields (`password`, `verificationToken`)
- Hibernate parameterizes all queries (no string concatenation into SQL)
- Request bodies validated with `@Valid` and typed DTOs

### Concurrency

- Inventory decrement is atomic (`UPDATE ... WHERE remaining >= :qty`)
- M-Pesa callbacks are idempotent (idempotency guard on transaction status)
- Sensitive multi-step operations run under `@Transactional`

### Payments

- Amounts calculated server-side from `tierPrice × quantity × fee`
- M-Pesa callbacks process only against known `checkoutRequestID` values
- Oversold payments are recorded as `OVERSOLD` for manual refund rather than silently dropped

### Secrets

- All credentials loaded from environment variables via `.env`
- `.env` excluded from Git via `.gitignore`
- No secrets in source code, test code, or committed config

### Transport

- CORS restricted to configured origins
- Production deployment must serve over HTTPS (see README deployment checklist)

---

## Known Limitations

Documented here so they're not accidentally reported as new findings:

- **`ddl-auto=update`** — Hibernate auto-updates the schema on startup. Convenient for development, but production should use explicit migrations (Flyway / Liquibase) so changes are reviewed and reversible.
- **No rate limiting** — the backend does not throttle requests. Login brute-force, booking floods, and callback floods are all currently possible. Should be added before significant traffic. If you find a specific amplification vector, please report.
- **No CSRF tokens** — intentional, since the API is stateless and JWT is sent via `Authorization` header (not cookies). If cookie-based auth is ever added, this needs revisiting.
- **JWT has no revocation list** — logging out doesn't invalidate a token until it expires. Token lifetimes are short (24h) to bound the exposure window.
- **ngrok in development** — the `MPESA_CALLBACK_URL` points at an ngrok tunnel during local development. This is not used in production.

---

## Dependency Updates

Dependencies are updated periodically, with priority given to:

1. Any CVE affecting a directly used library
2. Spring Boot patch versions
3. Frontend patch versions

To see current dependency versions:

```bash
# Backend
./gradlew dependencies

# Frontend
cd tikitihub-ui && npm audit
```