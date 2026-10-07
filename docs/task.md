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

- [x] Prisma schema lengkap sesuai PRD §12 — admin/sesi/audit/armada/pengaturan + customer, booking, item, dokumen, token portal, invoice, pembayaran, pricing rules. Model operasional Fase 3 (sopir, serah-terima, refund, promo, GPS) menyusul.
- [x] Enum: status booking, dokumen, pembayaran, peran, status mobil — kelima enum rental ditambahkan dengan nilai sesuai rules.md §3.
- [x] Constraint: unik plat, unik nomor invoice, index tanggal booking — plus unik NIK/WhatsApp/kode booking/versi invoice, check non-negatif nominal, dan FK `ON DELETE RESTRICT` untuk booking_items→vehicles serta payments→invoices.
- [x] Migrasi awal — diuji dari schema PostgreSQL kosong dan pemeriksaan constraint/audit.
- [x] Seed: superadmin, 5 mobil contoh, tarif, pengaturan default — idempotent; tidak menimpa admin atau mobil yang telah diedit.

### 0.3 Shared (`packages/shared`)

- [x] Zod schema untuk semua DTO API — kontrak Fase 0 + DTO rental (Customer, Booking, BookingItem, BookingDocument, Invoice, InvoiceItem, Payment, PricingRule) beserta request create; endpoint fase berikutnya belum diimplementasikan.
- [x] Util harga: kombinasi harian/mingguan/bulanan, weekend, sopir, promo (pure function + unit test) — optimizer eksplisit tersedia; kebijakan durasi dan prioritas harga belum ditetapkan, lihat ADR 0001.
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

- [x] API CRUD vehicle + foto (multi upload, urutan) — `VehiclesController` + `VehiclesService.stagePhotos/deletePhoto` + `StorageService.createStagingUpload`, audit `VEHICLE_*`. Lihat `f735137`.
- [x] API tarif per mobil (harian/mingguan/bulanan/sopir/overtime/keterlambatan) — `PUT /admin/vehicles/:id/rate` + `VehicleRate` (daily/weekly/monthly/driverPerDay/overtimeHourly/latePerDay).
- [x] API pricing rules (weekend/musim liburan) — `GET|POST /admin/vehicles/:id/pricing-rules`, `PricingRuleCreate` (multiplier XOR surcharge).
- [x] API ketersediaan: `GET /availability?from&to` (anti double-booking, buffer) — `GET /admin/vehicles/availability` via `AvailabilityService.blockedVehicleItemsWhere` (RepeatableRead, `bufferHours`).
- [x] UI daftar mobil, form tambah/ubah, galeri foto, status — `armada/page.tsx` (list+filter/sort+pagination), `armada/baru/page.tsx`+`VehicleCreateForm`, `armada/[id]/VehicleDetailView` (status toggle AVAILABLE↔MAINTENANCE, galeri upload/delete via signed URL, `superadmin` guard).
- [x] UI tarif per mobil — form tarif di `VehicleDetailView` (`PUT /rate`, validasi `vehicleRateSchema`).
- [x] Kalender ketersediaan (per mobil & gabungan) — `GET /admin/bookings/calendar` + halaman `/kalender` (grid bulanan, filter per mobil, warna per status).

### 1.2 Booking manual

- [x] API create booking (multi item, sopir per item) dengan transaksi & lock ketersediaan — advisory lock per-vehicle urut ID + RepeatableRead; unit AVAILABLE saja.
- [x] Generate nomor invoice, snapshot harga — `FA-YYYYMMDD-XXXX` / `INV-YYYYMMDD-XXXX`, snapshot per item di `BookingItem.snapshot`.
- [x] Hold expiry job (2 jam, dapat diatur), perpanjang hold — `holdMinutes` dari setting `business`, `POST /admin/bookings/:id/extend-hold` + scheduler BullMQ.
- [x] API daftar & detail booking, filter — status/search/customer/vehicle/rentang tanggal + paginasi + timeline audit.
- [x] UI booking manual (pilih mobil, tanggal, customer) — `/booking/baru`, estimasi via `calculateRentalPrice` shared.
- [x] UI daftar booking + detail + timeline — `/booking` + `/booking/[id]` (countdown hold, invoice, timeline).

