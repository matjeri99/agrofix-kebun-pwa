# AgroFix Kebun Hub — Pengaktifan Backend

**Database sebenar:** https://docs.google.com/spreadsheets/d/1Xtx7p3qOZB6h3lYOF-w8UIwRsHb8NShyjIilX2UnzJc/edit

## Yang telah dilaksanakan (20 November 2026)

- Jadual `HUB_GARDENS`, `HUB_USERS`, `HUB_MEMBERSHIPS`, `HUB_AUDIT` telah diwujudkan terus dalam Sheet asal.
- Lima kebun: `KKB-P05`, `KKB-P06`, **`KKB-P16`** (padanan data lama), `KKB-P17`, `KKB-P18`.
- Tujuh tab asal `MEMBERS`, `ATTENDANCE`, `ACTIVITIES`, `HARVESTS`, `SALES`, `VISITORS`, `PLANTINGS` tidak ditulis semula.
- Source Apps Script di `backend/Code.gs`, gateway di `worker/index.js`, UI API di `live.js`.

## Langkah A — Apps Script baharu (tidak menyentuh APK lama)

1. Buka Sheet di atas → Extensions → Apps Script.
2. **Jangan gantikan Code.gs lama** jika ia masih digunakan oleh APK. Gunakan projek Apps Script baharu yang dipautkan kepada spreadsheet itu, atau tambah fail kod baharu selepas menyemak konflik nama fungsi (contohnya `doPost`). Cara paling selamat ialah **projek standalone baharu**. Source baharu sudah disediakan menggunakan `SpreadsheetApp.openById(...)` untuk spreadsheet asal.
3. Tampal kandungan `backend/Code.gs`.
4. Project Settings → Script properties: `AGROFIX_GATEWAY_SECRET` dan `AGROFIX_AUTH_SECRET`, **dua nilai rawak berbeza** sekurang-kurangnya 32 aksara. Jangan kongsikan dalam repo, chat atau screenshot.
5. Deploy → New deployment → Web app → Execute as Me → Who has access Anyone → Deploy, salin URL `/exec`.
6. Browser buka URL `/exec` dan semak `ok:true`, `version:1.1.0`. Tidak bermakna operasi log masuk sudah berfungsi.

## Langkah B — Pengguna pertama

Dalam `HUB_USERS`, tambah satu baris:
`EMAIL | NAME | ACTIVE | YYYY-MM-DD`.

Dalam `HUB_MEMBERSHIPS`, tambah satu baris:
`EMAIL | KKB-P16 | SUPER_ADMIN | ACTIVE | MEMBER_ID_ASAL | YYYY-MM-DD | system`.

`MEMBER_ID_ASAL` mesti satu ID yang benar-benar wujud di tab `MEMBERS` dan tergolong dalam `KKB-P16`. Jangan salin e-mel atau nama ahli secara terbuka. Pengguna kebun lain mesti mempunyai rekod `MEMBERS` dalam kebun masing-masing dahulu.

## Langkah C — Cloudflare Worker

Gunakan akaun Cloudflare sendiri. Deploy `worker/index.js` sebagai Worker `agrofix-kebun-gateway`. Tetapkan:
- `APPS_SCRIPT_URL`: URL `/exec` daripada Langkah A (sebagai secret).
- `AGROFIX_GATEWAY_SECRET`: **sama** dengan Script Property A, sebagai secret.
- `ALLOWED_ORIGINS`: `https://matjeri99.github.io` (sebagai variable).

Lihat `worker/wrangler.toml` jika menggunakan Wrangler CLI. Aktifkan rate limit/WAF untuk endpoint OTP.

**Jangan** masukkan `AGROFIX_AUTH_SECRET`, `AGROFIX_GATEWAY_SECRET` atau API token Cloudflare ke frontend.

## Langkah D — Hubungkan frontend GitHub Pages

Ubah `config.js`:
```js
window.AGROFIX_CONFIG = Object.freeze({
  apiUrl: "https://NAMA-WORKER-ANDA.workers.dev"
});
```
URL Worker bukan rahsia. Commit ke `main`, GitHub Pages akan deploy semula.

## Ujian wajib sebelum serah kepada ahli

1. OTP berjaya masuk ke e-mel pentadbir dan pengesahan menghasilkan sesi.
2. `whoami` hanya memulangkan keahlian yang diluluskan.
3. Dashboard P16 memaparkan data sedia ada `KKB-P16`.
4. Kehadiran masuk/keluar hanya menulis satu rekod ID yang sah; cuba semula tidak berganda.
5. Aktiviti, hasil dan jualan direkod ke tab asal, tanpa membuang baris lama.
6. Ahli P05 tidak boleh membaca atau menulis kebun P16.
7. Penyelarasan semula tetap berfungsi selepas sambungan internet terganggu; paparkan ralat dan jangan tunjuk mesej berjaya tanpa pengesahan API.

## Had semasa
Repositori GitHub dan jadual telah disediakan, **tetapi Apps Script Web App dan Cloudflare Worker belum diterbitkan dari ChatGPT**, kerana sambungan Drive/GitHub yang tersedia tidak mempunyai fungsi deploy untuk kedua-dua platform. Tanpa langkah A–D, PWA hanya paparan web, belum sistem rekod cloud aktif.
