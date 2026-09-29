# Task / To-do — FA RENT CAR

Penanda: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · `[!]` diblokir

Urutan fase mengikuti `docs/prd.md` §13. Setiap task selesai harus punya: kode, test (jika logika), dan update dokumen jika perilaku berubah.

---

## Fase 0 — Fondasi

### 0.1 Monorepo & tooling

- [x] Inisialisasi pnpm workspace + Turborepo (`apps/*`, `packages/*`)
- [x] Konfigurasi TypeScript strict, ESLint, Prettier bersama
- [x] `.editorconfig`, `.gitignore`, `.env.example`
- [x] Docker Compose dev: PostgreSQL 16, Redis, MinIO — mode native juga tersedia; pengujian layanan lokal memakai native.
- [x] Script: `dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed` — termasuk pengaman database lokal dan setup ulang idempotent.
- [x] `.hoplite/settings.json` (setup & run script) agar preview berjalan — konfigurasi dan run script efektif diverifikasi pada admin/customer/API.
- [x] GitHub Actions: lint + test + build pada PR — workflow tersedia; hasil CI remote dilaporkan terpisah dari check lokal.

### 0.2 Database (`packages/db`)

- [~] Prisma schema lengkap sesuai PRD §12 — schema awal admin/sesi/audit/armada/pengaturan; model booking dan operasional menyusul.
- [~] Enum: status booking, dokumen, pembayaran, peran, status mobil — peran dan mobil sudah diimplementasikan.
- [~] Constraint: unik plat, unik nomor invoice, index tanggal booking — plat unik dan indeks fondasi; invoice/booking belum tersedia.
- [x] Migrasi awal — diuji dari schema PostgreSQL kosong dan pemeriksaan constraint/audit.
- [x] Seed: superadmin, 5 mobil contoh, tarif, pengaturan default — idempotent; tidak menimpa admin atau mobil yang telah diedit.

### 0.3 Shared (`packages/shared`)

- [~] Zod schema untuk semua DTO API — kontrak Fase 0; endpoint fase berikutnya belum diimplementasikan.
- [~] Util harga: kombinasi harian/mingguan/bulanan, weekend, sopir, promo (pure function + unit test) — optimizer eksplisit tersedia; kebijakan durasi dan prioritas harga belum ditetapkan, lihat ADR 0001.
- [x] Util tanggal WIB, format Rupiah
- [x] Konstanta: durasi hold default, batas ukuran file, dsb

### 0.4 API skeleton (`apps/api`)

- [x] NestJS bootstrap, config module, validasi global (Zod pipe)
- [x] Prisma service, health check
- [x] Auth admin: login, refresh, logout, hash bcrypt — termasuk rotasi/replay, race logout/refresh, pencabutan user, dan koordinasi antartab.
- [x] RBAC guard: `staff`, `superadmin`
- [x] Modul storage: upload signed URL, akses privat — endpoint admin (upload URL & download URL) aktif dengan validasi MIME allowlist, batas 5 MB, verifikasi magic bytes, dan signed URL <= 10 menit.
- [x] Modul audit log (service dalam transaksi untuk aksi sensitif; metadata request tanpa data pribadi), lihat ADR 0002.
- [x] BullMQ + Redis: queue dasar, scheduler — job expiry booking belum tersedia sebelum Fase 1.
- [x] Error format seragam, logging, rate limit

### 0.5 Web skeleton

- [x] `packages/ui`: Tailwind preset dari design.md + komponen dasar (Button, Badge, Card, StatCard, Input, Segmented, Table, Sidebar, Topbar, BottomTabBar)
- [x] `apps/web-admin`: Next.js, layout sidebar/topbar sesuai design.md, login page, guard route — pencarian/paginasi armada baca-saja, status layanan, profil, dan logout diuji pada 1440/390/360 px.
- [x] `apps/web-customer`: Next.js, layout dasar — informasi usaha dan kontak resmi; bukan landing/katalog pemesanan Fase 2.
- [x] Client API bertipe (fetch wrapper + Zod)
- [ ] Persetujuan visual user untuk layar tanpa referensi langsung (login, armada baca-saja, status/profil, dan halaman informasi customer sementara). Bukti screenshot dilampirkan pada PR UI; belum dianggap desain final.

