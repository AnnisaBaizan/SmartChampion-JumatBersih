// ============================================================
//  SMART CHAMPION — LAPORAN JUMAT BERSIH — GAS Backend
//  Poltekkes Kemenkes Palembang
//  Deploy: Web App | Execute as: Me | Access: Anyone
// ============================================================

// ==================== CONFIG ====================
// Hanya ID teknis & rahasia yang disimpan di sini.
// Variabel yang sifatnya DINAMIS (nama instansi, email admin, BASE_URL, dll)
// diatur lewat tab "Pengaturan" di Spreadsheet — lihat _settings().
const CONFIG = {
  SPREADSHEET_ID: 'GANTI_DENGAN_SPREADSHEET_ID',   // ID Google Sheets arsip laporan
  SHEET_NAME: 'Laporan-JumatBersih',               // Tab arsip laporan
  MENGETAHUI_SHEET_NAME: 'Mengetahui',             // Master unit + Ketua Jurusan (kontak notifikasi + dropdown "Mengetahui")
  PJ_SHEET_NAME: 'Penanggung Jawab',               // Master penanggung jawab (fleksibel, tumbuh otomatis)
  AKTIVITAS_SHEET_NAME: 'Aktivitas',               // Tab dataset aktivitas (bisa ditambah admin)
  PENGATURAN_SHEET_NAME: 'Pengaturan',             // Tab pengaturan dinamis (key-value)
  DRIVE_FOLDER_ID: 'GANTI_DENGAN_FOLDER_ID',        // Folder Drive untuk foto/TTD
  WA_TOKEN: 'GANTI_DENGAN_TOKEN_FONNTE',            // rahasia → tetap di sini, JANGAN di Sheet

  // Default — dipakai bila tab "Pengaturan" belum ada / nilainya kosong:
  NAMA_INSTANSI: 'Politeknik Kesehatan Kemenkes Palembang',
  EMAIL_ADMIN:   'smartchampion@poltekkespalembang.ac.id',
  BASE_URL:      'https://smartchampion-jumatbersih.vercel.app',  // ubah saat pindah domain instansi
  NOMOR_PREFIX:  'JB/SMART-CHAMPION',
  BATAS_WAKTU:   '15.00 WIB',
  EMAIL_AKTIF:   true,
  WA_AKTIF:      false,
};

// ── Pengaturan dinamis dari tab "Pengaturan" (key | value) ──
// Cache per-eksekusi; fallback ke CONFIG bila belum diisi.
let _settingsCache = null;
function _settings() {
  if (_settingsCache) return _settingsCache;
  const s = {
    NAMA_INSTANSI: CONFIG.NAMA_INSTANSI, EMAIL_ADMIN: CONFIG.EMAIL_ADMIN,
    BASE_URL: CONFIG.BASE_URL, NOMOR_PREFIX: CONFIG.NOMOR_PREFIX,
    BATAS_WAKTU: CONFIG.BATAS_WAKTU, EMAIL_AKTIF: CONFIG.EMAIL_AKTIF, WA_AKTIF: CONFIG.WA_AKTIF,
  };
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.PENGATURAN_SHEET_NAME);
    if (!sheet) { sheet = ss.insertSheet(CONFIG.PENGATURAN_SHEET_NAME); _seedPengaturan(sheet, s); }
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 2).getValues().forEach(r => {
        const k = String(r[0]).trim();
        if (!(k in s)) return;
        let v = r[1];
        if (v === '' || v === null) return;  // kosong → pakai default
        if (typeof s[k] === 'boolean') v = (String(v).toUpperCase() === 'TRUE' || v === true);
        s[k] = v;
      });
    }
  } catch (e) { /* pakai default */ }
  _settingsCache = s;
  return s;
}
function _seedPengaturan(sheet, s) {
  sheet.appendRow(['Kunci', 'Nilai', 'Keterangan']);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  const ket = {
    NAMA_INSTANSI: 'Nama instansi di notifikasi & PDF',
    EMAIL_ADMIN: 'Penerima rekap mingguan',
    BASE_URL: 'Domain aplikasi (ubah saat pindah ke domain instansi)',
    NOMOR_PREFIX: 'Prefix nomor laporan',
    BATAS_WAKTU: 'Batas pengumpulan laporan',
    EMAIL_AKTIF: 'Aktifkan notifikasi Email (TRUE/FALSE)',
    WA_AKTIF: 'Aktifkan notifikasi WhatsApp (TRUE/FALSE)',
  };
  Object.keys(s).forEach(k => sheet.appendRow([k, s[k], ket[k] || '']));
  sheet.setFrozenRows(1);
}
// URL form (dari BASE_URL) untuk tautan di notifikasi
function _formUrl() { return String(_settings().BASE_URL || '').replace(/\/+$/, '') + '/laporan.html'; }

