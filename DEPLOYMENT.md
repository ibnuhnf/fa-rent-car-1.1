# Panduan Deploy FA Rent Car

Dokumen ini berisi langkah-langkah untuk melakukan pengujian lokal serta penyiapan deployment aplikasi FA Rent Car ke lingkungan server/production.

---

## 1. Prasyarat Sistem

- **Node.js**: v24.x (atau kompatibel `>=24 <25`)
- **pnpm**: v10.x (`>=10 <11`)
- **Docker & Docker Compose**: Untuk menjalankan service pendukung (PostgreSQL, Redis, MinIO)

---

## 2. Persiapan Environment

1. Salin berkas konfigurasi `.env.example` ke `.env`:

   ```bash
   cp .env.example .env
   ```

2. Sesuaikan variabel di dalam `.env` sesuai kebutuhan server/production:
   - `NODE_ENV=production`
   - `POSTGRES_PASSWORD` & `DATABASE_URL`
   - `REDIS_PASSWORD` & `REDIS_URL`
   - `MINIO_ROOT_PASSWORD`, `S3_SECRET_KEY`, dan `S3_ENDPOINT`
   - `JWT_SECRET` (minimal 48 karakter acak aman)

---

## 3. Jalankan Service Database & Infrastructure

Gunakan Docker Compose untuk menyalakan PostgreSQL, Redis, dan MinIO:

```bash
docker compose up -d
```

---

## 4. Install Dependensi & Setup Database

1. **Install dependensi project**:

   ```bash
   pnpm install
   ```

2. **Generate Client Database & Migrasi**:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

3. _(Opsional)_ **Seed data awal / Admin**:
   ```bash
   pnpm db:seed
   ```

---

## 5. Build Project

Jalankan perintah build menggunakan Turborepo:

```bash
pnpm build
```

---

## 6. Pengjalanan Aplikasi (Production Run)

### Opsi A: Menggunakan PM2 / Node Process Manager

1. **Backend API (`apps/api`)**:

   ```bash
   node apps/api/dist/index.js
   ```

2. **Web Admin (`apps/web-admin`)**:

   ```bash
   pnpm --filter @fa/web-admin start
   ```

3. **Web Customer (`apps/web-customer`)**:
   ```bash
   pnpm --filter @fa/web-customer start
   ```

### Opsi B: Menggunakan Reverse Proxy (Nginx / Caddy)

Arahkan domain ke masing-masing port service:

- **API Backend**: Port `4000`
- **Web Customer**: Port `3000` (atau port default Next.js/Vite)
- **Web Admin**: Port `3001`
