# Rekonsiliasi Spec — Penyesuaian Spec Baru ke Keputusan Repo

Tanggal: 2026-09-29 · Penulis: tim pengembangan · Status: Mengikat

Dokumen ini menjembatani **specifikasi kebutuhan baru** yang diajukan user (tanggal 2026-09-29) dengan **keputusan repo yang sudah disetujui** (`docs/prd.md` v1.0, `docs/rules.md`, ADR 0001 & 0002, catatan keputusan `docs/task.md`).

Hasilnya: spec baru dipakai sebagai **pemetaan kebutuhan**, lalu setiap butir yang bentrok dengan keputusan repo **disesuaikan** mengikuti keputusan repo. Tidak ada perubahan pada aturan bisnis inti yang sudah berlaku; perubahan mengikuti urutan prioritas dokumen: `rules.md → prd.md → design.md → desainuiux.md → task.md → dokumen ini → kode`.

---

## 1. Ringkasan hasil

| Aspek spec baru                            | Keputusan repo (final)                                            | Status           |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------- |
| Deposit / uang jaminan                     | **Dihapus** — bayar 100% di muka                                  | ✅ Konsisten     |
| Biaya antar-jemput                         | **Dihapus** — ambil & kembali hanya di kantor                     | ✅ Konsisten     |
| Cicilan / DP                               | **Dihapus** — satu kali pelunasan 100%                            | ✅ Konsisten     |
| Akun pelanggan (opsional)                  | **Dihapus** — portal via token acak ≥ 32 byte                     | ✅ Konsisten     |
| Multi-cabang                               | **Dihapus** — satu lokasi                                         | ✅ Konsisten     |
| Pembayaran QRIS                            | **Manual saja** — catat admin, tidak ada payment gateway otomatis | ✅ Konsisten     |
| Peran staf lapangan (tanpa akses keuangan) | **Ditahan** — perlu ADR baru sebelum dipecah                      | ⚠️ Tindak lanjut |
| Bahasa Inggris (opsional)                  | **Tahap lanjut** — i18n belum dirancang, MVP Indonesia saja       | ⚠️ Ditunda       |
| Bagi hasil investor (mobil titipan)        | **Di luar scope MVP** — Fase 6 opsional                           | ⚠️ Ditunda       |

---

## 2. Pemetaan butir per butir

### 2.1 Deposit / uang jaminan

**Spec baru**: "Deposit/jaminan" dicantumkan di tabel harga, dan "deposit dicatat sebagai uang titipan sampai dikembalikan".

**Keputusan repo**: `rules.md` §3.1 "Tidak ada deposit"; `prd.md` §3 "Tidak termasuk deposit"; ADR 0001; `task.md` catatan 2026-09-13 "Deposit/jaminan dihapus".

**Penyesuaian**: Dihapus seluruhnya. Kolom deposit **tidak boleh** muncul di:

- Schema DB (`VehicleRate`, `Invoice`, `BookingCharge` tidak menyimpan deposit).
- UI harga (`VehicleRate` tidak punya `deposit`).
- Invoice PDF (tidak ada baris deposit).
- Form booking customer (tidak ada input deposit).
- Mockup layar (`desainuiux.md` §D checklist sudah melarang "deposit").

### 2.2 Biaya antar-jemput

**Spec baru**: "Biaya tambahan antar-jemput" di kalkulator biaya; "Lokasi ambil/kembali" di form pemesanan dengan pilihan lokasi; pertanyaan ke client "boleh kembali di lokasi berbeda".

**Keputusan repo**: `rules.md` §12 "tidak menampilkan lokasi antar-jemput"; `design.md` §7; `task.md` 2026-09-13 "Ambil/kembali hanya di kantor".

**Penyesuaian**:

