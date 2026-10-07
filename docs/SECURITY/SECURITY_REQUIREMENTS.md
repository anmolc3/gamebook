# 🛡️ Security Requirements

## Non-Negotiable Standards
1. **Zero Secret Leaks**: No API secrets, database passwords, or JWT secrets committed to version control.
2. **Strict Transport Security**: All network communications encrypted in transit via HTTPS and WSS in production.
3. **Data Protection**: User passwords hashed using bcrypt (12 rounds).
4. **Rate Limiting**: Prevent brute force attacks on authentication and friend request routes.
5. **Sanitization**: All user-provided strings sanitized against XSS before database insertion and UI rendering.