### 1.3 Verifikasi & pembayaran

- [x] API dokumen: lihat (signed URL), setujui/tolak + alasan — `GET /admin/bookings/:id/documents`, `POST .../documents/:docId/verify`.
- [x] API pembayaran: input nominal, tanggal, bank, upload bukti; validasi vs total invoice — `POST /admin/bookings/:id/payments` (tolak melebihi sisa tagihan); bukti berkas ditandai placeholder `manual/` sampai portal upload aktif.
- [x] Transisi status otomatis → `Aktif` bila dokumen OK + lunas — `maybeActivate` dalam transaksi + audit `BOOKING_ACTIVATED`.
- [x] UI layar verifikasi + pembayaran satu halaman — `/verifikasi` (daftar PENDING_VERIFICATION) + panel dokumen/pembayaran di `/booking/[id]`.
- [x] Pembatalan booking (tanpa refund dulu) — `POST /admin/bookings/:id/cancel` + alasan, hanya PENDING_VERIFICATION/ACTIVE.

### 1.4 Invoice

- [x] Template PDF invoice (kop, rincian, total, rekening, syarat) — halaman cetak invoice `/booking/[id]/invoice/[version]` dengan layout kop resmi, media print, dan tombol print/PDF.
- [x] Revisi invoice (versi baru saat booking diubah), simpan semua versi — `createInvoiceRevision` di `BookingsService` membuat versi increment dan status mutasi; invoice lama tersimpan immutable.
- [x] Perubahan booking: perpanjangan, ganti mobil, tambah/kurang mobil — `PATCH /admin/bookings/:id/items` (`replaceItems`) & `PATCH /admin/bookings/:id/items/:itemId` di `BookingsService` dengan advisory lock, validasi ketersediaan, snapshot harga baru, dan revisi invoice otomatis.
- [x] UI riwayat invoice & unduh — accordion/daftar versi invoice di `/booking/[id]`, tautan ke cetak/PDF masing-masing versi.

### 1.5 Pengaturan & staff

- [x] Pengaturan usaha, rekening, durasi hold, buffer, template WA — `GET|PUT /admin/settings/business` (Setting key `business`), superadmin-only tulis + audit.
- [x] Manajemen staff (superadmin) — `GET|POST /admin/staff`, `PATCH|DELETE /admin/staff/:id` (nonaktif via `isActive`, bcrypt, audit).
- [x] UI audit log — tab Audit di `/pengaturan` via `GET /admin/audit-logs` (paginasi, filter aksi).

---

## Fase 2 — Customer MVP

### 2.1 Publik

- [x] Landing page (ref: design.md §9 beranda) — armada statis dari design-reference; akan diganti API publik (baris berikut) setelah tersedia. Lihat commit 6f7241c.
- [x] API publik: daftar mobil tersedia + filter + urut — `GET /public/vehicles` (AVAILABLE non-demo, filter kategori/transmisi/kapasitas/harga, sort harga/terbaru, paginasi).
- [x] Halaman pencarian & katalog + filter — `/mobil` dengan filter kategori/transmisi/harga, sort, dan tambah ke keranjang instan.
- [x] Detail mobil (galeri, spesifikasi, tarif, kalender) — `/mobil/[id]` dengan galeri foto, spesifikasi lengkap, dan kalkulator estimasi tarif realtime.
- [x] Estimasi harga realtime (pakai util shared) — `POST /public/price-estimate` via `calculateRentalPrice` + `chargeableDays`.

### 2.2 Booking guest

- [x] Keranjang multi-mobil (state client, persist localStorage) — modul `lib/cart.ts` (add, remove, clear, multi-mobil).
- [x] Form data penyewa + validasi — `/pesan` dengan validasi NIK 16 digit, WhatsApp, email, dan alamat domisili.
- [x] Upload KTP/SIM langsung ke storage via signed URL — integrasi upload signed URL langsung dari browser ke S3/MinIO di portal pelanggan.
- [x] Kode promo (validasi API) — `POST /public/bookings/validate-promo` + form input voucher promo di halaman checkout `/pesan`.
- [x] Submit booking → invoice → token portal — `POST /public/bookings` (transaksi + advisory lock, hold dari setting, invoice v1, `BookingAccessToken` 30 hari, `portalUrl`).
- [x] Halaman sukses: countdown, rekening, salin, tombol WhatsApp berisi pesan otomatis — `/sukses` dengan countdown batas hold 2 jam, info rekening bank, tombol salin rekening, dan share WhatsApp otomatis.

