// ============================================================
//  SMART CHAMPION — LAPORAN JUMAT BERSIH — GAS Backend
//  Poltekkes Kemenkes Palembang
//  Deploy: Web App | Execute as: Me | Access: Anyone
// ============================================================

// ==================== CONFIG ====================
const CONFIG = {
  SPREADSHEET_ID: 'GANTI_DENGAN_SPREADSHEET_ID',   // ID Google Sheets arsip laporan
  SHEET_NAME: 'Laporan-JumatBersih',               // Tab arsip laporan
  PRODI_SHEET_NAME: 'Prodi-Master',                // Tab master prodi + kontak notifikasi
  DRIVE_FOLDER_ID: 'GANTI_DENGAN_FOLDER_ID',        // Folder Drive untuk foto dokumentasi
  NAMA_INSTANSI: 'Politeknik Kesehatan Kemenkes Palembang',
  NOMOR_PREFIX: 'JB/SMART-CHAMPION',                // Prefix nomor laporan
  FORM_URL: 'https://smartchampion-jumatbersih.vercel.app/laporan.html',

  // --- Email notifikasi (MailApp bawaan Google) ---
  EMAIL_AKTIF: true,
  EMAIL_ADMIN: 'smartchampion@poltekkespalembang.ac.id',  // rekap & arsip

  // --- WhatsApp via Fonnte (https://fonnte.com) ---
  WA_AKTIF: false,                                  // set true setelah token diisi
  WA_TOKEN: 'GANTI_DENGAN_TOKEN_FONNTE',
};

// ── Daftar prodi default ──
// Kontak (No. WA & email) DI-LOAD dari tab "Prodi-Master" di Spreadsheet (lihat _getProdiMaster).
// Daftar ini hanya dipakai untuk auto-membuat tab "Prodi-Master" saat pertama kali kosong.
const PRODI_DEFAULT = [
  'Keperawatan', 'Kebidanan', 'Keperawatan Gigi', 'Gizi', 'Sanitasi Lingkungan',
  'Analis Kesehatan / TLM', 'Farmasi', 'Rekam Medis', 'Fisioterapi', 'Teknik Elektromedik',
];
const PRODI_HEADERS = ['Prodi / Jurusan', 'No. WA (62...)', 'Email Kaprodi/Kajur'];

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
  } else if (action === 'getProdi') {
    result = { prodiList: _getProdiMaster().map(p => p.prodi) };
  } else if (action === 'getTtd') {
    result = { ttdList: getTtdList(e.parameter.prodi || '') };
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

// ── Master prodi + kontak — DI-LOAD dari tab "Prodi-Master" ──
// Kolom: Prodi / Jurusan | No. WA (62...) | Email Kaprodi/Kajur
// Tab dibuat otomatis berisi PRODI_DEFAULT bila belum ada (kontak dikosongkan untuk diisi user).
function _getProdiMaster() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.PRODI_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PRODI_SHEET_NAME);
    sheet.appendRow(PRODI_HEADERS);
    sheet.getRange(1, 1, 1, PRODI_HEADERS.length).setFontWeight('bold');
    PRODI_DEFAULT.forEach(p => sheet.appendRow([p, '', '']));
    sheet.setFrozenRows(1);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 3).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({
      prodi: String(r[0]).trim(),
      wa:    String(r[1] || '').trim(),
      email: String(r[2] || '').trim(),
    }));
}

