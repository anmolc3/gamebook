# 🆓 Free-First Infrastructure Blueprint

## Hosting Strategy (Zero/Low Cost Initial Tier)
1. **Database**: Free tier managed PostgreSQL (Neon / Supabase / Railway Free Tier).
2. **Backend**: Render / Railway / fly.io container instance running Express + Socket.IO with WebSocket upgrade support.
3. **Media Storage**: Cloudflare R2 (10 GB free object storage with zero egress fees) or local disk with static routing.
4. **Mobile Client**: Expo Go for testing; EAS Build free tier for Android APK generation.

## Migration Path
Zero refactoring needed when graduating to paid AWS/GCP/DigitalOcean droplet infrastructure.