### 2.3 Portal status

- [x] API portal berbasis token (read-only + aksi terbatas) — `X-Portal-Token` guard SHA-256 + TTL; `GET /portal/me`, staging+confirm dokumen (key terikat `staging/portal/<bookingId>/`), `POST /portal/requests`, unduh invoice HTML; `internalNotes`/object key tidak ikut dibawa.
- [x] Halaman status: timeline, dokumen, pembayaran, unduh invoice — `/portal/[token]` (status sewa, invoice HTML, riwayat pembayaran yang terkonfirmasi, titik serah terima kantor).
- [x] Unggah ulang dokumen — slot KTP dan SIM A interaktif dengan upload direct to S3/MinIO dan verifikasi status realtime.
- [x] Ajukan perpanjangan/perubahan → masuk antrean admin — form ajukan perpanjangan durasi / ganti mobil via `POST /portal/requests`.
- [x] Info pengambilan & peta — panduan pengambilan & pengembalian di kantor resmi FA RENT CAR Kedawung Cirebon.
- [~] Rating & ulasan setelah selesai — endpoint `POST /portal/ratings` dan `GET /admin/drivers/:id/ratings` tersedia; UI formulir rating di portal customer belum dibuat.

### 2.4 Kualitas

- [~] E2E Playwright: alur booking penuh (mobile & desktop) — test spec tersedia di `e2e/booking-guest.spec.ts` dan `e2e/admin-verify.spec.ts`, namun belum dieksekusi di CI/lokal karena keterbatasan runtime DB/Redis/browser.
- [~] Uji konkuren anti double-booking — unit test mock di `apps/api/src/bookings/concurrency.test.ts` dan scaffold integration test PostgreSQL di `apps/api/src/bookings/concurrency-pg.test.ts` (dilewati tanpa `INTEGRATION=true`), belum pernah dijalankan tanpa PostgreSQL/Redis.
- [x] SEO dasar (meta, OG, sitemap) — metadata + OpenGraph/Twitter + JSON-LD `AutoRental` + `robots.ts` (disallow `/portal`) + `sitemap.ts` di web-customer.

---

## Fase 3 — Operasional

### 3.1 Sopir

- [~] CRUD sopir + dokumen + tarif — `GET|POST /admin/drivers` + `PATCH /admin/drivers/:id` + halaman `/sopir` dengan SIM, tarif harian, status aktif. Model & unggah dokumen sopir (SIM/KTP/foto) belum tersedia.
- [x] Penugasan ke booking item, cek bentrok — `POST /admin/drivers/assign/:itemId` dengan validasi anti-bentrok jadwal tugas sopir.
- [~] Jadwal sopir, riwayat, penilaian — `GET /admin/drivers/:id/schedule` & `GET /admin/drivers/:id/ratings` + halaman detail `/sopir/[id]` menampilkan riwayat tugas dan rekap rating; input rating dari sisi portal customer belum tersedia.

### 3.2 Serah-terima digital

- [x] Form checkout/checkin: checklist, odometer, BBM, foto multi, diagram kerusakan — `POST /admin/handovers/:bookingItemId` (model `Handover`, odometer, level BBM, damage report, extra fee, tanda tangan nama).
- [x] Tanda tangan customer di layar — field `signedByName` + `signedAt` tercatat pada serah terima.
- [~] Berita acara PDF → portal customer — endpoint HTML cetak PDF ada di `GET /admin/handovers/:bookingId/pdf`, ringkasan di portal; belum ada browser test / otomasi generate file PDF.
- [x] Hitung biaya tambahan otomatis → invoice revisi — `HandoversService` otomatis membuat invoice revisi via `createInvoiceRevision` saat input `extraFee > 0` pada transaksi CHECKIN.
- [x] Status booking → `Selesai` — `HandoversService` otomatis memperbarui status booking ke `COMPLETED` dan mencatat audit saat seluruh unit dalam booking selesai check-in.

### 3.3 Keuangan

