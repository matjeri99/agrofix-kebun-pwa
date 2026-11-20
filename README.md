# AgroFix Kebun Hub 🌱

Frontend web progresif (PWA) untuk kebun komuniti jemputan Sub Zon 1 Putrajaya — Presint 5, 6, 16, 17 dan 18. Kebun Presint 16 ialah kebun perintis.

## Buka aplikasi

Selepas GitHub Pages diaktifkan, URL projek ialah:

https://matjeri99.github.io/agrofix-kebun-pwa/

Aktifkan sekali sahaja di **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow siap pada `.github/workflows/pages.yml`. Lihat keputusan deploy pada tab **Actions**.

## Status aplikasi
- Antaramuka mudah alih, pemilihan kebun, navigasi, dashboard kosong dan pemasangan PWA telah diterbitkan sebagai kod statik.
- **Kehadiran, akaun, keahlian, rekod tanaman, jualan dan data pusat belum disambungkan.** Skrin tidak akan memaparkan nombor palsu atau mendakwa data telah disimpan.
- Backend Apps Script lama dan Google Sheets asal tidak diubah.
- Pengaktifan fungsi menulis memerlukan login, semakan keahlian per kebun, kawalan akses pada pelayan dan perantara API; jangan hantar AGROFIX_API_KEY ke Javascript atau ke repository awam.

## Pembangunan seterusnya
Sambungkan API selamat (contohnya Cloudflare Worker), pastikan akaun dan jadual keahlian mengikut `GARDEN_ID`, kemudian aktifkan tindakan kehadiran, aktiviti, tanaman, hasil, jualan serta papan pemuka berdasarkan respons pelayan sebenar.

## Penggunaan PWA
- Android: Chrome → menu → **Add to Home screen / Install app**.
- iOS: Safari → Share → **Add to Home Screen**.

Arkib APK React Native/Expo lama disimpan berasingan sebagai bahan pembelajaran.
