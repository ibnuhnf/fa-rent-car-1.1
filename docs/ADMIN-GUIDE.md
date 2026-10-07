# Panduan Penggunaan Web Admin FA RENT CAR

## 1. Login
- Buka portal admin di `/login`.
- Masukkan email dan kata sandi staff/superadmin.
- Sesi menggunakan HTTP-only cookie dengan rotasi token otomatis.

## 2. Manajemen Armada (/armada)
- **Tambah mobil**: Buka `/armada/baru`, isi spesifikasi, transmisi, kapasitas, dan tarif dasar.
- **Galeri & Status**: Di halaman detail mobil (`/armada/[id]`), unggah foto dan ubah status unit (`Tersedia`, `Servis`, `Nonaktif`).
- **Tarif Khusus**: Atur tarif sopir per hari, denda overtime per jam, dan keterlambatan per hari.

## 3. Booking Manual (/booking/baru)
- Pilih rentang tanggal sewa dan unit mobil yang tersedia.
- Masukkan data identitas customer (NIK, WhatsApp, Alamat).
- Konfirmasi akan otomatis menerbitkan invoice versi 1 dengan hold 2 jam.

## 4. Verifikasi Dokumen & Pembayaran (/verifikasi)
- Periksa kesesuaian KTP dan SIM A yang diunggah customer.
- Setujui atau tolak dengan alasan yang jelas agar customer dapat mengunggah ulang via portal.
- Catat mutasi transfer manual: masukkan nominal, nama bank, dan unggah foto bukti transfer.
- Saat pembayaran 100% lunas dan dokumen disetujui, booking otomatis berubah menjadi **Aktif**.

## 5. Serah-Terima Armada (/booking/[id])
- **Checkout**: Catat odometer awal, persentase BBM, checklist kelengkapan, dan tanda tangan digital customer.
- **Checkin**: Catat odometer akhir, sisa BBM, dan kerusakan baru (jika ada).
- Biaya tambahan (`extra fee`) otomatis menerbitkan revisi invoice.
- Jika seluruh unit dalam booking telah checkin, status booking otomatis **Selesai**.

## 6. Sopir & Jadwal (/sopir)
- Daftarkan sopir dengan nomor HP, SIM aktif, dan tarif harian.
- Sistem otomatis memvalidasi bentrok jadwal antar-booking aktif.

## 7. Keuangan & Pengeluaran (/keuangan)
- Catat pengeluaran operasional (BBM, servis, cuci mobil, gaji, kantor).
- Lampirkan bukti struk/kuitansi untuk tiap pos pengeluaran.
- Laporan laba kotor dan arus kas tampil real-time di Dashboard utama.

## 8. Prinsip Operasional Penting
- **Tanpa Deposit**: Pembayaran 100% di muka.
- **Transfer Manual**: Tidak ada payment gateway otomatis.
- **Invoice Snapshot**: Setiap revisi pesanan menghasilkan versi invoice baru tanpa menimpa versi sebelumnya.
- **Soft-Delete**: Data transaksi dan armada tidak dihapus permanen melainkan ditandai `deletedAt`.