// ── Daftar prodi default ──
// Kontak (No. WA & email) DI-LOAD dari tab "Prodi-Master" di Spreadsheet (lihat _getProdiMaster).
// Daftar ini hanya dipakai untuk auto-membuat tab "Prodi-Master" saat pertama kali kosong.
const PRODI_DEFAULT = [
  'Jurusan Keperawatan',
  'PS-Diploma Tiga Keperawatan Baturaja',
  'PS-Diploma Tiga Keperawatan Lubuklinggau',
  'PS-Diploma Tiga Keperawatan Lahat',
  'Jurusan Gizi',
  'Jurusan Kebidanan',
  'PS-Diploma Tiga Kebidanan Muara Enim',
  'Jurusan Farmasi',
  'Jurusan Teknologi Laboratorium Medis',
  'Jurusan Kesehatan Gigi',
  'Jurusan Kesehatan Lingkungan',
];
const MENGETAHUI_HEADERS = ['Jurusan/Prodi/Unit', 'Nama', 'No. HP', 'Email Jurusan/Prodi', 'NIP', 'TTD'];
const PJ_HEADERS = ['Jurusan/Prodi/Unit', 'Nama', 'NIP', 'TTD'];

// ── Dataset Aktivitas (di-load dari tab "Aktivitas"; admin bisa menambah; "lainnya" auto-masuk) ──
const AKTIVITAS_DEFAULT = [
  'Pembersihan ruang kelas',
  'Pembersihan ruang laboratorium',
  'Pembersihan ruang pimpinan',
  'Pembersihan ruang administrasi',
  'Pembersihan ruang dosen',
  'Pembersihan ruang arsip',
  'Pembersihan ruang gudang',
  'Pembersihan koridor dan area bersama',
  'Pembersihan kamar mandi dan wastafel',
  'Pengelolaan sampah terpilah (organik & anorganik)',
  'Penataan meja & kursi (Clean Desk Culture / 5R)',
  'Penataan dokumen & arsip',
  'Perawatan tanaman / penghijauan lingkungan',
  'Gotong royong halaman / area parkir',
];
const AKTIVITAS_HEADERS = ['Aktivitas'];

// Urutan kolom sheet arsip (header otomatis dibuat saat sheet kosong)
const HEADERS = [
  'Timestamp', 'Nomor', 'Tanggal', 'Hari', 'Prodi', 'Nama PJ', 'Jabatan/NIP', 'No. HP/WA',
  'Dosen', 'Tendik', 'Mahasiswa', 'Total Peserta', 'Aktivitas', 'Aktivitas Lain',
  'Kondisi Sebelum', 'Kondisi Sesudah', 'Kendala', 'Catatan',
  'Nama Kajur', 'NIP Kajur', 'Nama Kaprodi', 'NIP Kaprodi',
  'Foto Sebelum', 'Foto Sesudah', 'Video', 'Waktu Kirim',
  'TTD Ketua Jurusan', 'TTD Ka Prodi',
];

// ================================================

// -------- doGet --------
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  let result;
  if (action === 'getDashboard') {
    result = getDashboard(e.parameter.tanggal || '');
  } else if (action === 'getTren') {
    result = getTren(e.parameter.mode || 'mingguan');
  } else if (action === 'getProdi') {
    const m = _getMengetahui();
    result = { prodiList: m.map(x => x.unit),
      mengetahui: m.map(x => ({ unit: x.unit, nama: x.nama, nip: x.nip, ttd: x.ttd })) };
  } else if (action === 'getAktivitas') {
    result = { aktivitasList: _getAktivitas() };
  } else if (action === 'getPJ') {
    result = { pjList: _getPenanggungJawab() };
  } else {
    result = { error: 'Action tidak dikenal.' };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------- doPost --------
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return _json({ status: 'error', error: 'JSON tidak valid: ' + err.message });
  }
  const action = payload.action || '';
  let result;
  if (action === 'submitLaporan') {
    result = handleSubmitLaporan(payload);
  } else {
    result = { status: 'error', error: 'Action tidak dikenal.' };
  }
  return _json(result);
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _sheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Master "Mengetahui" — unit + Ketua Jurusan + kontak (dropdown "Mengetahui") ──
// Kolom: Jurusan/Prodi/Unit | Nama | No. HP | Email | NIP | TTD
function _getMengetahui() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.MENGETAHUI_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.MENGETAHUI_SHEET_NAME);
    sheet.appendRow(MENGETAHUI_HEADERS);
    sheet.getRange(1, 1, 1, MENGETAHUI_HEADERS.length).setFontWeight('bold');
    PRODI_DEFAULT.forEach(u => sheet.appendRow([u, '', '', '', '', '']));
    sheet.setFrozenRows(1);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 6).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({
      unit: String(r[0]).trim(), nama: String(r[1] || '').trim(), hp: String(r[2] || '').trim(),
      email: String(r[3] || '').trim(), nip: String(r[4] || '').trim(), ttd: String(r[5] || '').trim(),
    }));
}
// Kompat: notifikasi & dashboard memakai {prodi, wa, email} dari master Mengetahui
function _getProdiMaster() {
  return _getMengetahui().map(m => ({ prodi: m.unit, wa: m.hp, email: m.email }));
}
// Update NIP & TTD Ketua Jurusan pada baris unit (+ nama) yang cocok
function _updateMengetahuiTtd(unit, nama, nip, ttdUrl) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.MENGETAHUI_SHEET_NAME);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues(); // unit, nama
    for (let i = 0; i < rows.length; i++) {
      const cocokUnit = String(rows[i][0]).trim() === String(unit).trim();
      const namaKosong = !String(rows[i][1]).trim();
      const cocokNama = String(rows[i][1]).trim().toLowerCase() === String(nama || '').trim().toLowerCase();
      if (cocokUnit && (cocokNama || namaKosong)) {
        if (nama && namaKosong) sheet.getRange(i + 2, 2).setValue(nama);
        if (nip) sheet.getRange(i + 2, 5).setValue(nip);
        if (ttdUrl && ttdUrl !== '-') sheet.getRange(i + 2, 6).setValue(ttdUrl);
        return;
      }
    }
  } catch (e) { Logger.log('Update Mengetahui error: ' + e.message); }
}

