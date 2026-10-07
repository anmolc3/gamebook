# 🔐 Authentication Architecture

## Token Mechanics
- **Access Tokens**: Short-lived JWTs (2 hours) signed with server secret (`HS256` or `RS256`).
- **Refresh Tokens**: Stored securely in database with revocation capabilities on password reset or logout.
- **Client Storage**: Tokens persisted using encrypted device storage (`expo-secure-store` on mobile).