---

## Fase 1 — Admin MVP

### 1.1 Armada

- [ ] API CRUD vehicle + foto (multi upload, urutan)
- [ ] API tarif per mobil (harian/mingguan/bulanan/sopir/overtime/keterlambatan)
- [ ] API pricing rules (weekend/musim liburan)
- [ ] API ketersediaan: `GET /availability?from&to` (anti double-booking, buffer)
- [ ] UI daftar mobil, form tambah/ubah, galeri foto, status
- [ ] UI tarif per mobil
- [ ] Kalender ketersediaan (per mobil & gabungan)

### 1.2 Booking manual

- [ ] API create booking (multi item, sopir per item) dengan transaksi & lock ketersediaan
- [ ] Generate nomor invoice, snapshot harga
- [ ] Hold expiry job (2 jam, dapat diatur), perpanjang hold
- [ ] API daftar & detail booking, filter
- [ ] UI booking manual (pilih mobil, tanggal, customer)
- [ ] UI daftar booking + detail + timeline

### 1.3 Verifikasi & pembayaran

- [ ] API dokumen: lihat (signed URL), setujui/tolak + alasan
- [ ] API pembayaran: input nominal, tanggal, bank, upload bukti; validasi vs total invoice
- [ ] Transisi status otomatis → `Aktif` bila dokumen OK + lunas
- [ ] UI layar verifikasi + pembayaran satu halaman
- [ ] Pembatalan booking (tanpa refund dulu)

### 1.4 Invoice

- [ ] Template PDF invoice (kop, rincian, total, rekening, syarat)
- [ ] Revisi invoice (versi baru saat booking diubah), simpan semua versi
- [ ] Perubahan booking: perpanjangan, ganti mobil, tambah/kurang mobil
- [ ] UI riwayat invoice & unduh

### 1.5 Pengaturan & staff

- [ ] Pengaturan usaha, rekening, durasi hold, buffer, template WA
- [ ] Manajemen staff (superadmin)
- [ ] UI audit log

---

## Fase 2 — Customer MVP

### 2.1 Publik

- [x] Landing page (ref: design.md §9 beranda) — armada statis dari design-reference; akan diganti API publik (baris berikut) setelah tersedia. Lihat commit 6f7241c.
- [ ] API publik: daftar mobil tersedia + filter + urut
- [ ] Halaman pencarian & katalog + filter
- [ ] Detail mobil (galeri, spesifikasi, tarif, kalender)
- [ ] Estimasi harga realtime (pakai util shared)

### 2.2 Booking guest

- [ ] Keranjang multi-mobil (state client, persist localStorage)
- [ ] Form data penyewa + validasi
- [ ] Upload KTP/SIM langsung ke storage via signed URL
- [ ] Kode promo (validasi API)
- [ ] Submit booking → invoice → token portal
- [ ] Halaman sukses: countdown, rekening, salin, tombol WhatsApp berisi pesan otomatis

### 2.3 Portal status

- [ ] API portal berbasis token (read-only + aksi terbatas)
- [ ] Halaman status: timeline, dokumen, pembayaran, unduh invoice
- [ ] Unggah ulang dokumen
- [ ] Ajukan perpanjangan/perubahan → masuk antrean admin
- [ ] Info pengambilan & peta
- [ ] Rating & ulasan setelah selesai

### 2.4 Kualitas

- [ ] E2E Playwright: alur booking penuh (mobile & desktop)
- [ ] Uji konkuren anti double-booking
- [ ] SEO dasar (meta, OG, sitemap)

---

## Fase 3 — Operasional

### 3.1 Sopir

