# 🌿 SMART Champion — Laporan Jumat Bersih

Realisasi digital dari **Template Laporan Kegiatan Jumat Bersih** Politeknik Kesehatan Kemenkes
Palembang. Web app untuk mengisi laporan Jumat Bersih per Jurusan/Program Studi, otomatis
tersimpan & terpantau di **Dashboard SMART Champion**, lengkap dengan notifikasi otomatis
Email + WhatsApp bagi prodi yang belum mengumpulkan laporan.

Dibangun mengikuti pola project **SimpelBMN**: frontend HTML statis + backend **Google Apps
Script** + **Google Sheets/Drive**, di-deploy ke **Vercel**. **Tanpa npm / tanpa dependency** —
build hanya memakai Node bawaan.

---

## 🗂️ Struktur

| File | Fungsi |
|------|--------|
| `index.html` | **Dashboard SMART Champion** (halaman utama) — status per prodi, kepatuhan, jadwal notifikasi, + tombol *Isi Laporan* |
| `laporan.html` | Form laporan Jumat Bersih (Bagian A–F) → kirim ke GAS → output PDF |
| `Code.gs` | Backend Google Apps Script (simpan Sheet, upload foto Drive, notif Email/WA, cron) |
| `build.js` | Inject env (`__GAS_URL__`, dll) ke HTML → folder `dist/`. Hanya Node bawaan. |
| `vercel.json` | Konfigurasi build Vercel (`node build.js` → `dist`) |
| `.env.example` | Contoh variabel lingkungan |
| `Template_Spreadsheet_JumatBersih.xlsx` | Template database (2 tab: `Laporan-JumatBersih` + `Prodi-Master`) |

Form mengikuti template asli:
**A.** Identitas Pelaporan · **B.** Data Kehadiran · **C.** Aktivitas ·
**D.** Evaluasi · **E.** Dokumentasi Foto · **F.** Pernyataan & Tanda Tangan.

---

## 🚀 Cara Setup

### 1. Backend — Google Apps Script

1. **Spreadsheet arsip:** impor `Template_Spreadsheet_JumatBersih.xlsx` ke Google Sheets
   (*File → Import → Upload*), atau cukup buat Spreadsheet kosong — `Code.gs` otomatis
   membuat tab `Laporan-JumatBersih` + header saat laporan pertama masuk. Salin **ID** dari URL.
   - Tab `Laporan-JumatBersih` = database laporan (26 kolom).
   - Tab `Prodi-Master` = referensi nomor WA & email tiap prodi (untuk mengisi `PRODI_MASTER` di `Code.gs`).
2. Buat **folder Google Drive** untuk foto dokumentasi. Salin **ID** folder.
3. Buka [script.google.com](https://script.google.com) → **New Project** → tempel isi `Code.gs`.
4. Isi `CONFIG` di bagian atas:
   - `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`
   - `EMAIL_ADMIN` (penerima rekap)
   - `WA_TOKEN` + `WA_AKTIF: true` jika memakai WhatsApp ([fonnte.com](https://fonnte.com) — token gratis)
5. **Master prodi & kontak di-load dari Spreadsheet**, bukan dari `Code.gs`. Buka tab
   `Prodi-Master` lalu isi **No. WA (format `62…`)** & **email** tiap Kaprodi/Kajur.
   Tab ini juga jadi sumber daftar prodi untuk dropdown form & baris dashboard
   (lewat action `getProdi` / `getDashboard`). Tab dibuat otomatis bila belum ada.
6. **Deploy → New deployment → Web app**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Salin **Web app URL** → ini nilai `GAS_URL`.
7. (Opsional) Jalankan fungsi **`pasangTrigger`** sekali dari editor untuk mengaktifkan
   notifikasi otomatis (Jumat 12.00 / 14.30 / 15.01, rekap Senin 07.00).

### 2. Frontend — Vercel

1. Salin env: `cp .env.example .env` lalu isi `GAS_URL` & `ADMIN_PASSWORD`.
2. Build lokal (uji): `node build.js` → hasil di `dist/`.
   ```bash
   GAS_URL="https://script.google.com/macros/s/XXXX/exec" ADMIN_PASSWORD="rahasia" node build.js
   ```
3. Deploy ke Vercel — set Environment Variables (`GAS_URL`, `ADMIN_PASSWORD`, `BUG_URL` opsional).
   Vercel menjalankan `node build.js` otomatis (lihat `vercel.json`).

> **Catatan:** Tanpa `GAS_URL`, dashboard tetap menampilkan **data contoh** sesuai template
> dan form akan memberi tahu bahwa backend belum dikonfigurasi — berguna untuk pratinjau.

---

## 🔔 Alur Notifikasi Otomatis (Cron)

| Waktu | Hari | Kondisi | Aksi |
|-------|------|---------|------|
| 12.00 WIB | Jumat | Prodi belum lapor | Pengingat awal (Email + WA) |
| 14.30 WIB | Jumat | Masih belum lapor | Pengingat mendesak |
| 15.01 WIB | Jumat | Masih belum lapor | Notifikasi keterlambatan + log |
| 07.00 WIB | Senin | Belum lapor Jumat lalu | Rekap mingguan ke Admin/Pimpinan |

Diatur lewat *time-driven triggers* Apps Script (fungsi `pasangTrigger`).

---

## 📄 Output PDF

Setelah laporan dikirim, tombol **Unduh PDF Laporan** memakai dialog cetak browser
(*Save as PDF*) — tanpa library eksternal. Foto sebelum/sesudah dikompres di sisi klien
(maks 1000px, JPEG 0.7) sebelum dikirim agar hemat kuota.

---

## 🛠️ Kontrak API (GAS)

- `GET  ?action=getProdi` → `{ prodiList:[…] }` (daftar prodi dari tab `Prodi-Master`)
- `GET  ?action=getDashboard&tanggal=YYYY-MM-DD` → `{ rows:[{prodi,status,waktu,ket}], totalPeserta, prodiList }`
- `POST { action:'submitLaporan', … }` → `{ status:'success', nomor, waktu }`

---

*100% gratis berbasis Google Apps Script — Politeknik Kesehatan Kemenkes Palembang.*
