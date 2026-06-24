# 🌿 SMART Champion — Laporan Jumat Bersih

Aplikasi web pelaporan **Kegiatan Jumat Bersih** Politeknik Kesehatan Kemenkes Palembang —
realisasi digital dari *Template Laporan Kegiatan Jumat Bersih*. Setiap Program Studi mengisi
laporan tiap Jumat; data otomatis tersimpan dan terpantau di **Dashboard SMART Champion**,
lengkap dengan dokumentasi foto/video, tanda tangan digital, output PDF, dan notifikasi
otomatis Email + WhatsApp untuk prodi yang belum melapor.

Dibangun mengikuti pola **SimpelBMN**: frontend HTML statis + backend **Google Apps Script**
(+ Google Sheets & Drive), di-deploy ke **Vercel**. **Tanpa npm / tanpa dependency** — build
hanya memakai Node bawaan.

🔗 **Demo:** https://smartchampion-jumatbersih.vercel.app

---

## ✨ Fitur

- **2 halaman:** Dashboard (`/`) dan Form Laporan (`/laporan.html`).
- **Form Bagian A–F** sesuai template resmi (identitas, kehadiran, aktivitas, evaluasi, dokumentasi, TTD).
- **Dokumentasi:** Foto **Sebelum 3–5**, Foto **Sesudah 3–5** (dikompres otomatis di sisi klien), dan **video via link** (Google Drive / YouTube — hemat penyimpanan).
- **Tanda tangan digital** (gambar di kanvas). TTD **disimpan ke Google Drive** dan bisa **dipakai ulang** lewat dropdown per prodi. Ada peringatan + checkbox konfirmasi agar TTD tidak asal/sembarangan.
- **Pratinjau langsung** PDF di sebelah form (desktop) / di bawah (HP) — terisi otomatis saat mengetik.
- **Output PDF** ber-**KOP resmi**, bisa diunduh setelah kirim dan **diunduh ulang** kapan saja.
- **Konfigurasi via Sheet** (tab `Pengaturan`) + **penomoran anti-duplikat** (LockService) untuk submit bersamaan.
- **Dashboard SMART Champion:** statistik kepatuhan, rekap status per prodi, **slideshow dokumentasi foto**, jadwal & contoh notifikasi, dan alur sistem.
- **Master prodi & kontak** di-load dari Spreadsheet (tab `Prodi-Master`) — satu sumber data.
- **Notifikasi otomatis** (cron): pengingat Jumat 12.00 / 14.30 / 15.01 + rekap Senin 07.00.

---

## 🗂️ Struktur File

| File | Fungsi |
|------|--------|
| `index.html` | **Dashboard** (halaman utama) + tombol *Isi Laporan* + slideshow foto |
| `laporan.html` | **Form** laporan (A–F), TTD digital, output PDF |
| `Code.gs` | Backend Google Apps Script (Sheets, Drive, notif Email/WA, cron) |
| `build.js` | Inject env (`__GAS_URL__`, dll) ke HTML → folder `dist/`. Hanya Node bawaan. |
| `vercel.json` | Konfigurasi build Vercel (`node build.js` → `dist`) |
| `.env.example` | Contoh variabel lingkungan |
| `KOP.png` | Kop surat resmi (dipakai di kepala PDF laporan) |
| `Template_Spreadsheet_JumatBersih.xlsx` | Template database — tab `Laporan-JumatBersih` + `Prodi-Master` + `Pengaturan` (berisi **data dummy** untuk uji coba) |

---

# 👩‍💻 Bagian Developer — Setup

