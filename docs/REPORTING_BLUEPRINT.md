# AgroFix Kebun — Pelan Sistem & Reporting Centre

Dikemaskini: 20 November 2026.

## Prinsip
- Sekali rekod, digunakan semula dalam pelbagai laporan.
- Simpan data sebenar; medan yang belum direkod ditandakan **Belum direkod** (bukan angka sifar).
- Rekod sedia ada `MEMBERS`, `ATTENDANCE`, `PLANTINGS`, `ACTIVITIES`, `HARVESTS`, `SALES`, `VISITORS` mesti dikekalkan.
- Had akses ditentukan oleh Apps Script selepas pengesahan sesi, bukan sekadar butang frontend.
- Pentadbir kebun hanya mengurus kebunnya; Super Admin boleh melihat gambaran induk.

## Jadual tambahan (telah diwujudkan dalam Google Sheets asal)
1. `GARDEN_PROJECT_PROFILE`: maklumat tetap projek untuk borang luar.
2. `PLANTING_DETAILS`: metrik luas dan bilangan bagi `PLANTING_ID` asal.
3. `FERTILIZER_LOG`: aplikasi baja dengan tanaman, kuantiti/unit, kos dan petugas.
4. `PEST_CONTROL_LOG`: rekod perosak, input racun, kuantiti, keselamatan dan tempoh pra-tuai.
5. `MAINTENANCE_LOG`: aset, kerja, status dan kos.
6. `GARDEN_ASSETS`: inventori pam, tangki, paip, peralatan.
7. `REPORT_RUNS`: sejarah laporan, status semakan/kelulusan dan fail.
   
Tab ini dibuka dengan header sahaja. **Belum diisi secara automatik** sehingga borang input tambahan dibina.

## Borang rujukan laporan bulanan projek
Profil projek: organisasi/pengusaha, rujukan, telefon, alamat, projek/kelompok, kawasan perkhidmatan.
Pengeluaran: komoditi, varieti, luas bertanam, bilangan komoditi, luas berhasil, kuantiti KG, bilangan polibeg/pasu/keratan, dan petunjuk pengeluaran (tajuk/unit perlu disahkan daripada borang sumber sebelum penjanaan PDF).
Borang itu ialah **satu** output, bukan pengganti laporan operasi kebun.

## Sumber tunggal setiap metrik
- Ahli berdaftar: `MEMBERS`, berdasarkan `GARDEN_ID`.
- Kehadiran: `ATTENDANCE` dan `CHECK_IN_AT`; bilangan sesi berbeza daripada bilangan ahli unik.
- Tanaman: `PLANTINGS` dan `PLANTING_DETAILS`.
- Hasil kg: **`HARVESTS` sahaja**. Aktiviti `Menuai` bukan kiraan hasil tambahan.
- Jualan RM: `SALES`; jangan campurkan hasil tuaian dengan jualan.
- Baja: `FERTILIZER_LOG`, pautkan `ACTIVITY_ID` jika wujud.
- Kawalan perosak: `PEST_CONTROL_LOG`.
- Penyelenggaraan: `MAINTENANCE_LOG` dan `GARDEN_ASSETS`.

## Reporting Centre
`getReportDraft` ialah endpoint baca sahaja; perlu peranan Admin Kebun atau Super Admin. Ia memulangkan ringkasan bulanan dan senarai maklumat projek/tanaman yang masih kurang. Sebarang isu padanan tuaian kepada varieti akan ditandakan untuk semakan; jangan kira hasil berganda.

Paparan `reporting.js` telah dipasang di Admin Centre; **belum diuji end-to-end** sehingga Apps Script + Cloudflare Worker diterbitkan semula. Laporan PDF/Excel dan pengesahan dalam `REPORT_RUNS` **belum dibangunkan**.

## Susunan implementasi seterusnya
1. Deploy Apps Script Code.gs terkini melalui **Manage deployments → Edit → New version**, kemudian deploy `worker/index.js` terkini (secrets sedia ada kekal).
2. Uji `getReportDraft` bagi `KKB-P16`, bulan 2026-11. Pastikan data 9 tanaman aktif, serta senarai medan yang belum direkod.
3. Sediakan borang Admin untuk profil projek, keluasan, bilangan pokok dan plot.
4. Sediakan aktiviti pintar untuk baja/racun/penyelenggaraan. Validasi unit dan metadata keselamatan; tidak memberi arahan penggunaan racun secara automatik.
5. Bangunkan PDF/Excel templat dan aliran draf → semak → sahkan. Laporan yang belum lengkap tidak boleh dianggap rasmi.
6. Laksanakan UAT data lama/baharu dan pengasingan lima kebun sebelum pembukaan kepada komuniti.
