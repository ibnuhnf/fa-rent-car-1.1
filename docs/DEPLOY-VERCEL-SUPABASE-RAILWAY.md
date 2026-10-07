# Deployment Guide: Vercel + Supabase + Railway

Arsitektur:
- **Supabase**: PostgreSQL DB (`DATABASE_URL`) + S3 Storage (KTP/SIM/Bukti transfer).
- **Railway**: Backend NestJS API (`apps/api`) + Redis (BullMQ hold expiry scheduler).
- **Vercel**: Frontend Customer (`apps/web-customer`) + Admin (`apps/web-admin`).

---

## 1. Supabase (Database & Storage)

### A. Buat Project Supabase
1. Buka [supabase.com](https://supabase.com) → New Project.
2. Salin **Connection String (URI)** mode `Session` / `Transaction`:
   ```
   postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
   ```
   *(Atau Direct Connection port 5432).*

### B. Buat Storage Bucket Privat
1. Masuk menu **Storage** → **New Bucket**:
   - Nama: `fa-private`
   - Public bucket: **OFF** (harus privat sesuai aturan keamanan data KTP/SIM)
2. Buat S3 Access Keys:
   - **Project Settings** → **Storage** → **S3 Access Keys** → Generate new key.
   - Catat: `Access Key ID`, `Secret Access Key`, dan `Endpoint URL`.

---

## 2. Railway (Backend API + Redis)

### A. Provision Redis & Service
1. Buka [railway.app](https://railway.app) → New Project → **Provision Redis**.
2. Tambahkan Service baru dari repo GitHub Anda:
   - **Root Directory**: Kosongkan (root monorepo).
   - **Build Command**: `pnpm --filter @fa/shared build && pnpm --filter @fa/db generate && pnpm --filter @fa/api build`
   - **Start Command**: `node apps/api/dist/main.js`

### B. Environment Variables di Railway (`apps/api`)
```env
NODE_ENV=production
API_PORT=4000
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
REDIS_URL=${{Redis.REDIS_URL}}

# S3 Supabase Storage
S3_ENDPOINT=https://[PROJECT_REF].supabase.co/storage/v1/s3
S3_REGION=[REGION]
S3_BUCKET=fa-private
S3_ACCESS_KEY=[SUPABASE_S3_ACCESS_KEY]
S3_SECRET_KEY=[SUPABASE_S3_SECRET_KEY]

# Auth & Admin Seed
JWT_SECRET=[GENERATE_STRING_MIN_48_CHARS]
SEED_ADMIN_EMAIL=admin@farentcar.com
SEED_ADMIN_PASSWORD=[PASSWORD_ADMIN_AMAN]
SEED_DEMO_DATA=true
```

### C. Jalankan Migrasi Database dari Lokal
Sebelum API running, jalankan migrasi ke Supabase dari terminal lokal:
```bash
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@...:5432/postgres" pnpm --filter @fa/db migrate:deploy
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@...:5432/postgres" pnpm --filter @fa/db seed
```

---

## 3. Vercel (Web Customer & Web Admin)

Deploy 2 project terpisah di Vercel dari repository yang sama:

### Project 1: `web-customer` (Frontend Pelanggan)
1. **Root Directory**: `apps/web-customer`
2. **Framework Preset**: Next.js
3. **Build Command**: `cd ../.. && pnpm --filter @fa/shared build && pnpm --filter @fa/ui build && pnpm --filter @fa/web-customer build`
4. **Output Directory**: `.next`
5. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://[RAILWAY_API_DOMAIN]
   ```

### Project 2: `web-admin` (Dashboard Admin)
1. **Root Directory**: `apps/web-admin`
2. **Framework Preset**: Next.js
3. **Build Command**: `cd ../.. && pnpm --filter @fa/shared build && pnpm --filter @fa/ui build && pnpm --filter @fa/web-admin build`
4. **Output Directory**: `.next`
5. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://[RAILWAY_API_DOMAIN]
   API_INTERNAL_URL=https://[RAILWAY_API_DOMAIN]
   ```