- [ ] CRUD sopir + dokumen + tarif
- [ ] Penugasan ke booking item, cek bentrok
- [ ] Jadwal sopir, riwayat, penilaian

### 3.2 Serah-terima digital

- [ ] Form checkout/checkin: checklist, odometer, BBM, foto multi, diagram kerusakan
- [ ] Tanda tangan customer di layar
- [ ] Berita acara PDF → portal customer
- [ ] Hitung biaya tambahan otomatis → invoice revisi
- [ ] Status booking → `Selesai`

### 3.3 Keuangan

- [ ] Refund: pengajuan → approval superadmin → bukti
- [ ] Pengeluaran operasional (kategori, bukti)
- [ ] Kas & shift staff
- [ ] Laporan: pendapatan, pengeluaran, laba, per mobil, per periode; ekspor PDF/Excel

### 3.4 CRM & promo

- [ ] Profil customer otomatis, label (baru/langganan/VIP/blacklist), catatan
- [ ] Promo: kode, jenis, kuota, masa berlaku, batasan
- [ ] Aturan harga dinamis (tanggal khusus)

### 3.5 Dashboard lengkap

- [ ] Kartu statistik + growth indicator
- [ ] Grafik booking & pendapatan
- [ ] Monitoring operasional hari ini
- [ ] Analitik armada, heatmap
- [ ] Alert (keterlambatan, servis, dokumen)
- [ ] Filter tanggal, susun widget, ekspor

### 3.6 Armada lanjutan

- [ ] Riwayat servis, pengingat servis/pajak/STNK/asuransi
- [ ] Dokumen kendaraan
- [ ] Import/export Excel armada & booking

### 3.7 Sistem

- [ ] Notifikasi internal (in-app)
- [ ] Multi-level approval umum (hapus mobil/booking, ubah tarif)
- [ ] PWA admin (manifest, service worker, ikon)
- [ ] Retensi & penghapusan otomatis dokumen KTP/SIM

---

## Fase 4 — GPS

> Diblokir sampai vendor/perangkat ditentukan (PRD §15 #2)

- [!] Riset protokol perangkat & API vendor
- [ ] Ingest posisi (webhook/polling)
- [ ] Peta realtime per mobil
- [ ] Histori perjalanan per booking
- [ ] Geofence & alert

---

## Deploy & operasi

- [ ] Dockerfile per app, Compose produksi
- [ ] Backup DB harian otomatis
- [ ] Monitoring & log
- [ ] Domain, HTTPS
- [ ] Panduan penggunaan admin (singkat)

---

## Catatan keputusan

| Tanggal    | Keputusan                                                                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-13 | Deposit/jaminan dihapus; bayar 100% di muka                                                                                                                                                                                                                                               |
| 2026-09-13 | Ambil/kembali hanya di kantor                                                                                                                                                                                                                                                             |
| 2026-09-13 | Customer tanpa akun; portal via token                                                                                                                                                                                                                                                     |
| 2026-09-13 | Stack: NestJS + Next.js + Prisma + PostgreSQL                                                                                                                                                                                                                                             |
| 2026-09-13 | Contoh desain awal ditolak; referensi Stitch dari user diadopsi → `docs/design.md`                                                                                                                                                                                                        |
| 2026-09-13 | Irisan awal Fase 0 dibatasi pada fondasi dan sesi admin nyata; modul rental tidak dipalsukan → `docs/adr/0001-foundation-slice.md`                                                                                                                                                        |
| 2026-09-13 | Rotasi keluarga sesi, CSRF, dan audit dalam transaksi database → `docs/adr/0002-admin-session-security.md`                                                                                                                                                                                |
| 2026-09-29 | Rekonsiliasi spec baru (2026-09-29) → `docs/spec-reconciliation.md`: deposit, antar-jemput, cicilan, akun customer, multi-cabang, payment gateway, i18n, bagi hasil investor **tetap tidak diaktifkan**; staf lapangan terpisah menunggu ADR baru; jawaban 9 pertanyaan client ditetapkan |
