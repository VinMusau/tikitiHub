# Contributing to TikitiHub

Thanks for considering a contribution. This document explains how to report bugs, suggest features, and submit code.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Branching](#branching)
- [Pull Requests](#pull-requests)
- [Testing](#testing)
- [Review Process](#review-process)

---

## Code of Conduct

Be decent to each other. Disagree with ideas, not people. Assume good faith.

If you see behaviour that isn't in that spirit, email the maintainer privately rather than escalating in a thread.

---

## Reporting Bugs

**Open a GitHub Issue** with:

1. **A clear title** — e.g. `Checkout fails with 500 when tier has 0 remaining`
2. **Steps to reproduce** — numbered, specific, from a fresh state
3. **Expected behaviour** — what should have happened
4. **Actual behaviour** — what happened instead, including any error text
5. **Environment** — OS, JDK version, Node version, browser (if frontend)
6. **Logs or screenshots** if applicable

### Good bug report

> **Title:** Concurrent bookings oversell VIP tier when starting stock is 1
>
> **Steps:**
>
> 1. Create event with 1 VIP ticket
> 2. Fire 10 concurrent `POST /api/bookings` with `{"tierId": X, "quantity": 1}`
> 3. Query `ticket_tiers.remaining_quantity`
>
> **Expected:** 1 booking, `remaining_quantity = 0`
>
> **Actual:** 3 bookings, `remaining_quantity = -2`
>
> **Environment:** macOS 14, JDK 21, MySQL 8.0.35

### Bad bug report

> checkout is broken pls fix

Before filing, search existing issues — it may already be tracked.

> **Security issues do not go in the issue tracker.** See [`SECURITY.md`](SECURITY.md).

---

## Suggesting Features

Open an Issue with the `enhancement` label. Include:

- **The problem** — what pain point does this solve?  
  Example: "As an organizer, I can't..."
- **Proposed solution** — what would you like to see?
- **Alternatives considered** — what workarounds exist today?
- **Scope** — is this a small tweak or a substantial feature?

Features that align with the project's focus (Kenyan event ticketing, M-Pesa payments) are more likely to be accepted.

Large features are best discussed before implementation to avoid wasted work.

---

## Development Setup

See the [Setup section in README.md](README.md#setup) for the full walkthrough.

Minimum steps:

1. Java 21, Node 20, and MySQL 8 installed
2. Copy `.env.example` to `.env` and fill in the required values
3. Build the backend:
   ```bash
   cd tikitihub
   ./gradlew build -x test
   ```
4. Install frontend dependencies:
   ```bash
   cd tikitihub-ui
   npm install
   ```
5. Run the backend (`./gradlew bootRun`), frontend (`npm run dev`), and ngrok in three terminals

---

## Coding Standards

### Backend (Java)

#### Return DTOs from controllers

**Never return JPA entities from controllers.** Always map entities to DTOs.

**Bad:**

```java
@GetMapping("/{id}")
public Ticket getTicket(@PathVariable Long id) {
    ...
}
```

**Good:**

```java
@GetMapping("/{id}")
public TicketResponse getTicket(@PathVariable Long id) {
    return TicketResponse.from(
        ticketRepository.findById(id).orElseThrow(...)
    );
}
```

#### Use typed exceptions

Use typed exceptions instead of generic `RuntimeException`.

**Bad:**

```java
.orElseThrow(() -> new RuntimeException("Ticket not found"));
```

**Good:**

```java
.orElseThrow(
    () -> new ResourceNotFoundException("Ticket " + id + " not found")
);
```

#### Use atomic inventory updates

**Never use a read-modify-write pattern for inventory.** Use the atomic decrement.

**Bad — races under concurrency:**

```java
if (tier.getRemainingQuantity() < qty) {
    return badRequest();
}

tier.setRemainingQuantity(
    tier.getRemainingQuantity() - qty
);

tierRepo.save(tier);
```

**Good:**

```java
int updated = tierRepo.decrementIfAvailable(tierId, qty);

if (updated == 0) {
    throw new BusinessRuleException("Not enough tickets left");
}
```

#### Use SLF4J for logging

**Log via SLF4J.** Never use `System.out.println`.

```java
private static final Logger log =
    LoggerFactory.getLogger(YourClass.class);
```

**Bad:**

```java
System.out.println("Booking created: " + booking.getId());
```

**Good:**

```java
log.info("Booking created: {}", booking.getId());
```

### Frontend (TypeScript / React)

#### Avoid `any`

Do not use `any` in new code unless interfacing with an untyped library.

Define types in `src/types/` or inline as interfaces.

**Bad:**

```typescript
const handleResponse = (data: any) => {
  ...
};
```

**Good:**

```typescript
interface BookingResponse {
  id: number;
  eventName: string;
  tierName: string | null;
}

const handleResponse = (data: BookingResponse) => {
  ...
};
```

#### Clean up effects

Abort fetches on unmount, cancel timers, and stop media streams.

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(...)
    .catch((err) => {
      if (err.name !== "CanceledError") {
        ...
      }
    });

  return () => controller.abort();
}, [dependency]);
```

#### Use Zustand selectors

Read store state with selectors instead of destructuring whole objects to avoid unnecessary re-renders.

**Bad — re-renders when any auth state changes:**

```typescript
const authState = useAuthStore();
```

**Good — only re-renders when `user` changes:**

```typescript
const user = useAuthStore((s) => s.user);
```

#### Surface errors to the user

A `console.error` is not user feedback.

**Bad:**

```typescript
catch (err) {
  console.error(err);
}
```

**Good:**

```typescript
catch (err) {
  const message =
    err.response?.data?.error ?? "Something went wrong";

  setError(message);
}
```

#### Match frontend fields to backend DTOs

Field names must match the backend DTOs.

If `BookingResponse` has `eventName` at the top level, don't read:

```typescript
booking.eventTicket.eventName
```

Use:

```typescript
booking.eventName
```

---

## Commit Messages

Follow the **imperative, present-tense** style — as if completing the sentence:

> "Applying this commit will..."

Good examples:

```text
Add atomic decrement to prevent overselling
Fix duplicate booking on repeated M-Pesa callback
Update README with deployment checklist
Refactor BookingResponse to flatten lazy associations
```

Avoid:

```text
Added atomic decrement
fixes bug
updated readme
WIP
```

### Longer commit messages

For longer messages, leave a blank line after the subject, then add a body:

```text
Fix M-Pesa callback losing money on oversold tiers

When a customer paid but stock was exhausted, the previous code
logged an error and returned 200 without recording anything —
leaving the payment orphaned. Now marks the transaction OVERSOLD
and returns 200 so Safaricom stops retrying; refund is handled
out-of-band.
```

### Optional prefixes

Prefixes are optional but useful:

```text
feat:
fix:
docs:
chore:
refactor:
test:
perf:
```

Examples:

```text
feat: add ticket tier editing
fix: prevent duplicate M-Pesa callbacks
docs: update deployment guide
test: add concurrent booking coverage
```

---

## Branching

`main` is the stable branch. Feature and fix work happens on short-lived branches.

| Prefix | Use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fix |
| `chore/` | Tooling, dependencies, non-functional changes |
| `docs/` | Documentation-only changes |
| `refactor/` | Code changes that neither fix a bug nor add functionality |

### Example branch names

```text
feature/tier-capacity-edit
fix/callback-duplicate-booking
docs/deployment-guide
```

Keep branches focused.

If you find yourself fixing an unrelated bug mid-feature, commit it on a separate branch first.

---

## Pull Requests

### Before opening a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes — small, focused, and limited to one logical change per PR.
3. Run the tests:
   - Backend: `./gradlew test`
   - Frontend: `npm run build`
4. Update the README if you add a user-facing feature or change setup steps.

### Include the following in your PR

- A clear title using the same style as commit messages
- A description explaining **what** changed and **why**
- A reference to the related issue, for example `Closes #42`
- Screenshots for any UI change
- Any deployment or migration notes

### What reviewers look for

- Does it work?
- Is there a test that would catch a regression?
- Does it follow the coding standards above?
- Are there security implications, such as authentication, injection, secrets, or concurrency concerns?
- Are error paths handled?
- Is the diff minimal and focused?

### What gets a PR sent back

A PR may be sent back for changes if it:

- Has no tests for a bug fix
- Introduces `System.out.println`, raw entity responses, or `any`
- Mixes unrelated changes, such as refactors, new features, and formatting
- Has merge conflicts against `main`
- Bypasses validation, exception handling, or the atomic decrement pattern

---

## Testing

Every bug fix should include a test that **fails before the fix and passes after**.

### Where to add tests

| Change type | Test location |
|---|---|
| Business logic (service layer) | `src/test/java/.../service/` |
| Data access (repository) | `src/test/java/.../repository/` |
| HTTP layer (controller) | `src/test/java/.../controller/` |
| Frontend utilities | `tikitihub-ui/src/**/\*.test.ts` (if a test runner is added) |

### Test behaviour, not implementation

Prefer tests that verify behaviour rather than implementation details.

**Bad — tests implementation detail:**

```java
@Test
void callsDecrementIfAvailable() {
    ...
    verify(mock).decrementIfAvailable(...);
}
```

**Good — tests behaviour:**

```java
@Test
void concurrentBookingsDoNotOversell() {
    // Fire 20 requests at 5 units of stock.
    // Assert 5 succeed, 15 are rejected, and remaining = 0.
}
```

### Tests should be

- **Fast** — the entire backend suite runs in under a minute
- **Isolated** — one test's failure doesn't cascade
- **Deterministic** — no reliance on timing, network, or wall clock
- **Readable** — a reviewer can understand what's being verified without reading the implementation

---

## Review Process

- A maintainer reviews PRs within a few days.
- Feedback is given as inline comments or as a summary.
- Requested changes should be pushed as new commits, not force-pushed, so reviewers can see what changed between rounds.
- Once approved, the maintainer merges:
  - **Squash** for multi-commit PRs
  - **Merge** for single-commit PRs
- If a PR goes stale (no activity for 2+ weeks), the maintainer may close it with a note. You can reopen it anytime.

---

## Questions?

Open a Discussion or file an Issue with the `question` label.

There's no such thing as a bad question.