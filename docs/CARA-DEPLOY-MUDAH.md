# Panduan Deploy Cepat & Mudah (Vercel + Supabase + Railway)

Ikuti 4 langkah berurutan di bawah ini untuk deploy seluruh sistem FA RENT CAR.

---

## Langkah 1: Siapkan Database di Supabase (Gratis)

1. Buka [supabase.com](https://supabase.com) dan buat akun/login.
2. Klik **New project**:
   - Name: `fa-rent-car`
   - Database Password: *(buat dan simpan password ini)*
   - Region: `Singapore (ap-southeast-1)`
3. Dapatkan link database:
   - Masuk menu **Project Settings** (ikon gerigi) → **Database**.
   - Di bagian **Connection String** → pilih tab **URI** (mode Direct port `5432`).
   - Salin linknya, contoh:
     ```
     postgresql://postgres:[PASSWORD-ANDA]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
4. Buat folder penyimpanan KTP/SIM:
   - Masuk menu **Storage** → **New bucket**.
   - Nama bucket: `fa-private`.
   - **Public bucket: JANGAN dicentang** (harus privat).
   - Klik **Save**.
5. Buat S3 Key (untuk upload file):
   - Masuk **Project Settings** → **Storage** → **S3 Access Keys** → **Create new key**.
   - Salin dan simpan:
     - `Access Key ID`
     - `Secret Access Key`
     - `Endpoint URL` (misal: `https://[PROJECT-REF].supabase.co/storage/v1/s3`)

---

## Langkah 2: Isi Tabel Database dari Komputer Anda

Buka PowerShell di laptop Anda pada folder project ini, lalu jalankan 2 perintah ini:

```powershell
$env:DATABASE_URL="postgresql://postgres:[PASSWORD-ANDA]@db.[PROJECT-REF].supabase.co:5432/postgres"
pnpm --filter @fa/db migrate:deploy
pnpm --filter @fa/db seed
```
> *Tabel dan data contoh 5 mobil otomatis masuk ke database Supabase Anda.*

---

## Langkah 3: Deploy Backend API di Railway

1. Buka [railway.app](https://railway.app) dan login dengan akun GitHub Anda.
2. Klik **New Project** → **Provision Redis** *(tunggu 5 detik sampai selesai)*.
3. Klik tombol **+ Create** di project yang sama → **GitHub Repo** → pilih repo `fe-rent-car-hop`.
4. Buka tab **Variables** pada service repo tersebut, masukkan variabel berikut:
   ```env
   NODE_ENV=production
   API_PORT=4000
   PORT=4000
   DATABASE_URL=postgresql://postgres:[PASSWORD-ANDA]@db.[PROJECT-REF].supabase.co:5432/postgres
   REDIS_URL=${{Redis.REDIS_URL}}
   S3_ENDPOINT=https://[PROJECT-REF].supabase.co/storage/v1/s3
   S3_REGION=ap-southeast-1
   S3_BUCKET=fa-private
   S3_ACCESS_KEY=[ACCESS_KEY_DARI_SUPABASE]
   S3_SECRET_KEY=[SECRET_KEY_DARI_SUPABASE]
   JWT_SECRET=super-secret-jwt-fa-rent-car-cirebon-2026-aman-sekali-min-48-chars
   SEED_ADMIN_EMAIL=admin@farentcar.com
   SEED_ADMIN_PASSWORD=AdminFA2026!
   ```
5. Buka tab **Settings**:
   - **Build Command**:
     ```bash
     pnpm --filter @fa/shared build && pnpm --filter @fa/db generate && pnpm --filter @fa/api build
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/main.js
     ```
   - Di bagian **Networking** → klik **Generate Domain** (contoh: `api-production-xxxx.up.railway.app`).
   - Salin domain API ini untuk Langkah 4.

---

## Langkah 4: Deploy Web Customer & Web Admin di Vercel

Buka [vercel.com](https://vercel.com) dan login dengan GitHub.

### A. Deploy Web Customer (Untuk Pelanggan)
1. Klik **Add New** → **Project** → Pilih repo Anda.
2. Atur konfigurasi:
   - **Project Name**: `fa-rent-car-customer`
   - **Root Directory**: klik Edit → pilih `apps/web-customer`
   - **Build Command**:
     ```bash
     cd ../.. && pnpm --filter @fa/shared build && pnpm --filter @fa/ui build && pnpm --filter @fa/web-customer build
     ```
   - **Environment Variables**:
     - Key: `NEXT_PUBLIC_API_URL`
     - Value: `https://api-production-xxxx.up.railway.app` *(Domain dari Railway Langkah 3)*
3. Klik **Deploy**.

---

### B. Deploy Web Admin (Untuk Operator/Staff)
1. Di Vercel, klik **Add New** → **Project** → Pilih repo yang sama.
2. Atur konfigurasi:
   - **Project Name**: `fa-rent-car-admin`
   - **Root Directory**: klik Edit → pilih `apps/web-admin`
   - **Build Command**:
     ```bash
     cd ../.. && pnpm --filter @fa/shared build && pnpm --filter @fa/ui build && pnpm --filter @fa/web-admin build
     ```
   - **Environment Variables**:
     - Key: `NEXT_PUBLIC_API_URL` → Value: `https://api-production-xxxx.up.railway.app`
     - Key: `API_INTERNAL_URL` → Value: `https://api-production-xxxx.up.railway.app`
3. Klik **Deploy**.

---

## Selesai!

- Web Customer siap dibuka publik untuk booking mobil.
- Web Admin siap dibuka operator dengan login `admin@farentcar.com` / `AdminFA2026!`.
