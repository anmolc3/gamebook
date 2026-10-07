# 📈 Scalability & Evolution Roadmap

## Free-First Foundation (Stage 1)
- **Deployment**: Monolithic Node.js + Express + Socket.IO process running on low-cost VPS / Render / Railway.
- **Database**: Single managed or self-hosted PostgreSQL instance.
- **Media**: Local filesystem mock or free-tier object storage (Cloudflare R2 / AWS S3 free tier).
- **Socket State**: In-memory room tracking.

## Scale Migration (Stage 2)
When concurrent users exceed ~1,000 active sockets:
1. **Redis Pub/Sub Adapter**: Introduce `@socket.io/redis-adapter` to distribute real-time events across multiple Node.js nodes.
2. **Reverse Proxy & Load Balancer**: Nginx / HAProxy / AWS ALB with sticky sessions for WebSocket upgrades.
3. **Database Read Replicas**: Separate analytical queries (leaderboards, match history) from write-heavy game transactions.
4. **CDN Edge Caching**: Cloudflare CDN for static avatars, story media, and client bundle distributions.