- Ambil dan kembali **hanya** di kantor FA RENT CAR (Jl. Pilang Raya No.10, Kedawung).
- Form booking: field lokasi **read-only** bertuliskan "Kantor FA RENT CAR, Kedawung" (lihat `desainuiux.md` A1).
- Kalkulator biaya **tidak** memuat komponen antar-jemput.

### 2.3 Cicilan / DP

**Spec baru**: "DP, Cicilan, Pelunasan" sebagai jenis pembayaran; kalkulator punya komponen diskon/cicilan.

**Keputusan repo**: `rules.md` §3.1 "Tidak ada deposit. Bayar 100% di muka"; `prd.md` §5.1.

**Penyesuaian**:

- Satu-satunya alur pembayaran: lunas 100% di muka saat booking.
- Invoice dibuat penuh, dan booking baru `AKTIF` bila total pembayaran ≥ total invoice (rules §3.4).
- Status pembayaran hanya: `BELUM_BAYAR → LUNAS → REFUND_SEBAGIAN / REFUND_PENUH` (untuk pembatalan, lihat §3).

### 2.4 Akun pelanggan (opsional)

**Spec baru**: "Akun pelanggan: opsional" dengan fitur riwayat sewa dan unduh invoice.

**Keputusan repo**: `rules.md` §3.3 "Customer tidak punya akun"; `prd.md` §3 "Tidak termasuk akun/login untuk customer"; `task.md` 2026-09-13 "Customer tanpa akun; portal via token".

**Penyesuaian**:

- Customer **tidak** punya akun.
- Akses pasca-booking lewat **tautan portal berbasis token acak** (≥ 32 byte, `crypto.randomBytes`, rules §3.3).
- Token **tidak boleh** diambil dari nomor invoice, ID booking, atau nomor HP (rules §3.3, §12).
- Riwayat sewa dan unduh invoice tersedia di halaman portal (lihat PRD §7 fitur C12).

### 2.5 Multi-cabang

**Spec baru**: Pertanyaan "Jumlah cabang dan mobil".

**Keputusan repo**: `rules.md` §12 "tidak menampilkan ... pemilih cabang"; `design.md` §3 topbar admin "Tidak ada pemilih cabang".

**Penyesuaian**: Single-location. Data domain **tidak** memuat `branch_id`. Pengaturan usaha (`Setting`) tunggal, alamat tunggal.

### 2.6 Pembayaran QRIS & payment gateway

**Spec baru**: "QRIS" sebagai metode pembayaran; bertanya apakah perlu "pembayaran online (Midtrans/Xendit)".

**Keputusan repo**: `rules.md` §3.2 "Tidak ada payment gateway. Pembayaran hanya dicatat manual oleh admin"; `prd.md` §3.

**Penyesuaian**:

- QRIS **dapat** diterima sebagai metode transfer bank manual (customer transfer ke QRIS statis usaha, lalu admin cocokkan nominal + bukti).
- **Tidak ada** integrasi Midtrans / Xendit / Duitku di MVP.
- Catatan di invoice: "Rekening / QRIS resmi usaha" (statis, dicetak di kop).

### 2.7 Peran staf lapangan (tanpa akses keuangan)

**Spec baru**: Peran keempat "Staf lapangan" khusus serah-terima (checklist, foto, KM, BBM), **tanpa** akses keuangan.

**Status repo saat ini**: Hanya `STAFF` & `SUPERADMIN` (PRD §4, schema enum `AdminRole`).

**Tindak lanjut**: Butuh ADR baru sebelum diimplementasi. ADR akan menjawab:

- Apakah akan menambah `AdminRole.FIELD_STAFF` atau memisahkan izin dengan policy/kemampuan per modul?
- Modul yang dibatasi: pembayaran, refund, pengeluaran, laporan keuangan, tarif.
- Modul yang diizinkan: booking baca, verifikasi dokumen baca, serah-terima tulis, armada baca.

