# Phase 3: Authentication

## Objective
Implement secure user registration, login, token-based session persistence, password hashing, and authenticated route protection across both backend and mobile client.

## Requirements
- Backend routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- Passwords salted and hashed with bcrypt (12 rounds).
- JWT issuance with configurable expiration.
- Mobile auth context with encrypted token persistence.
- Input validation with user-friendly error states.
- Socket.IO handshake authentication binding sockets to personal user rooms.

## Implementation Plan
1. Create user auth service and controller in `server/src/auth/`.
2. Implement JWT signing and authentication middleware.
3. Build mobile `AuthContext` and secure storage integration.
4. Implement mobile Register and Login screens with design system components.
5. Create automated test suite in `server/test-auth.js`.

## Expected Files
- `server/src/auth/auth.controller.ts`
- `server/src/auth/auth.service.ts`
- `server/src/auth/auth.validation.ts`
- `server/src/auth/auth.routes.ts`
- `server/src/middleware/auth.middleware.ts`
- `server/test-auth.js`
- `mobile/services/auth.service.ts`
- `mobile/features/auth/AuthContext.tsx`
- `mobile/screens/auth/LoginScreen.tsx`
- `mobile/screens/auth/RegisterScreen.tsx`

## Dependencies
- Backend: `bcryptjs`, `jsonwebtoken`, `zod`, `@types/bcryptjs`, `@types/jsonwebtoken`
- Mobile: `@react-native-async-storage/async-storage`

## Database Changes
- User records populated; Profile records auto-initialized upon registration in a single Prisma transaction.

## API Changes
- `POST /api/v1/auth/register`: Public registration endpoint with Zod validation.
- `POST /api/v1/auth/login`: Public login endpoint verifying email/username and password.
- `GET /api/v1/auth/me`: Protected session validation endpoint.

## Socket Changes
- Socket handshake verifies JWT token in `socket.handshake.auth.token`, attaching user context and joining `user:${userId}` personal channel.

## UI Changes
- Themed `LoginScreen` and `RegisterScreen` built with Phase 2 UI components (zero emojis, tokenized theme colors, soft cards, SVG icons).
- Integrated `AuthProvider` into `mobile/App.tsx` with conditional session routing.

## Testing Requirements
- Automated test suite `server/test-auth.js` executing 6 core scenarios:
  1. Registration with password hashing
  2. Duplicate user rejection (HTTP 400)
  3. Login with credentials and JWT receipt
  4. Bad credentials rejection (HTTP 401)
  5. Authenticated profile lookup (`GET /api/v1/auth/me`)
  6. Authenticated Socket.IO handshake
- Mobile TypeScript check (`tsc --noEmit` with 0 errors).
- Android Hermes bundle compilation (`expo export -p android` with 690 modules compiled).

## Completion Checklist
- [x] User registration and login endpoints functional
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT signed and verified with middleware
- [x] Sockets authenticated with user JWT and personal room joined
- [x] Mobile auth service and `AuthContext` with AsyncStorage persistence
- [x] Mobile Login and Register screens constructed with Phase 2 components
- [x] All 6 automated test scenarios passing
- [x] Mobile TypeScript and Android Hermes build passing with 0 errors

## Current Status
COMPLETE

## Known Issues
- None.

## Notes
- Session tokens follow standard Bearer authentication. Password hashes are excluded from all API responses and client-facing entities.
