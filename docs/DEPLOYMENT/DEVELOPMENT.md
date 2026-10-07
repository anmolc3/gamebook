# 💻 Local Development Setup

## Prerequisites
- Node.js (v20+ or v24.x)
- npm (v10+ or v11.x)
- PostgreSQL 16+ (Local service running on port 5432)
- Git (v2.x)

## Setup Steps
1. **Clone & Install**:
   ```bash
   # From root:
   cd server && npm.cmd install
   cd ../mobile && npm.cmd install
   ```
2. **Environment Setup**:
   - Copy `server/.env.example` to `server/.env`
   - Adjust `DATABASE_URL` (e.g., `postgresql://postgres:postgres@localhost:5432/gameapp_dev`)
3. **Run Prisma Migrations**:
   ```bash
   cd server
   npx.cmd prisma db push
   ```
4. **Start Development Servers**:
   - Server: `npm.cmd run dev` (Runs Express + Socket.IO on port 5000)
   - Mobile: `npm.cmd start` (Runs Expo Metro bundler)