## Prasyarat
- Akun Google (untuk Apps Script, Sheets, Drive).
- Akun Vercel + (opsional) Vercel CLI: `npm i -g vercel`.
- Node.js (untuk menjalankan `build.js` secara lokal). **Tidak ada `npm install`** — tanpa dependency.
- (Opsional) Akun [Fonnte](https://fonnte.com) untuk notifikasi WhatsApp (token gratis).

## 1. Backend — Google Apps Script

1. **Spreadsheet arsip:** impor `Template_Spreadsheet_JumatBersih.xlsx` ke Google Sheets
   (*File → Import → Upload → Replace/Create new*). Salin **ID** dari URL
   (`https://docs.google.com/spreadsheets/d/`**`<ID>`**`/edit`).
   - Tab **`Laporan-JumatBersih`** = database laporan (28 kolom). Template sudah berisi **7 baris dummy** (tanggal `2026-06-19`).
   - Tab **`Prodi-Master`** = daftar prodi + No. WA (format `62…`) + email Kaprodi/Kajur. **Lengkapi kontak asli di sini.**
   - Tab **`Pengaturan`** = **semua variabel dinamis** (key-value) — ubah di sini, **tanpa edit kode**:
     `NAMA_INSTANSI`, `EMAIL_ADMIN`, `BASE_URL` (domain aplikasi), `NOMOR_PREFIX`, `BATAS_WAKTU`, `EMAIL_AKTIF`, `WA_AKTIF`.
   - *Catatan:* jika Spreadsheet dibiarkan kosong, `Code.gs` membuat semua tab + header (termasuk `Pengaturan`) otomatis.
2. **Folder Drive:** buat satu folder untuk dokumentasi (foto/TTD). Salin **ID** folder dari URL.
3. Buka [script.google.com](https://script.google.com) → **New Project** → hapus isi default → tempel seluruh `Code.gs`.
4. Lengkapi blok **`CONFIG`** di atas — **hanya ID teknis & rahasia**:
   - `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, dan `WA_TOKEN` (opsional, untuk WhatsApp).
   - Sisanya (nama instansi, email admin, domain, dll) diatur di tab **`Pengaturan`**, bukan di kode.
5. **Deploy → New deployment → Web app**
   - *Execute as:* **Me** · *Who has access:* **Anyone**
   - Salin **Web app URL** → ini nilai `GAS_URL`.
   - Saat pertama, izinkan akses (Authorize) Sheets/Drive/Gmail.
6. **(Opsional) Tes notifikasi:** jalankan fungsi **`tesNotifikasi`** dari editor untuk mengirim
   email/WA uji coba (cek *Logs*, inbox, & WhatsApp). `tesPengingatSekarang` menguji alur pengingat prodi.
7. **(Opsional) Aktifkan notifikasi otomatis:** jalankan fungsi **`pasangTrigger`** sekali dari editor
   (menu *Run*). Ini memasang trigger: Jumat 12.00 / 14.30 / 15.01 + rekap Senin 07.00.

> **Subfolder otomatis di Drive:** foto/video disimpan per Jumat di folder `JumatBersih_<tanggal>`,
> dan tanda tangan di subfolder `TTD/` (nama file `<Prodi>___<Nama>.png`) agar bisa dipakai ulang.

## 2. Frontend — Vercel

1. Salin env: `cp .env.example .env`, lalu isi `GAS_URL` dan `ADMIN_PASSWORD`.
2. **Build lokal (uji):**
   ```bash
   GAS_URL="https://script.google.com/macros/s/XXXX/exec" ADMIN_PASSWORD="rahasia" node build.js
   # hasil ada di folder dist/
   ```
3. **Deploy ke Vercel** (salah satu):
   - **CLI:** `vercel login` → `vercel link` → `vercel deploy --prod` (set env di dashboard atau `--build-env`).
   - **Dashboard:** import repo GitHub → tambah Environment Variables (`GAS_URL`, `ADMIN_PASSWORD`, `BUG_URL` opsional) → Deploy.
   - Vercel menjalankan `node build.js` otomatis (lihat `vercel.json`).

> **Mode demo:** tanpa `GAS_URL`, dashboard tampil **data contoh** + slideshow contoh, dan form
> tetap bisa mengisi & **mengunduh PDF** (tidak tersimpan ke server). Berguna untuk pratinjau.

## Kontrak API (GAS)

| Method | Endpoint | Hasil |
|--------|----------|-------|
| GET | `?action=getDashboard&tanggal=YYYY-MM-DD` | `{ rows[], totalPeserta, prodiList, fotos[] }` |
| GET | `?action=getProdi` | `{ prodiList[] }` |
| GET | `?action=getTtd&prodi=NAMA` | `{ ttdList: [{nama, img, url}] }` |
| POST | `{ action:'submitLaporan', … }` | `{ status:'success', nomor, waktu }` |

## Catatan teknis
- **Tanpa npm:** `build.js` & `Code.gs` tidak punya dependency. `vercel.json` memakai `installCommand: ""`.
- **Konfigurasi dinamis di Sheet:** semua variabel yang sering berubah (nama instansi, email admin, `BASE_URL`, prefix nomor, batas waktu, on/off notifikasi) ada di tab **`Pengaturan`** — diubah tanpa menyentuh kode. Hanya ID teknis & token rahasia yang ada di `CONFIG`.
- **URL relatif:** semua tautan antar-halaman di frontend relatif (`laporan.html`, `index.html`). Tautan absolut hanya di notifikasi Email/WA, dibangun dari `BASE_URL` di tab `Pengaturan` — **pindah domain cukup ubah satu baris di Sheet**.
- **Penomoran anti-duplikat:** penghitungan nomor + penulisan baris dikunci dengan **`LockService`** (antre maks 30 dtk) + `SpreadsheetApp.flush()`, sehingga submit bersamaan tidak menghasilkan nomor kembar. Upload media dilakukan di luar lock agar lock dipegang sesingkat mungkin.
- **Foto** dikompres otomatis di browser ke maks **1280px / JPEG 0.8** (±300 KB) — tajam di layar & PDF, user tidak perlu kompres manual.
- **Video tidak di-upload** (browser tidak bisa kompres video tanpa library berat) — disimpan sebagai **link** Drive/YouTube agar kuota Drive institusi (100 GB) awet. Estimasi storage tanpa video ≈ 1 GB/tahun (puluhan tahun).
- POST ke GAS memakai `Content-Type: text/plain` untuk menghindari CORS preflight.

---

# 🧑‍🏫 Bagian User — Cara Penggunaan

## A. Mengisi Laporan (penanggung jawab prodi)
1. Buka **Dashboard** → klik **📝 Isi Laporan Jumat Bersih** (atau langsung ke `/laporan.html`).
2. **A. Identitas:** tanggal **hanya bisa hari Jumat** (default Jumat terdekat; pilihan non-Jumat otomatis disesuaikan), pilih **Program Studi**, isi nama PJ, jabatan/NIP, No. HP/WA.
   - Saat mengisi, **pratinjau PDF** di samping (desktop) / bawah (HP) ikut terisi otomatis.
3. **B. Kehadiran:** jumlah dosen, tendik, mahasiswa (total dihitung otomatis).
4. **C. Aktivitas:** centang semua kegiatan yang dilakukan; tambahkan "aktivitas lainnya" bila perlu.
5. **D. Evaluasi:** pilih kondisi **Sebelum** & **Sesudah**, tulis kendala/saran (opsional).
6. **E. Dokumentasi:**
   - **Foto Sebelum:** unggah **3–5 foto** (klik **＋ Tambah**; hapus dengan **✕**). Indikator berubah hijau ✓ bila ≥ 3.
   - **Foto Sesudah:** sama, **3–5 foto**.
   - **Video (Link):** opsional — unggah video ke Google Drive/YouTube lalu **tempel tautannya**.
7. **F. Pernyataan & Tanda Tangan:**
   - Klik **✍️ Buat / Ubah Tanda Tangan** → muncul **kanvas besar (modal)** yang nyaman di HP; tanda tangani lalu **Simpan**.
   - Jika sudah pernah membuat TTD, pilih dari **dropdown** "🖊️ …" — TTD tersimpan otomatis muncul per prodi.
   - ⚠️ **Penting:** TTD **disimpan permanen** ke sistem & dipakai ulang. Pastikan **rapi & benar** — kalau jelek klik **Hapus** lalu ulangi. Centang konfirmasi sebelum kirim.
8. Klik **📤 Kirim Laporan**. Setelah sukses, klik **🖨️ Unduh PDF Laporan**.
   - **Unduh ulang:** banner di atas form ("Laporan terakhir …") bisa diklik untuk mengunduh PDF lagi kapan saja.
   - Tombol **🖨️ Pratinjau / Unduh PDF** juga bisa dipakai sebelum kirim untuk mengecek hasil.

> Saat dialog cetak muncul, pilih **"Save as PDF"** sebagai tujuan untuk menyimpan file.

## B. Memantau Dashboard (admin/pimpinan)
1. Buka halaman utama (`/`).
2. **Pilih Tanggal Jumat** lalu klik **🔄 Muat**.
3. Lihat ringkasan: **Sudah/Belum Lapor, Kepatuhan, Total Peserta**, dan tabel status per prodi.
4. **📸 Slideshow** menampilkan dokumentasi foto Jumat tersebut (otomatis bergeser; bisa diklik panah/titik).
5. Tabel **Jadwal Notifikasi** & **Alur Sistem** menjelaskan kapan pengingat dikirim.

## C. Notifikasi Otomatis
Prodi yang belum melapor akan menerima Email + WhatsApp:

| Waktu | Hari | Aksi |
|-------|------|------|
| 12.00 WIB | Jumat | Pengingat awal |
| 14.30 WIB | Jumat | Pengingat mendesak |
| 15.01 WIB | Jumat | Notifikasi keterlambatan + log |
| 07.00 WIB | Senin | Rekap mingguan ke Admin/Pimpinan |

---

## ❓ Troubleshooting singkat
- **Form bilang "Mode demo"** → `GAS_URL` belum diset di Vercel. Set env lalu redeploy.
- **TTD lama tidak muncul di dropdown** → pastikan backend aktif & prodi sudah dipilih (dropdown dimuat saat memilih prodi).
- **Video** → tidak di-upload; unggah ke Drive/YouTube lalu tempel linknya di field Video.
- **Dashboard kosong** → pilih tanggal Jumat yang ada datanya (data dummy template: `2026-06-19`).

---

*100% gratis berbasis Google Apps Script — Politeknik Kesehatan Kemenkes Palembang.*
