# TikitiHub

An event ticketing platform for the Kenyan market. Organizers publish events with tiered ticket classes (Regular, VIP, VVIP, etc.), attendees purchase via M-Pesa STK Push, and gate agents redeem passes by QR scan.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [API Overview](#api-overview)
- [Architecture Notes](#architecture-notes)
- [Security Notes](#security-notes)
- [Known Gotchas](#known-gotchas)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Features

### For attendees

- Browse upcoming events and their ticket tiers
- Secure checkout via M-Pesa STK Push (Safaricom Daraja)
- Email-verified account registration
- Personal ticket wallet with QR-coded PDF passes
- Redeem passes at the gate via QR scan or manual token lookup

### For organizers (`ROLE_AGENT`)

- Publish events with multiple ticket tiers, each with its own price and capacity
- Dashboard showing per-event and per-tier revenue, sales pace, and inventory
- Gate check-in console with camera-based QR scanning
- Real-time gate stream log

### Platform

- JWT-based stateless authentication
- Atomic inventory decrement (no overselling under concurrent load)
- Idempotent M-Pesa callback processing (Safaricom retries are safe)
- Role-based access control (`ROLE_CUSTOMER` / `ROLE_AGENT` / `ROLE_ADMIN`)
- Global exception handler with consistent JSON error responses

---

## Tech Stack

### Backend

- Java 21+ (Lombok required to compile)
- Spring Boot 4.0 (Spring Framework 7, Spring Security 7, Tomcat 11)
- Spring Data JPA + Hibernate
- MySQL 8
- JJWT for JWT signing/verification
- Gradle (wrapper included)
- Jakarta Mail (SMTP via Gmail)

### Frontend

- React 18 + TypeScript
- Vite
- Zustand for state management
- React Router v6
- Tailwind CSS
- Axios for HTTP
- `html5-qrcode` for camera scanning
- `qrcode` + `jspdf` + `html2canvas` for ticket PDFs

### External services

- Safaricom Daraja API (M-Pesa STK Push)
- SMTP (Gmail app password or equivalent)
- ngrok (development only — for a public callback URL)

---

## Project Structure

```text
tikitiHub/
├── tikitihub/                         # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/tikitihub/
│   │   │   │   ├── config/            # SecurityConfig, MpesaProperties, JwtProperties
│   │   │   │   ├── controller/        # REST controllers
│   │   │   │   ├── dto/               # Request/response records
│   │   │   │   ├── exception/         # Custom exceptions + GlobalExceptionHandler
│   │   │   │   ├── model/             # JPA entities
│   │   │   │   ├── repository/         # Spring Data repositories
│   │   │   │   ├── security/           # JwtAuthenticationFilter
│   │   │   │   └── service/             # Jwt, Mpesa, Email, UserDetails services
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── application-dev.properties
│   │   └── test/
│   │       ├── java/                   # JUnit 5 + AssertJ tests
│   │       └── resources/
│   │           └── application.properties # H2 in-memory test config
│   └── build.gradle
│
└── tikitihub-ui/                      # React frontend
    ├── src/
    │   ├── components/                # Button, Input, Card, Layout, TicketDownloader
    │   ├── pages/                     # Home, Checkout, AgentDashboard, MyTickets, ...
    │   ├── stores/                    # Zustand stores
    │   ├── lib/client.ts              # Axios instance
    │   └── App.tsx
    └── package.json
```

---

## Prerequisites

| Tool | Version |
|---|---|
| JDK | 21+ (required for Lombok 1.18.36+) |
| Node.js | 20+ |
| MySQL | 8.x |
| Gradle | Bundled via `./gradlew` |
| Safaricom Daraja account | Sandbox is fine for dev |
| ngrok account | For a public callback URL during local dev |

---

## Setup

### 1. Clone and initialise

```bash
git clone https://github.com/MusauVin/tikitiHub.git
cd tikitiHub
```

### 2. Create the MySQL database and user

```sql
CREATE DATABASE tikitihub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'tikiti_admin'@'localhost' IDENTIFIED BY '<strong-password>';

GRANT ALL PRIVILEGES ON tikitihub.* TO 'tikiti_admin'@'localhost';

FLUSH PRIVILEGES;
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

`.env` — never commit this file. Required keys:

```env
# Database
DB_USERNAME=tikiti_admin
DB_PASSWORD=<your-mysql-password>

# Mail (Gmail app password or SMTP credential)
MAIL_USERNAME=you@example.com
MAIL_PASSWORD=<gmail-app-password>

# JWT — generate with `openssl rand -base64 64`
JWT_SECRET=<64-byte-base64-secret>

# M-Pesa Daraja (sandbox or production)
MPESA_CONSUMER_KEY=<daraja-consumer-key>
MPESA_CONSUMER_SECRET=<daraja-consumer-secret>
MPESA_PASS_KEY=<daraja-passkey>
MPESA_SHORT_CODE=174379
MPESA_CALLBACK_URL=https://<your-ngrok>.ngrok-free.app/api/payments/mpesa-callback
MPESA_BASE_URL=https://sandbox.safaricom.co.ke

# ngrok
NGROK_AUTH_TOKEN=<ngrok-authtoken>

# Frontend / CORS
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:*,http://127.0.0.1:*

# Platform fee (percent, integer)
PLATFORM_FEE_PERCENT=5

# Local dev profile (verbose logging, show-sql)
SPRING_PROFILES_ACTIVE=dev
```

### 4. Install dependencies

**Backend:**

```bash
cd tikitihub
./gradlew build -x test
```

**Frontend:**

```bash
cd tikitihub-ui
npm install
```

---

## Running Locally

Three terminals are recommended.

### Terminal 1 — Backend (port 8080)

```bash
cd tikitihub
./gradlew bootRun
```

### Terminal 2 — Frontend (port 5173)

```bash
cd tikitihub-ui
npm run dev
```

### Terminal 3 — ngrok tunnel

Required for M-Pesa callbacks:

```bash
ngrok http 8080
```

Copy the generated HTTPS URL into `MPESA_CALLBACK_URL` in `.env` and restart the backend.

> **Note:** Without an active tunnel, M-Pesa payments will initiate but the callback will never reach your server.

Open <http://localhost:5173> in a browser.

---

## Testing

```bash
cd tikitihub
./gradlew test
```

The suite runs against H2 in-memory (`src/test/resources/application.properties`). No MySQL, ngrok, or external services are required.

### What's covered

| Test class | What it locks in |
|---|---|
| `JwtServiceTest` | Token generation, tampered/expired/malformed rejection |
| `TicketTierConcurrencyTest` | Atomic decrement prevents overselling under 20-way concurrent load |
| `PaymentCallbackIdempotencyTest` | Callback processes exactly once; failed payments do not create bookings; unknown IDs return 500 for Safaricom retry |
| `TikitihubApplicationTests` | Spring context loads with test configuration |

### View the HTML report

```bash
open build/reports/tests/test/index.html
```

---

## API Overview

All endpoints are prefixed with `/api`. Authenticated endpoints use:

```text
Authorization: Bearer <jwt>
```

### Authentication

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account (unverified) |
| `POST` | `/auth/login` | Public | Exchange credentials for JWT |
| `GET` | `/auth/verify?token=` | Public | Activate account from email link |

### Events / Tickets

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/tickets` | Public | List upcoming events |
| `GET` | `/tickets/{id}` | Public | Event detail with tiers |
| `GET` | `/tickets/{id}/tiers` | Public | Tier list for an event |
| `POST` | `/tickets` | `ROLE_AGENT` | Create event + tiers |
| `PUT` | `/tickets/{id}` | `ROLE_AGENT` | Update event |
| `DELETE` | `/tickets/{id}` | `ROLE_AGENT` | Delete event |
| `GET` | `/tickets/my-listings` | `ROLE_AGENT` | Own events |
| `GET` | `/tickets/my-events` | `ROLE_AGENT` | Own events (alias) |

### Bookings

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/bookings` | Authenticated | Direct purchase (tier-based) |
| `POST` | `/bookings/redeem` | `ROLE_AGENT` | Gate scan |
| `GET` | `/bookings/my-bookings` | Authenticated | Own ticket wallet |
| `GET` | `/bookings/organizer-sales` | `ROLE_AGENT` | Per-event / per-tier sales metrics |

### Payments

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/payments/stk-push` | Authenticated | Trigger M-Pesa STK Push |
| `POST` | `/payments/mpesa-callback` | Public | Safaricom callback (idempotent) |

### Error responses

All errors share a common JSON shape:

```json
{
  "timestamp": "2026-09-29T10:15:30.123",
  "status": 400,
  "error": "Not enough VIP tickets left! Only 3 remaining.",
  "type": "BusinessRuleException"
}
```

Validation errors include a per-field map:

```json
{
  "timestamp": "2026-09-29T10:15:30.123",
  "status": 400,
  "error": "Validation failed",
  "type": "MethodArgumentNotValidException",
  "fields": {
    "quantity": "quantity must be at least 1"
  }
}
```

---

## Architecture Notes

### Atomic inventory decrement

Both the direct-booking path and the M-Pesa callback use a repository-level:

```sql
UPDATE ... WHERE remaining_quantity >= :qty
```

and check the affected-row count.

Under concurrent load this guarantees no overselling — verified by `TicketTierConcurrencyTest`, which fires 20 parallel requests at 5 units of stock and asserts exactly 5 succeed.

### Idempotent M-Pesa callbacks

Safaricom retries failed callbacks for up to 24 hours.

The callback checks transaction status first. If the row is already `COMPLETED`, `FAILED`, or `OVERSOLD`, it returns `200` with `"Already processed"` and does nothing else.

Internal errors return `500` so Safaricom retries. Transactions stay `PENDING` until a terminal status is written.

### Server-side pricing

The `/payments/stk-push` endpoint computes the charge from:

```text
tierPrice × quantity × (1 + platformFee)
```

The client cannot dictate the amount.

### DTO responses

Controllers never return JPA entities directly. `BookingResponse` and `TicketResponse` are records that flatten fields and strip sensitive ones (no password, no verificationToken).

This prevents `LazyInitializationException` on serialization and eliminates a class of data leaks.

### Stateless authentication

No sessions — every request carries a JWT.

Expired, tampered, or malformed tokens are caught inside `JwtAuthenticationFilter` and produce a clean `401` via `authenticationEntryPoint` instead of a `500`.

### Verification flow

Registration issues a UUID token and sends an email with a link to:

```text
<FRONTEND_URL>/verify-email?token=...
```

Clicking the link takes the user to a React page that calls:

```text
GET /api/auth/verify?token=...
```

and shows a success or error state.

---

## Security Notes

### Secrets management

All credentials live in environment variables loaded from `.env` via `spring-dotenv`.

> **Never commit `.env`.** `.gitignore` already excludes it.

### Password hashing

BCrypt via `PasswordEncoder`. Never store passwords in plaintext.

### User enumeration

Login responds identically for wrong email and wrong password:

```text
Invalid email or password
```

### CORS

Configured by `CORS_ALLOWED_ORIGINS`, supporting wildcard subdomain patterns via `setAllowedOriginPatterns`.

### JWT

HS256 with 24-hour expiry. The secret must be at least 32 bytes base64-encoded; 64 bytes are recommended.

### M-Pesa callback

No authentication is required by design because Safaricom must reach it. The callback only acts on known `checkoutRequestID` values and is fully idempotent.

### Before deploying to production

- Rotate every credential in `.env` one final time.
- Set `SPRING_PROFILES_ACTIVE=prod` (or leave it unset).
- Change `MPESA_BASE_URL` to `https://api.safaricom.co.ke`.
- Replace `FRONTEND_URL` and `MPESA_CALLBACK_URL` with real domain names (no ngrok).
- Serve the backend over HTTPS.
- Configure a transactional SMTP provider (Postmark, SendGrid, AWS SES).
- Set up automated MySQL backups and test restoring them.
- Add uptime monitoring and alert on `ERROR`-level logs from `com.example.tikitihub`.
- Replace `ddl-auto=update` with Flyway or Liquibase migrations.
- See `SECURITY.md` for vulnerability disclosure.

---

## Known Gotchas

- Spring Boot 4.0 reorganized several test-autoconfigure packages. The test suite uses direct controller calls instead of MockMvc/TestRestTemplate to sidestep this. If you hit `"package does not exist"` errors in tests, that's why.
- Lombok on JDK 21+ requires 1.18.36 or newer. The `build.gradle` pins it explicitly.
- `@Async` requires `@EnableAsync` on the main application class to actually run on a background thread.
- `ddl-auto=update` is convenient for development but should be replaced with migrations before production.
- MySQL row locking: the atomic decrement relies on InnoDB row-level locks.
- M-Pesa sandbox phone numbers: the Daraja sandbox only accepts a short list of test MSISDNs from your app's dashboard.

---

## Contributing

See `CONTRIBUTING.md` for guidelines on reporting issues, submitting pull requests, and coding standards.

---

## License

Add your license here (MIT, Apache 2.0, GPL v3, etc.).

---

## Acknowledgements

- Safaricom Daraja API — M-Pesa integration
- Spring Boot — backend framework
- React — frontend framework
- Vite — frontend build tooling
- Zustand — frontend state management
- The wider open-source ecosystem that made this project possible