**Sampai ADR diterbitkan**: `STAFF` saat ini mencakup seluruh fungsi operasional kecuali tindakan yang oleh `rules.md` §3 dikhususkan untuk `SUPERADMIN` (refund, hapus data, ubah tarif, kelola staff). Pemisahan granular ditunda ke Fase 3.

### 2.8 Bahasa Inggris (opsional)

**Spec baru**: "Bahasa Indonesia (opsi Inggris)".

**Status repo**: `rules.md` §7 "Semua teks UI bahasa Indonesia". i18n belum dirancang.

**Penyesuaian**:

- MVP: Indonesia saja.
- Arsitektur string UI: gunakan **key** di komponen, hardcoded string Indonesia diganti bertahap bila i18n diaktifkan.
- i18n masuk **Fase 6** (lanjutan opsional).

### 2.9 Bagi hasil investor (mobil titipan)

**Spec baru**: Fase 6 "Mobil titipan investor (bagi hasil)".

**Status repo**: Tidak ada di PRD.

**Penyesuaian**: Di luar scope MVP. Dicatat sebagai kandidat Fase 6 jika user menambahkan requirement + aturan bisnis (persentase bagi hasil, pencatatan PPh, dst.).

---

## 3. Konfirmasi jawaban atas pertanyaan client

Spec baru memuat 9 pertanyaan ke client. Di bawah jawaban yang mengikat untuk repo ini (mengikuti keputusan di atas):

| #   | Pertanyaan                                                | Jawaban                                                                                                 |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Lepas kunci saja atau dengan sopir?                       | **Dua-duanya** (PRD §2). Sopir per item, anti-bentrok jadwal (rules §3.10).                             |
| 2   | Pembayaran online (Midtrans/Xendit) atau transfer manual? | **Transfer manual** + validasi admin. QRIS statis diperbolehkan sebagai media transfer.                 |
| 3   | Jumlah cabang & mobil, boleh kembali di lokasi beda?      | **Satu cabang, satu lokasi**. Kembali hanya di kantor.                                                  |
| 4   | Mobil titipan investor (bagi hasil)?                      | **Di luar scope MVP**. Kandidat Fase 6.                                                                 |
| 5   | Aturan pembatalan, refund, tarif musiman?                 | **Refund butuh approval superadmin** (rules §3.8). Detail persentase menunggu jawaban client di Fase 3. |
| 6   | Bahasa website?                                           | **Indonesia saja** untuk MVP. Inggris masuk Fase 6.                                                     |
| 7   | WhatsApp otomatis (WhatsApp Business API, berbayar)?      | **Template pesan manual** (tautan `wa.me` di MVP). WhatsApp Business API masuk Fase 6.                  |
| 8   | GPS sudah terpasang? Vendor punya API?                    | **Fase 4 diblokir** sampai vendor ditentukan (PRD §15 #2). Adapter generik sudah disiapkan.             |
| 9   | Hosting, domain, backup?                                  | **Tanggung jawab client**. Repo menyediakan Docker Compose + panduan di `DEPLOYMENT.md`.                |

---

## 4. Perubahan yang dihasilkan pada dokumen repo

Berikut perubahan kecil yang dilakukan untuk menjaga konsistensi. Tidak ada perubahan pada aturan bisnis inti.

1. **`docs/task.md`** — tabel "Catatan keputusan" ditambah entri baru tanggal 2026-09-29 tentang rekonsiliasi spec baru.
2. **`docs/spec-reconciliation.md`** (dokumen ini) — dibuat sebagai acuan hidup.
3. **`prd.md`, `rules.md`, `design.md`, `desainuiux.md`** — **tidak diubah**. Repo sudah konsisten dengan arah spec baru setelah penyesuaian di §2.

---

## 5. Definisi selesai

Dokumen ini mengikat sampai ada ADR baru yang mencabutnya. Jika di kemudian hari ada perubahan (mis. mengaktifkan deposit), harus ada ADR baru + revisi `rules.md` + migrasi DB.