// ── Master "Penanggung Jawab" — fleksibel, tumbuh otomatis ──
// Kolom: Jurusan/Prodi/Unit | Nama | NIP | TTD
function _pjSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.PJ_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PJ_SHEET_NAME);
    sheet.appendRow(PJ_HEADERS);
    sheet.getRange(1, 1, 1, PJ_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function _getPenanggungJawab() {
  const sheet = _pjSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 4).getValues()
    .filter(r => String(r[1]).trim())
    .map(r => ({ unit: String(r[0] || '').trim(), nama: String(r[1]).trim(), nip: String(r[2] || '').trim(), ttd: String(r[3] || '').trim() }));
}
// Simpan/segarkan PJ (dedupe by unit+nama; update NIP & TTD)
function _simpanPJ(unit, nama, nip, ttdUrl) {
  nama = String(nama || '').trim();
  if (!nama) return;
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = _pjSheet();
      const lastRow = sheet.getLastRow();
      const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
      let row = 0;
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(unit).trim()
            && String(rows[i][1]).trim().toLowerCase() === nama.toLowerCase()) { row = i + 2; break; }
      }
      if (!row) sheet.appendRow([unit, nama, nip || '', (ttdUrl && ttdUrl !== '-') ? ttdUrl : '']);
      else {
        if (nip) sheet.getRange(row, 3).setValue(nip);
        if (ttdUrl && ttdUrl !== '-') sheet.getRange(row, 4).setValue(ttdUrl);
      }
    } finally { lock.releaseLock(); }
  } catch (e) { Logger.log('Simpan PJ error: ' + e.message); }
}

// ── Dataset aktivitas — DI-LOAD dari tab "Aktivitas" (auto-dibuat berisi AKTIVITAS_DEFAULT) ──
function _aktivitasSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.AKTIVITAS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.AKTIVITAS_SHEET_NAME);
    sheet.appendRow(AKTIVITAS_HEADERS);
    sheet.getRange(1, 1, 1, 1).setFontWeight('bold');
    AKTIVITAS_DEFAULT.forEach(a => sheet.appendRow([a]));
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function _getAktivitas() {
  const sheet = _aktivitasSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(x => String(x).trim()).filter(Boolean);
}
// Tambah aktivitas baru (dari "aktivitas lainnya") ke dataset bila belum ada
function _tambahAktivitas(teks) {
  if (!teks) return;
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = _aktivitasSheet();
      const ada = _getAktivitas().map(s => s.toLowerCase());
      String(teks).split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
        if (ada.indexOf(item.toLowerCase()) === -1) { sheet.appendRow([item]); ada.push(item.toLowerCase()); }
      });
    } finally { lock.releaseLock(); }
  } catch (e) { Logger.log('Tambah aktivitas error: ' + e.message); }
}

