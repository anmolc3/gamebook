# 🛠️ Database Migrations Strategy

## Tooling
- Prisma Migrate (`prisma migrate dev` for development, `prisma migrate deploy` for production).

## Rules & Protocol
1. **Never mutate applied migrations**: Once a migration file is generated and committed in `server/prisma/migrations/`, it must remain immutable.
2. **Backward Compatibility**: Field renames must be executed as two-phase migrations (add new column -> migrate data -> drop old column) to allow zero-downtime rolling updates.
3. **Migration Verification**: In automated CI/CD and deployment checks, run `prisma migrate status` before launching backend servers.