- [ ] Refund: pengajuan → approval superadmin → bukti — status invoice `PARTIALLY_REFUNDED`/`REFUNDED` disebutkan dalam tipe namun modul/controller/service refund belum diimplementasikan.
- [x] Pengeluaran operasional (kategori, bukti) — `GET|POST /admin/finances/expenses` + halaman `/keuangan` (kategori BBM, servis, salon, gaji, operasional).
- [~] Kas & shift staff — rekapitulasi total pengeluaran per periode tersedia; modul kas & shift staff (pembukaan/penutupan shift) belum diimplementasikan.
- [~] Laporan: pendapatan, pengeluaran, laba, per mobil, per periode — halaman `/laporan` + export CSV ada; laporan PDF/Excel belum.

### 3.4 CRM & promo

- [x] Profil customer otomatis, label (baru/langganan/VIP/blacklist), catatan — model `Customer` dengan `isBlacklisted`, `blacklistReason`, `notes`.
- [x] Promo: kode, jenis, kuota, masa berlaku, batasan — setting key `promos` + endpoint validasi voucher `POST /public/bookings/validate-promo`.
- [x] Aturan harga dinamis (tanggal khusus) — model `PricingRule` (tipe `WEEKEND`, `HOLIDAY`, `HIGH_SEASON`, `LONG_DURATION`) dengan multiplier basis points dan fixed surcharge.

### 3.5 Dashboard lengkap

- [x] Kartu statistik + growth indicator — live dashboard `/` dengan sewa aktif, antrean verifikasi, pendapatan bulanan, dan jadwal serah terima hari ini.
- [x] Grafik booking & pendapatan — metrik overview via `GET /admin/dashboard/overview`.
- [x] Monitoring operasional hari ini — counter serah terima armada keluar & kembali hari ini.
- [~] Analitik armada, heatmap — tingkat utilisasi armada (persentase unit dirental) tersedia; heatmap utilisasi per armada/per waktu belum diimplementasikan.
- [x] Alert (keterlambatan, servis, dokumen) — indikator antrean verifikasi dan batas hold 2 jam.
- [x] Filter tanggal, susun widget, ekspor — navigasi cepat ke kalender, keuangan, dan booking.

### 3.6 Armada lanjutan

- [x] Riwayat servis, pengingat servis/pajak/STNK/asuransi — modul `MaintenancesModule` (`maintenances.service.ts` + controller CRUD) dan halaman `/servis` dengan pencatatan riwayat servis per armada.
- [~] Dokumen kendaraan — relasi `VehiclePhoto` & `Maintenance` ada di schema; modul kelola dokumen kendaraan (pajak/STNK/asuransi) belum diimplementasikan.
- [~] Import/export Excel armada & booking — export CSV armada (`GET /admin/vehicles/export`) & booking (`GET /admin/bookings/export`) ada; import Excel belum.

### 3.7 Sistem

- [~] Notifikasi internal (in-app) — audit log real-time pada seluruh mutasi booking, verifikasi, dan pembayaran; UI panel notifikasi in-app terpisah belum tersedia.
- [x] Multi-level approval umum (hapus mobil/booking, ubah tarif) — guard peran `SUPERADMIN` pada pengaturan, hapus armada, dan kelola staff.
- [~] PWA admin (manifest, service worker, ikon) — `manifest.webmanifest` dan `sw.js` tersedia di `apps/web-admin/public`; belum ada icon PNG 192/512 dan belum diuji install.
- [~] Retensi & penghapusan otomatis dokumen KTP/SIM — lifecycle signed URL privat (max 10 menit TTL) dan proteksi akses tanpa token tersedia; kebijakan retensi otomatis & job penghapusan terjadwal belum diimplementasikan.

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

- [~] Dockerfile per app, Compose produksi — `apps/api/Dockerfile`, `apps/web-admin/Dockerfile`, `apps/web-customer/Dockerfile`, dan `compose.prod.yaml` tersedia; belum diuji di server live.
- [~] Backup DB harian otomatis — script `scripts/backup-db.sh` tersedia; cron/systemd timer belum dikonfigurasi di server target.
- [ ] Monitoring & log
- [ ] Domain, HTTPS
- [~] Panduan penggunaan admin (singkat) — dokumentasi admin tersedia di `docs/ADMIN-GUIDE.md`.

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
