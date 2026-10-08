# Preview Statistik UI/UX - FE Rent Car (Statis HTML)

Panduan cepat melihat pratinjau tampilan web **customer & admin** tanpa backend.

## Cara Membuka

### Opsi 1 — Double-click (paling cepat)
Buka file `index.html` di browser dengan double-click. Semua aset (Tailwind, ikon, font) dimuat dari CDN, jadi butuh koneksi internet.

### Opsi 2 — VS Code Live Server
1. Install extension **Live Server** di VS Code.
2. Klik kanan `index.html` → **Open with Live Server**.
3. Browser terbuka di `http://127.0.0.1:5500/docs/preview-static/index.html`.

## Alur Navigasi

### Alur Customer
| Halaman | File | Isi |
|---|---|---|
| Beranda | `index.html` | Hero, search bar, armada unggulan, FAQ |
| Katalog | `katalog.html` | Grid 8 mobil, filter kategori, toggle Lepas Kunci / Dengan Sopir |
| Detail Mobil | `mobil.html` | Galeri, spesifikasi, booking widget, mobil serupa |
| Checkout | `pesan.html` | Form identitas, tanggal, ringkasan biaya |
| Sukses | `sukses.html` | Invoice, status, link portal |
| Cek Status | `cek-status.html` | Input nomor booking, timeline status |
| Portal Tamu | `portal.html` | Detail booking aktif, dokumen digital, sopir |

### Alur Admin
| Halaman | File | Isi |
|---|---|---|
| Login | `login.html` | Email + password |
| Dashboard | `dashboard.html` | KPI, chart booking & status pool, tabel booking terbaru |
| Armada | `armada.html` | Tabel kendaraan, filter, tambah/edit |
| Sopir | `sopir.html` | Tabel sopir, status aktif/off-duty |
| Verifikasi | `verifikasi.html` | Antrian dokumen KTP/SIM, approve/reject |
| Booking | `booking.html` | Tabel semua booking + filter status |
| Pelanggan | `pelanggan.html` | Tabel pelanggan terdaftar |

## Navigasi Antar-Halaman
- Header setiap halaman customer punya link Beranda / Katalog / Cek Status / Admin Login.
- Sidebar setiap halaman admin punya link ke seluruh halaman admin.
- Footer menghubungkan alur customer ↔ admin.

## Catatan
- File ini **mock statis** — data dummy, tanpa API/database.
- Palet warna & tipografi mengikuti `docs/design-reference/design-system-light.md`.
- Untuk versi produktif: lihat `apps/web-customer` (Next.js) & `apps/web-admin` (Next.js).