// ============================================================
//  SUBMIT LAPORAN
// ============================================================
function handleSubmitLaporan(d) {
  try {
    const now = new Date();
    const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
    const waktuKirim = Utilities.formatDate(now, tz, 'HH.mm') + ' WIB';
    const totalPeserta = (Number(d.dosen) || 0) + (Number(d.tendik) || 0) + (Number(d.mahasiswa) || 0);

    // ── Upload media DULU (lambat) — di luar lock agar lock dipegang sesingkat mungkin ──
    const folder = _getFolder(d.prodi, d.tanggal);
    const urlSebelum = _savePhotos(folder, d.fotoSebelum, `${d.prodi}_${d.tanggal}_SEBELUM`);
    const urlSesudah = _savePhotos(folder, d.fotoSesudah, `${d.prodi}_${d.tanggal}_SESUDAH`);
    // Video disimpan sebagai LINK (Drive/YouTube) — hemat penyimpanan, tidak di-upload ulang
    const urlVideo = (d.video && /^https?:\/\//.test(String(d.video))) ? String(d.video).trim() : '-';
    const ttdKajurUrl   = _saveTtd(d.prodi, d.namaKajur,   d.ttdKajur);
    const ttdKaprodiUrl = _saveTtd(d.prodi, d.namaKaprodi, d.ttdKaprodi);

    // ── Bagian KRITIS: penomoran + tulis baris di-LOCK agar tidak duplikat saat submit bersamaan ──
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);  // antre maks 30 detik
    let nomor, updated = false;
    try {
      const sheet = _sheet();
      const tahun = now.getFullYear();
      const lastRow = sheet.getLastRow();

      // Cek apakah prodi ini SUDAH punya laporan untuk tanggal yang sama (anti-duplikat)
      let existingRow = 0;
      if (lastRow > 1) {
        const keys = sheet.getRange(2, 3, lastRow - 1, 3).getValues(); // C=Tanggal, D=Hari, E=Prodi
        for (let i = 0; i < keys.length; i++) {
          if (_normTgl(keys[i][0]) === _normTgl(d.tanggal) && String(keys[i][2]) === String(d.prodi)) {
            existingRow = i + 2; break;
          }
        }
      }

      if (existingRow) {
        // PERBARUI baris lama — nomor & timestamp asli dipertahankan
        updated = true;
        nomor = sheet.getRange(existingRow, 2).getValue();
        const tsLama = sheet.getRange(existingRow, 1).getValue() || now;
        sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([_rowLaporan(d, tsLama, nomor, totalPeserta, waktuKirim, urlSebelum, urlSesudah, urlVideo, ttdKajurUrl, ttdKaprodiUrl)]);
      } else {
        // Baris BARU — nomor urut tahun berjalan
        const nomorList = lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat() : [];
        const urut = nomorList.filter(n => n && String(n).includes('/' + tahun)).length + 1;
        nomor = _settings().NOMOR_PREFIX + '/' + String(urut).padStart(3, '0') + '/' + tahun;
        sheet.appendRow(_rowLaporan(d, now, nomor, totalPeserta, waktuKirim, urlSebelum, urlSesudah, urlVideo, ttdKajurUrl, ttdKaprodiUrl));
      }
      SpreadsheetApp.flush();  // pastikan tertulis sebelum lock dilepas
    } finally {
      lock.releaseLock();
    }

    // "Aktivitas lainnya" → tambahkan ke dataset agar muncul untuk laporan berikutnya
    if (d.aktivitasLain) _tambahAktivitas(d.aktivitasLain);

    // Simpan PJ ke master "Penanggung Jawab" (+ TTD) → muncul di dropdown berikutnya
    _simpanPJ(d.prodi, d.namaKaprodi || d.namaPj, d.nipKaprodi || d.jabatanNip, ttdKaprodiUrl);
    // Update NIP & TTD Ketua Jurusan di master "Mengetahui"
    _updateMengetahuiTtd(d.prodi, d.namaKajur, d.nipKajur, ttdKajurUrl);

    // Notifikasi konfirmasi (di luar lock)
    if (_settings().EMAIL_AKTIF) _emailKonfirmasi(d, nomor, totalPeserta);
    if (_settings().WA_AKTIF)    _waKonfirmasi(d, nomor, totalPeserta);

    return { status: 'success', nomor: nomor, waktu: waktuKirim, updated: updated };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// Bentuk satu baris arsip (urut sesuai HEADERS) — dipakai untuk insert & update
function _rowLaporan(d, ts, nomor, totalPeserta, waktuKirim, urlSebelum, urlSesudah, urlVideo, ttdKajurUrl, ttdKaprodiUrl) {
  return [
    ts, nomor, d.tanggal, d.hari, d.prodi, d.namaPj, d.jabatanNip, d.hp,
    Number(d.dosen) || 0, Number(d.tendik) || 0, Number(d.mahasiswa) || 0, totalPeserta,
    (d.aktivitas || []).join(', '), d.aktivitasLain || '',
    d.sebelum, d.sesudah, d.kendala || '', d.catatan || '',
    d.namaKajur || '', d.nipKajur || '', d.namaKaprodi || '', d.nipKaprodi || '',
    urlSebelum, urlSesudah, urlVideo, waktuKirim,
    ttdKajurUrl, ttdKaprodiUrl,
  ];
}

// ── Dapatkan/ buat folder (anti-duplikat saat submit bersamaan: double-checked locking) ──
function _getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const it2 = parent.getFoldersByName(name);  // cek ulang setelah dapat lock
    return it2.hasNext() ? it2.next() : parent.createFolder(name);
  } finally {
    lock.releaseLock();
  }
}

// ── Folder Drive per Jumat ──
function _getFolder(prodi, tanggal) {
  const parent = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  return _getOrCreateFolder(parent, 'JumatBersih_' + (tanggal || 'tanpa-tanggal'));
}

