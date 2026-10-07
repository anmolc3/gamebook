# 🔒 Security Architecture

## 1. Authentication & Cryptography
- Passwords salted and hashed with `bcrypt` (work factor 12).
- Session tokens generated via signed JWTs with explicit expiration and cryptographic verification.
- Passwords are never returned in database projections or API responses.

## 2. Authorization & Boundary Checks
- Every data access verifies that the requesting `userId` has ownership or membership in the resource.
- Message history is strictly bounded to confirmed conversation members.
- Stories are filtered against relationship status (e.g., non-friends cannot retrieve private or friends-only stories).

## 3. Input Validation & Anti-Tampering
- All incoming payloads pass strict schema validation (Zod) before touching business logic.
- Rate limiting applied to sensitive endpoints (login, register, friend requests, room creation).
- SQL injection prevented natively via Prisma parameterized queries.