// ============================================================
//  SUBMIT LAPORAN
// ============================================================
function handleSubmitLaporan(d) {
  try {
    const sheet = _sheet();
    const now = new Date();
    const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';

    // Nomor urut tahun berjalan
    const tahun = now.getFullYear();
    const lastRow = sheet.getLastRow();
    let urut = 1;
    if (lastRow > 1) {
      const nomorList = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      urut = nomorList.filter(n => n && String(n).includes('/' + tahun)).length + 1;
    }
    const nomor = CONFIG.NOMOR_PREFIX + '/' + String(urut).padStart(3, '0') + '/' + tahun;
    const waktuKirim = Utilities.formatDate(now, tz, 'HH.mm') + ' WIB';

    const totalPeserta = (Number(d.dosen) || 0) + (Number(d.tendik) || 0) + (Number(d.mahasiswa) || 0);

    // Upload foto ke Drive
    const folder = _getFolder(d.prodi, d.tanggal);
    const urlSebelum = _savePhotos(folder, d.fotoSebelum, `${d.prodi}_${d.tanggal}_SEBELUM`);
    const urlSesudah = _savePhotos(folder, d.fotoSesudah, `${d.prodi}_${d.tanggal}_SESUDAH`);
    // Video disimpan sebagai LINK (Drive/YouTube) — hemat penyimpanan, tidak di-upload ulang
    const urlVideo = (d.video && /^https?:\/\//.test(String(d.video))) ? String(d.video).trim() : '-';

    // Simpan TTD ke Drive (folder TTD) agar bisa dipakai ulang lewat dropdown
    const ttdKajurUrl   = _saveTtd(d.prodi, d.namaKajur,   d.ttdKajur);
    const ttdKaprodiUrl = _saveTtd(d.prodi, d.namaKaprodi, d.ttdKaprodi);

    sheet.appendRow([
      now, nomor, d.tanggal, d.hari, d.prodi, d.namaPj, d.jabatanNip, d.hp,
      Number(d.dosen) || 0, Number(d.tendik) || 0, Number(d.mahasiswa) || 0, totalPeserta,
      (d.aktivitas || []).join(', '), d.aktivitasLain || '',
      d.sebelum, d.sesudah, d.kendala || '', d.catatan || '',
      d.namaKajur || '', d.nipKajur || '', d.namaKaprodi || '', d.nipKaprodi || '',
      urlSebelum, urlSesudah, urlVideo, waktuKirim,
      ttdKajurUrl, ttdKaprodiUrl,
    ]);

    // Notifikasi konfirmasi
    if (CONFIG.EMAIL_AKTIF) _emailKonfirmasi(d, nomor, totalPeserta);
    if (CONFIG.WA_AKTIF)    _waKonfirmasi(d, nomor, totalPeserta);

    return { status: 'success', nomor: nomor, waktu: waktuKirim };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ── Folder Drive per Jumat ──
function _getFolder(prodi, tanggal) {
  const parent = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const name = 'JumatBersih_' + (tanggal || 'tanpa-tanggal');
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
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
  const parent = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const it = parent.getFoldersByName('TTD');
  return it.hasNext() ? it.next() : parent.createFolder('TTD');
}
function _ttdSafe(s) { return String(s || '').replace(/[\/\\:*?"<>|]+/g, '_').trim(); }
function _ttdFileName(prodi, nama) { return _ttdSafe(prodi) + '___' + _ttdSafe(nama) + '.png'; }

// Simpan TTD (base64 PNG) ke Drive; overwrite bila nama sama. Return URL.
function _saveTtd(prodi, nama, dataUrl) {
  if (!dataUrl || dataUrl.indexOf('base64,') === -1 || !nama) return '-';
  try {
    const folder = _ttdFolder();
    const fname = _ttdFileName(prodi, nama);
    const ex = folder.getFilesByName(fname);
    while (ex.hasNext()) ex.next().setTrashed(true);  // hapus versi lama
    const bytes = Utilities.base64Decode(dataUrl.split('base64,')[1]);
    const file = folder.createFile(Utilities.newBlob(bytes, 'image/png', fname));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
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
        // ambil laporan terbaru per prodi
        seen[prodi] = { prodi: prodi, status: 'SUDAH', waktu: r[25], ket: '' };
        totalPeserta += Number(r[11]) || 0;
        // kumpulkan foto dokumentasi untuk slideshow
        // foto bisa banyak (URL dipisah koma); kolom Video (r[24]) tidak dimasukkan slideshow
        [['Sebelum', r[22]], ['Sesudah', r[23]]].forEach(pair => {
          String(pair[1] || '').split(',').forEach(u => {
            const img = _driveImg(u.trim());
            if (img) fotos.push({ prodi: prodi, label: pair[0], url: img });
          });
        });
      });
    }
    Object.keys(seen).forEach(p => rows.push(seen[p]));
    const prodiList = _getProdiMaster().map(p => p.prodi);
    return { rows: rows, totalPeserta: totalPeserta, tanggal: tanggal, prodiList: prodiList, fotos: fotos };
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
          <p style="margin:4px 0 0;font-size:12px;opacity:.85">${CONFIG.NAMA_INSTANSI}</p>
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
          Email otomatis Sistem SMART Champion — ${CONFIG.NAMA_INSTANSI}.
        </div>
      </div>`;
    MailApp.sendEmail({ to: CONFIG.EMAIL_ADMIN, subject: subjek, htmlBody: html });
  } catch (e) { Logger.log('Email konfirmasi error: ' + e.message); }
}

function _waKonfirmasi(d, nomor, totalPeserta) {
  const pesan =
`✅ *LAPORAN JUMAT BERSIH DITERIMA*
${CONFIG.NAMA_INSTANSI}
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
  if (!CONFIG.WA_AKTIF) return;
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
  // mundur ke Jumat terakhir (termasuk hari ini bila Jumat)
  const back = (t.getDay() - 5 + 7) % 7;
  t.setDate(t.getDate() - back);
  return Utilities.formatDate(t, tz, 'yyyy-MM-dd');
}

function _kirimPengingat(tanggal, tahap) {
  const belum = _prodiBelumLapor(tanggal);
  belum.forEach(p => {
    const isi =
`🔔 *${tahap.judul}*
Yth. Ketua Jurusan/Kaprodi *${p.prodi}*

Laporan Jumat Bersih tanggal *${tanggal}* belum masuk ke sistem SMART Champion.
Batas pengumpulan: *Jumat pukul 15.00 WIB*.

Akses form: ${CONFIG.FORM_URL}
━━━━━━━━━━━━━━━━━━━━
_${CONFIG.NAMA_INSTANSI}_`;
    if (CONFIG.WA_AKTIF && p.wa && p.wa.replace(/\D/g, '').length >= 8) _kirimWA(p.wa, isi);
    if (CONFIG.EMAIL_AKTIF && p.email && p.email.indexOf('@') > -1) {
      try {
        MailApp.sendEmail({
          to: p.email,
          subject: `${tahap.judul} — ${p.prodi} (${tanggal})`,
          htmlBody: isi.replace(/\*/g, '').replace(/\n/g, '<br>')
            + `<br><a href="${CONFIG.FORM_URL}">Buka Form Laporan</a>`,
        });
      } catch (e) { Logger.log('Email pengingat error: ' + e.message); }
    }
  });
  Logger.log(`Pengingat "${tahap.judul}" — ${belum.length} prodi belum lapor (${tanggal}).`);
}

// Dipanggil oleh trigger Jumat 12.00
function pengingatAwal()    { _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT — BELUM MENGUMPULKAN LAPORAN' }); }
// Dipanggil oleh trigger Jumat 14.30
function pengingatMendesak(){ _kirimPengingat(_tanggalJumatIni(), { judul: 'PENGINGAT MENDESAK — BATAS 15.00 WIB' }); }
// Dipanggil oleh trigger Jumat 15.01
function notifKeterlambatan(){ _kirimPengingat(_tanggalJumatIni(), { judul: 'NOTIFIKASI KETERLAMBATAN LAPORAN' }); }

// Dipanggil oleh trigger Senin 07.00 — rekap mingguan ke admin
function rekapMingguan() {
  const tanggal = _tanggalJumatIni();
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
  if (CONFIG.EMAIL_AKTIF) {
    try { MailApp.sendEmail({ to: CONFIG.EMAIL_ADMIN, subject: `Rekap Mingguan Jumat Bersih — ${tanggal}`, htmlBody: html }); }
    catch (e) { Logger.log('Rekap error: ' + e.message); }
  }
}

// ============================================================
//  SETUP TRIGGER — jalankan SEKALI manual dari editor Apps Script
// ============================================================
function pasangTrigger() {
  // Hapus trigger lama agar tidak dobel
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Jumat
  ScriptApp.newTrigger('pengingatAwal').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(12).nearMinute(0).create();
  ScriptApp.newTrigger('pengingatMendesak').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(14).nearMinute(30).create();
  ScriptApp.newTrigger('notifKeterlambatan').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(15).nearMinute(1).create();
  // Senin rekap
  ScriptApp.newTrigger('rekapMingguan').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).nearMinute(0).create();

  Logger.log('Trigger terpasang: Jumat 12.00 / 14.30 / 15.01, Senin 07.00.');
}
