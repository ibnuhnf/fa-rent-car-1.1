# Deploy Backend API ke Render + Upstash Redis (Gratis)

## Langkah 1: Buat Redis Gratis di Upstash

1. Buka [upstash.com](https://upstash.com) → Login dengan GitHub.
2. Klik **Create Database**:
   - Name: `fa-redis`
   - Region: `Southeast Asia (Singapore)` *(sama dengan Supabase)*
   - Plan: **Free**
3. Setelah selesai, scroll ke bagian **REST API** → salin `UPSTASH_REDIS_REST_URL`.
   - Format: `rediss://default:[PASSWORD]@[HOST].upstash.io:6379`

---

## Langkah 2: Deploy API NestJS di Render

1. Buka [render.com](https://render.com) → Login dengan GitHub.
2. Klik **New** → **Web Service** → pilih repo `fe-rent-car-hop`.
3. Konfigurasi:
   - **Name**: `fa-rent-car-api`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Root Directory**: *(kosongkan — root monorepo)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @fa/shared build && pnpm --filter @fa/db generate && pnpm --filter @fa/api build
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/main.js
     ```
   - **Instance Type**: Free
4. Klik **Advanced** → tambahkan **Environment Variables**:
   ```env
   NODE_ENV=production
   API_PORT=4000
   PORT=4000
   DATABASE_URL=postgresql://postgres.acdvqlbuiaqnojfttrks:[PASSWORD_ENCODED]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
   REDIS_URL=[REDIS_URL_DARI_UPSTASH]
   S3_ENDPOINT=https://acdvqlbuiaqnojfttrks.supabase.co/storage/v1/s3
   S3_REGION=ap-southeast-1
   S3_BUCKET=fa-private
   S3_ACCESS_KEY=[SUPABASE_S3_ACCESS_KEY]
   S3_SECRET_KEY=[SUPABASE_S3_SECRET_KEY]
   JWT_SECRET=super-secret-jwt-fa-rent-car-cirebon-2026-aman-sekali-min-48-chars
   SEED_ADMIN_EMAIL=admin@farentcar.com
   SEED_ADMIN_PASSWORD=AdminFA2026!
   SEED_DEMO_DATA=true
   ```
5. Klik **Create Web Service** → tunggu build selesai.
6. Buka tab **Networking** → **Generate Domain** → salin domain API (misal `fa-api.onrender.com`).

---

## Langkah 4: Set URL API ke Vercel

Setelah API jalan di Render, kembali ke Vercel dan pastikan `NEXT_PUBLIC_API_URL` menunjuk domain Render:

```env
NEXT_PUBLIC_API_URL=https://fa-rent-car-api.onrender.com
```

*(Ganti dengan domain asli dari Render).*

---

## Catatan

- **Free tier Render** akan sleep setelah 15 menit tanpa request. Request pertama setelah idle memakan ~30 detik.
- Untuk production penuh tanpa sleep, upgrade plan $7/bulan.
- Upstash Redis gratis mendukung BullMQ, tapi ada limit command per bulan.