// ── Simpan satu media base64 (foto/video) → return URL ──
function _saveMedia(folder, dataUrl, filename) {
  if (!dataUrl || dataUrl.indexOf('base64,') === -1) return '-';
  try {
    const parts = dataUrl.split('base64,');
    const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const ext = (mime.split('/')[1] || 'bin').split('+')[0];
    const bytes = Utilities.base64Decode(parts[1]);
    const file = folder.createFile(Utilities.newBlob(bytes, mime, filename + '.' + ext));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return '-';
  }
}

// ── Simpan banyak foto (array base64) → return URL dipisah koma ──
function _savePhotos(folder, arr, prefix) {
  if (!arr || !arr.length) return '-';
  const urls = [];
  arr.forEach((d, i) => { const u = _saveMedia(folder, d, prefix + '_' + (i + 1)); if (u !== '-') urls.push(u); });
  return urls.length ? urls.join(', ') : '-';
}

// ── Folder TTD (subfolder "TTD" di dalam DRIVE_FOLDER_ID) ──
function _ttdFolder() {
  return _getOrCreateFolder(DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID), 'TTD');
}
function _ttdSafe(s) { return String(s || '').replace(/[\/\\:*?"<>|]+/g, '_').trim(); }
function _ttdFileName(prodi, nama) { return _ttdSafe(prodi) + '___' + _ttdSafe(nama) + '.png'; }

// Simpan TTD ke Drive (base64) ATAU teruskan bila sudah berupa link (TTD dipakai ulang).
// Return URL gambar yang bisa di-embed (thumbnail Drive).
function _saveTtd(prodi, nama, dataUrl) {
  if (!dataUrl) return '-';
  if (/^https?:\/\//.test(dataUrl)) return dataUrl;        // sudah link tersimpan → pakai ulang
  if (dataUrl.indexOf('base64,') === -1 || !nama) return '-';
  try {
    const folder = _ttdFolder();
    const fname = _ttdFileName(prodi, nama);
    const ex = folder.getFilesByName(fname);
    while (ex.hasNext()) ex.next().setTrashed(true);  // hapus versi lama
    const bytes = Utilities.base64Decode(dataUrl.split('base64,')[1]);
    const file = folder.createFile(Utilities.newBlob(bytes, 'image/png', fname));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w600';
  } catch (e) { return '-'; }
}

// Daftar TTD tersimpan untuk satu prodi → [{nama, img(dataUrl base64), url}]
function getTtdList(prodi) {
  try {
    const folder = _ttdFolder();
    const prefix = _ttdSafe(prodi) + '___';
    const files = folder.getFiles();
    const out = [];
    while (files.hasNext()) {
      const f = files.next();
      const n = f.getName();
      if (prodi && n.indexOf(prefix) !== 0) continue;
      out.push({
        nama: n.replace(prefix, '').replace(/\.png$/i, ''),
        img: 'data:image/png;base64,' + Utilities.base64Encode(f.getBlob().getBytes()),
        url: f.getUrl(),
      });
    }
    return out;
  } catch (e) { return []; }
}

// Ubah URL file Drive → URL gambar yang bisa di-embed (untuk slideshow dashboard).
// URL gambar langsung (mis. data dummy) diteruskan apa adanya.
function _driveImg(url) {
  if (!url || url === '-') return '';
  url = String(url);
  if (url.indexOf('drive.google.com') > -1) {
    const m = url.match(/[-\w]{25,}/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w1200' : '';
  }
  return /^https?:\/\//.test(url) ? url : '';
}

// ============================================================
//  DASHBOARD
// ============================================================
function getDashboard(tanggal) {
  try {
    const sheet = _sheet();
    const lastRow = sheet.getLastRow();
    const rows = [];
    let totalPeserta = 0;
    const seen = {};
    const fotos = [];

    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      data.forEach(r => {
        const rTgl = _normTgl(r[2]);          // kolom Tanggal
        if (tanggal && rTgl !== tanggal) return;
        const prodi = r[4];
        // ambil laporan terbaru per prodi (dedupe: peserta tidak dihitung ganda)
        seen[prodi] = {
          prodi: prodi, status: 'SUDAH', waktu: r[25], ket: '',
          dosen: Number(r[8]) || 0, tendik: Number(r[9]) || 0, mahasiswa: Number(r[10]) || 0,
          peserta: Number(r[11]) || 0,
        };
        // kumpulkan foto dokumentasi untuk slideshow (URL dipisah koma; kolom Video r[24] dikecualikan)
        [['Sebelum', r[22]], ['Sesudah', r[23]]].forEach(pair => {
          String(pair[1] || '').split(',').forEach(u => {
            const img = _driveImg(u.trim());
            if (img) fotos.push({ prodi: prodi, label: pair[0], url: img });
          });
        });
      });
    }
    // agregasi dari hasil dedup (1 prodi dihitung sekali)
    let dosen = 0, tendik = 0, mahasiswa = 0;
    Object.keys(seen).forEach(p => {
      rows.push(seen[p]);
      totalPeserta += seen[p].peserta || 0;
      dosen += seen[p].dosen; tendik += seen[p].tendik; mahasiswa += seen[p].mahasiswa;
    });
    const prodiList = _getProdiMaster().map(p => p.prodi);
    const totalUnit = prodiList.length || 1;
    const sudah = rows.length;
    fotos.sort((a, b) => a.prodi === b.prodi ? (a.label < b.label ? -1 : 1) : (a.prodi < b.prodi ? -1 : 1));
    return {
      rows: rows, tanggal: tanggal, prodiList: prodiList, fotos: fotos,
      totalPeserta: totalPeserta,
      peserta: { dosen: dosen, tendik: tendik, mahasiswa: mahasiswa, total: totalPeserta },
      sudah: sudah, belum: Math.max(0, totalUnit - sudah), totalUnit: totalUnit,
      kepatuhan: Math.round(sudah / totalUnit * 100),
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Tren agregat untuk grafik (mode: 'mingguan' per Jumat | 'bulanan' per bulan) ──
function getTren(mode) {
  try {
    const sheet = _sheet();
    const lastRow = sheet.getLastRow();
    const totalUnit = (_getMengetahui().length) || 1;
    const buckets = {};
    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      data.forEach(r => {
        const tgl = _normTgl(r[2]); if (!tgl) return;
        const key = (mode === 'bulanan') ? tgl.slice(0, 7) : tgl;  // YYYY-MM atau YYYY-MM-DD
        const b = buckets[key] || (buckets[key] = { prodi: {} });
        // dedupe per prodi per periode (peserta diambil sekali)
        b.prodi[r[4]] = { dosen: Number(r[8]) || 0, tendik: Number(r[9]) || 0, mhs: Number(r[10]) || 0 };
      });
    }
    const keys = Object.keys(buckets).sort();
    const labels = [], kepatuhan = [], dosen = [], tendik = [], mahasiswa = [], pelapor = [];
    keys.forEach(k => {
      const prodis = Object.keys(buckets[k].prodi);
      let d = 0, t = 0, m = 0;
      prodis.forEach(p => { const x = buckets[k].prodi[p]; d += x.dosen; t += x.tendik; m += x.mhs; });
      labels.push(k);
      pelapor.push(prodis.length);
      kepatuhan.push(Math.min(100, Math.round(prodis.length / totalUnit * 100)));
      dosen.push(d); tendik.push(t); mahasiswa.push(m);
    });
    return { mode: mode, labels: labels, kepatuhan: kepatuhan, dosen: dosen, tendik: tendik, mahasiswa: mahasiswa, pelapor: pelapor, totalUnit: totalUnit };
  } catch (err) {
    return { error: err.message };
  }
}

function _normTgl(v) {
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  return String(v).slice(0, 10);
}

// ── Prodi yang BELUM lapor untuk tanggal tertentu ──
function _prodiBelumLapor(tanggal) {
  const reported = {};
  const sheet = _sheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 3, lastRow - 1, 3).getValues(); // Tanggal, Hari, Prodi
    data.forEach(r => {
      if (_normTgl(r[0]) === tanggal) reported[r[2]] = true;
    });
  }
  return _getProdiMaster().filter(p => !reported[p.prodi]);
}

// ============================================================
//  NOTIFIKASI KONFIRMASI (saat laporan masuk)
// ============================================================
function _emailKonfirmasi(d, nomor, totalPeserta) {
  try {
    const subjek = `✅ Laporan Jumat Bersih Diterima — ${d.prodi} (${d.tanggal})`;
    const html =
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
        <div style="background:#145a32;color:#fff;padding:18px 20px">
          <h2 style="margin:0;font-size:18px">🧹 Laporan Jumat Bersih Diterima</h2>
          <p style="margin:4px 0 0;font-size:12px;opacity:.85">${_settings().NAMA_INSTANSI}</p>
        </div>
        <div style="padding:20px;font-size:13px;color:#333;line-height:1.7">
          <p><b>Nomor:</b> ${nomor}<br>
          <b>Prodi:</b> ${d.prodi}<br>
          <b>Tanggal:</b> ${d.tanggal} (${d.hari})<br>
          <b>Penanggung Jawab:</b> ${d.namaPj}<br>
          <b>Total Peserta:</b> ${totalPeserta} orang<br>
          <b>Kondisi:</b> ${d.sebelum} → ${d.sesudah}</p>
          <p style="color:#1e8449"><b>Status:</b> Tersimpan & muncul di Dashboard SMART Champion.</p>
        </div>
        <div style="background:#f6f9f7;padding:12px 20px;font-size:11px;color:#999">
          Email otomatis Sistem SMART Champion — ${_settings().NAMA_INSTANSI}.
        </div>
      </div>`;
    MailApp.sendEmail({ to: _settings().EMAIL_ADMIN, subject: subjek, htmlBody: html });
  } catch (e) { Logger.log('Email konfirmasi error: ' + e.message); }
}

function _waKonfirmasi(d, nomor, totalPeserta) {
  const pesan =
`✅ *LAPORAN JUMAT BERSIH DITERIMA*
${_settings().NAMA_INSTANSI}
━━━━━━━━━━━━━━━━━━━━
📄 *Nomor:* ${nomor}
🏛️ *Prodi:* ${d.prodi}
📅 *Tanggal:* ${d.tanggal} (${d.hari})
👤 *PJ:* ${d.namaPj}
👥 *Total Peserta:* ${totalPeserta} orang
🧽 *Kondisi:* ${d.sebelum} → ${d.sesudah}
━━━━━━━━━━━━━━━━━━━━
_Tersimpan di Dashboard SMART Champion_`;
  _kirimWA(d.hp, pesan);
}

// ── Kirim WhatsApp via Fonnte ──
function _kirimWA(target, pesan) {
  if (!_settings().WA_AKTIF) return;
  try {
    const resp = UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': CONFIG.WA_TOKEN },
      payload: { target: target, message: pesan },
      muteHttpExceptions: true,
    });
    const r = JSON.parse(resp.getContentText());
    if (!r.status) Logger.log('WA gagal (' + target + '): ' + resp.getContentText());
  } catch (e) { Logger.log('WA error: ' + e.message); }
}

// ============================================================
//  CRON — PENGINGAT PRODI BELUM LAPOR
//  Pasang trigger waktu (lihat fungsi pasangTrigger di bawah).
// ============================================================
function _tanggalJumatIni() {
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  const t = new Date();
  // mundur ke Jumat terakhir (termasuk hari ini bila Jumat) = Jumat minggu pelaporan berjalan
  const back = (t.getDay() - 5 + 7) % 7;
  t.setDate(t.getDate() - back);
  return Utilities.formatDate(t, tz, 'yyyy-MM-dd');
}
// Jumat minggu LALU (untuk menutup window pelaporan yang sudah lewat)
function _tanggalJumatLalu() {
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  const t = new Date();
  const back = (t.getDay() - 5 + 7) % 7;
  t.setDate(t.getDate() - back - 7);
  return Utilities.formatDate(t, tz, 'yyyy-MM-dd');
}

function _kirimPengingat(tanggal, tahap) {
  const S = _settings();
  const belum = _prodiBelumLapor(tanggal);
  belum.forEach(p => {
    const isi =
`🔔 *${tahap.judul}*
Yth. Ketua Jurusan/Kaprodi *${p.prodi}*

Laporan Jumat Bersih tanggal *${tanggal}* belum masuk ke sistem SMART Champion.
Batas pengumpulan: *paling lambat Kamis sebelum Jumat berikutnya*.

Akses form: ${_formUrl()}
━━━━━━━━━━━━━━━━━━━━
_${S.NAMA_INSTANSI}_`;
    if (S.WA_AKTIF && p.wa && p.wa.replace(/\D/g, '').length >= 8) _kirimWA(p.wa, isi);
    if (S.EMAIL_AKTIF && p.email && p.email.indexOf('@') > -1) {
      try {
        MailApp.sendEmail({
          to: p.email,
          subject: `${tahap.judul} — ${p.prodi} (${tanggal})`,
          htmlBody: isi.replace(/\*/g, '').replace(/\n/g, '<br>')
            + `<br><a href="${_formUrl()}">Buka Form Laporan</a>`,
        });
      } catch (e) { Logger.log('Email pengingat error: ' + e.message); }
    }
  });
  Logger.log(`Pengingat "${tahap.judul}" — ${belum.length} prodi belum lapor (${tanggal}).`);
}

// Window pelaporan: Jumat (hari-H) s/d Kamis berikutnya. Pengingat tersebar dalam window;
// status "terlambat" baru ditetapkan saat window ditutup (Jumat berikutnya pagi).
// — Jumat (hari pelaksanaan): 3× pengingat
function pengingatJumat1() { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT — Laporan Jumat Bersih hari ini (1/3)' }); }
function pengingatJumat2() { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT — Laporan Jumat Bersih hari ini (2/3)' }); }
function pengingatJumat3() { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT — Laporan Jumat Bersih hari ini (3/3)' }); }
// — Selasa: pengingat tengah window
function pengingatSelasa() { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT — Laporan Jumat Bersih minggu ini belum masuk' }); }
// — Kamis: pengingat terakhir (hari terakhir window)
function pengingatKamis()  { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT TERAKHIR — Batas pengumpulan hari ini (Kamis)' }); }

// Dipanggil oleh trigger Jumat 07.00 — TUTUP window minggu lalu: notif terlambat + rekap ke admin
function tutupMingguan() {
  const tanggal = _tanggalJumatLalu();
  _kirimPengingat(tanggal, { judul: 'TERLAMBAT — Laporan Jumat Bersih minggu lalu belum masuk' });
  const total = _getProdiMaster().length || 1;
  const belum = _prodiBelumLapor(tanggal);
  const sudah = total - belum.length;
  const patuh = Math.round(sudah / total * 100);
  const list = belum.length ? belum.map(p => '• ' + p.prodi).join('<br>') : '<i>Semua prodi sudah lapor 🎉</i>';
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7">
      <h3 style="color:#145a32">📊 Rekap Mingguan Jumat Bersih — ${tanggal}</h3>
      <p><b>Sudah lapor:</b> ${sudah} prodi<br>
      <b>Belum lapor:</b> ${belum.length} prodi<br>
      <b>Kepatuhan:</b> ${patuh}%</p>
      <p><b>Prodi belum lapor:</b><br>${list}</p>
    </div>`;
  if (_settings().EMAIL_AKTIF) {
    try { MailApp.sendEmail({ to: _settings().EMAIL_ADMIN, subject: `Rekap Mingguan Jumat Bersih — ${tanggal}`, htmlBody: html }); }
    catch (e) { Logger.log('Rekap error: ' + e.message); }
  }
}

// ============================================================
//  TES NOTIFIKASI — jalankan manual dari editor untuk cek Email/WA
//  (Edit TES_TARGET_* bila ingin kirim ke tujuan khusus.)
// ============================================================
const TES_TARGET_EMAIL = '';  // kosongkan → pakai EMAIL_ADMIN dari Pengaturan
const TES_TARGET_WA    = '';  // kosongkan → pakai No. WA valid pertama di Prodi-Master

function tesNotifikasi() {
  const S = _settings();
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  const stamp = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm');
  const log = [];

  // ── Email ──
  if (S.EMAIL_AKTIF) {
    const to = TES_TARGET_EMAIL || S.EMAIL_ADMIN;
    try {
      MailApp.sendEmail({
        to: to,
        subject: '🔔 TES Notifikasi — SMART Champion Jumat Bersih',
        htmlBody:
          `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7">
            <h3 style="color:#145a32">🔔 Tes Notifikasi Berhasil</h3>
            <p>Ini email <b>uji coba</b> sistem SMART Champion.<br>
            Instansi: <b>${S.NAMA_INSTANSI}</b><br>
            Waktu: ${stamp}<br>
            Form: <a href="${_formUrl()}">${_formUrl()}</a></p>
            <p style="color:#888;font-size:11px">Jika Anda menerima email ini, konfigurasi notifikasi Email sudah benar.</p>
          </div>`,
      });
      log.push('✅ Email tes terkirim ke ' + to);
    } catch (e) { log.push('❌ Email tes gagal: ' + e.message); }
  } else {
    log.push('⏭️ EMAIL_AKTIF = FALSE (email dilewati).');
  }

  // ── WhatsApp (Fonnte) ──
  if (S.WA_AKTIF) {
    const target = TES_TARGET_WA ||
      _getProdiMaster().map(p => p.wa).find(w => w && String(w).replace(/\D/g, '').length >= 8);
    if (target) {
      _kirimWA(target,
        `🔔 *TES Notifikasi — SMART Champion*\n${S.NAMA_INSTANSI}\nWaktu: ${stamp}\nForm: ${_formUrl()}\n\n_Jika pesan ini diterima, konfigurasi WhatsApp sudah benar._`);
      log.push('✅ WA tes dikirim ke ' + target + ' (cek penerima & Logs Fonnte).');
    } else {
      log.push('❌ Tidak ada No. WA valid (isi Prodi-Master atau TES_TARGET_WA).');
    }
  } else {
    log.push('⏭️ WA_AKTIF = FALSE (WhatsApp dilewati).');
  }

  const hasil = log.join('\n');
  Logger.log(hasil);
  return hasil;
}

// Tes alur PENGINGAT (kirim ke semua prodi yang belum lapor Jumat ini) — untuk uji coba cron
function tesPengingatSekarang() {
  _kirimPengingat(_tanggalJumatIni(), { judul: 'TES PENGINGAT — (uji coba sistem)' });
  return 'Tes pengingat dijalankan untuk tanggal ' + _tanggalJumatIni() + ' — cek Logs.';
}

// ============================================================
//  SETUP TRIGGER — jalankan SEKALI manual dari editor Apps Script
// ============================================================
function pasangTrigger() {
  // Hapus trigger lama agar tidak dobel
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Window 1 minggu (Jumat s/d Kamis). Jumat 3×, plus Selasa & Kamis.
  ScriptApp.newTrigger('pengingatJumat1').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(12).nearMinute(0).create();
  ScriptApp.newTrigger('pengingatJumat2').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(14).nearMinute(30).create();
  ScriptApp.newTrigger('pengingatJumat3').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(15).nearMinute(1).create();
  ScriptApp.newTrigger('pengingatSelasa').timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(9).nearMinute(0).create();
  ScriptApp.newTrigger('pengingatKamis').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(13).nearMinute(0).create();
  // Jumat 07.00 — tutup window minggu lalu: tandai terlambat + rekap ke admin
  ScriptApp.newTrigger('tutupMingguan').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(7).nearMinute(0).create();

  Logger.log('Trigger terpasang: Jumat 12.00/14.30/15.01 (3×), Selasa 09.00, Kamis 13.00, Jumat 07.00 (tutup minggu lalu + rekap).');
}
