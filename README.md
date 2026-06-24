# LabShot - Web Photobox

Aplikasi photobox berbasis web untuk layar LCD dan kamera/webcam di lab.  
Output: Story Instagram **1080 × 1920 px**, foto tertanam rapi di dalam bingkai.

## Fitur

- Akses kamera melalui browser (HTTPS / localhost)
- Pilih kamera jika ada lebih dari satu perangkat
- Toggle mirror & suara countdown (beep + shutter)
- Live filter preview di viewfinder
- Layout: Single / Strip 2 / Strip 3 / Strip 4 foto
- Frame bawaan: Classic · CFD Street · Capstone · Wisuda
- Filter: Normal · B&W · Warm · Bright · Vintage · Cool
- Upload frame PNG kustom
- Thumbnail strip foto yang sudah diambil
- Download PNG + tombol Bagikan (Web Share API)
- QR Code lokal browser

## Cara menjalankan

```bash
python -m http.server 8000
# buka http://localhost:8000
```

Atau upload ke GitHub Pages (Settings → Pages → branch main / root).

## Struktur folder

```
index.html
style.css
app.js
README.md
assets/
  frames/
    classic-story.png
    cfd-story.png
    capstone-story.png
    wisuda-story.png
```

## Perbaikan & peningkatan (v5)

- **Koordinat slot foto diperbaiki** berdasarkan analisis piksel aktual tiap frame PNG
- Foto kini benar-benar masuk ke dalam area hitam bingkai (bukan ditempel di atas)
- Ditambahkan layout Strip 2 Foto
- Ditambahkan filter Cool
- Toggle mirror & suara
- Live filter preview di viewfinder sebelum foto diambil
- Thumbnail strip foto yang baru diambil
- Pilihan kamera otomatis muncul jika ada lebih dari 1 kamera
- Countdown dengan animasi pop + beep audio
- Suara shutter saat foto diambil
- Tombol kamera berubah warna saat aktif
- UI lebih rapi & responsif

## Catatan

QR Code masih bersifat link lokal browser. Untuk QR publik yang bisa di-scan HP, perlu tambahan backend/storage (Firebase Storage, Supabase, dsb.).


## Perbaikan v7

- Menambahkan template scrapbook dari referensi ke folder `assets/frames/`.
- Menambahkan pilihan frame:
  - Auto Scrapbook
  - Birthday Collage
  - Birthday Camera
  - Memories Box
  - Memories Simple
- Mode Auto Scrapbook otomatis menyesuaikan:
  - 1 foto → Memories Simple
  - 2 foto → Memories Simple
  - 3 foto → Birthday Collage
  - 4 foto → Memories Box
- Foto tidak lagi dibuat seperti ditempel di atas frame.
- Foto dirender sebagai layer penuh di belakang template, lalu muncul melalui transparent window.
- Output tetap Story Instagram 1080 × 1920 px.


## Update v8 – Yogyakarta City Series

- Menambahkan template baru `Yogyakarta City Series` ke folder `assets/frames/`.
- Template ini diambil dari desain yang Anda kirim, lalu area foto diubah menjadi transparent window.
- Posisi foto disesuaikan agar natural:
  - 1 foto: area besar utama
  - 2 foto: area besar + area kecil bawah
  - 3 foto: area besar dibagi 2 strip + area kecil bawah
  - 4 foto: area besar dibagi 3 strip + area kecil bawah
- Template ini dijadikan pilihan default pada dropdown Frame.


## Update v9 – Yogyakarta Template Resize

- Template `Yogyakarta City Series` diperbarui mengikuti desain terbaru yang Anda lampirkan.
- Area foto kini fokus pada 1 window utama besar.
- Penempatan foto disesuaikan agar natural:
  - 1 foto: 1 foto penuh pada area utama
  - 2 foto: 2 strip vertikal dalam area utama
  - 3 foto: 3 strip vertikal dalam area utama
  - 4 foto: 4 strip vertikal dalam area utama


## Update v10 – Pengaturan Sesi Disederhanakan

- Menghapus field **Nama Event**.
- Menghapus field **Countdown** dari panel pengaturan (tetap memakai default 3 detik).
- Menghapus field **Upload Frame Kustom**.
- Dropdown **Frame** kini hanya menampilkan **Yogyakarta City Series**.
- Dropdown **Layout** disederhanakan menjadi:
  - `Single (Utama)`
  - `Strip 2`


## Update v11 – Tambahan 4 Template Frame

Pilihan frame kini bertambah menjadi:
- Yogyakarta City Series
- TI UMY Campus Series
- TI UMY Showcase
- UMY Campus Series
- UMY City Series

Semua template baru sudah ditambahkan ke folder `assets/frames/` dan disiapkan untuk 2 layout:
- `Single (Utama)`
- `Strip 2`


## Update v17 – Google Drive Gallery

Perubahan:
- Firebase Storage diganti dengan Google Drive Gallery.
- QR Code sekarang menuju folder Google Drive event:
  https://drive.google.com/drive/folders/1HLXr6Y-mX1EqveyV-KPtAQp-5Pt0e6GJ
- Foto di-upload ke Google Drive lewat Apps Script Web App:
  https://script.google.com/macros/s/AKfycbyo7rb9TPvHjp6NJNphJfgirDSpkkiAWo_srxlpi1qsPQWbAQGGAIzW3t3lLxt6tq4QLw/exec
- Upload berjalan di background agar antrean photobox tidak tertahan.
- File yang di-upload ke Drive dibuat ringan: 720 × 1280 JPG kualitas 0.62.
- Tombol Download di layar tetap memakai hasil lokal kualitas lebih tinggi.

Catatan:
- Pastikan folder Google Drive diatur `Anyone with the link → Viewer`.
- Pastikan Apps Script Web App sudah dideploy dengan:
  Execute as: Me
  Who has access: Anyone


## Update v18 – Camera Fix

Perubahan:
- Inisialisasi tombol kamera dibuat lebih aman dengan `DOMContentLoaded`.
- `startCamera()` sekarang menampilkan error lebih jelas jika izin kamera ditolak, kamera tidak ditemukan, atau halaman tidak HTTPS.
- Ditambahkan `await video.play()` setelah stream aktif.


## Update v19 – Logo TI UMY dan Tema Pastel

Perubahan:
- Logo di header diganti menggunakan logo TI UMY dari file lampiran.
- Tampilan utama diubah dari dark theme menjadi light pastel theme.
- Panel, tombol, form, kamera, dan kartu hasil dibuat lebih cerah.


## Update v20 – Tambahan 3 Template + Layout Strip 3

Perubahan:
- Menambahkan 3 template baru:
  - TI UMY Friendship
  - Daily Quote
  - IT Future
- Menambahkan pilihan layout baru: Strip 3.
- Opsi layout kini akan menyesuaikan dukungan masing-masing template.
- Jika template tidak mendukung jumlah foto tertentu, pilihan layout itu otomatis dinonaktifkan.


## Update v21 – Perbaikan 3 Template Terbaru

Perubahan:
- Area hitam/photo window pada template:
  - TI UMY Friendship
  - Daily Quote
  - IT Future
  sekarang sudah dibuat transparan.
- Foto yang dirender di belakang template kini bisa terlihat.
- Border foto tetap disisakan agar hasil lebih natural.


## Update v22 – Private QR per Foto + Perbaikan 3 Template

Perubahan utama:
- QR sekarang unik untuk setiap hasil foto, bukan lagi ke folder Drive.
- Pengunjung yang scan QR hanya melihat foto miliknya sendiri.
- Halaman QR akan menunggu otomatis jika upload belum selesai.
- 3 template terbaru diperbaiki lagi agar area foto benar-benar transparan:
  - TI UMY Friendship
  - Daily Quote
  - IT Future

File tambahan:
- `apps-script/Code.gs` → paste ke Google Apps Script Anda, lalu deploy ulang sebagai Web App.

Setelah mengganti Apps Script:
1. Buka Apps Script.
2. Hapus isi lama, paste `apps-script/Code.gs`.
3. Simpan.
4. Deploy → Manage deployments → Edit.
5. Pilih New version → Deploy.
6. Pastikan:
   - Execute as: Me
   - Who has access: Anyone
7. Gunakan URL Web App yang sama / terbaru di aplikasi.


## Update v23 – Auto Frame Capture + QR Privat + Fix Template

Perubahan:
- Pilihan layout dihapus.
- Jumlah jepretan sekarang otomatis mengikuti frame.
- Frame yang butuh 2/3 foto akan otomatis mengambil 2/3 foto.
- QR sekarang diarahkan ke halaman foto privat per sesi, bukan ke folder Drive.
- QR diperbesar dan URL dipersingkat agar lebih mudah dipindai.
- 3 template terbaru dibust-cache dan diperbaiki kembali:
  - TI UMY Friendship
  - Daily Quote
  - IT Future

Catatan frame otomatis saat ini:
- Yogyakarta City Series → 1 foto
- TI UMY Campus Series → 1 foto
- TI UMY Showcase → 1 foto
- UMY Campus Series → 1 foto
- UMY City Series → 1 foto
- TI UMY Friendship → 3 foto
- Daily Quote → 2 foto
- IT Future → 3 foto

Penting:
- Paste ulang file `apps-script/Code.gs` ke Google Apps Script.
- Deploy ulang Web App setelah mengganti Code.gs.


## Update v24 – Alur Frame Dulu + Preview Frame + QR Lebih Besar

Perubahan:
- Posisi panel ditukar: pengaturan sesi ada di kiri, pengambilan foto ada di kanan.
- Pilihan layout tetap dihapus.
- Saat memilih frame, aplikasi langsung menampilkan:
  - preview frame
  - jumlah take foto otomatis sesuai frame
  - instruksi singkat sebelum mulai foto
- QR diperbesar menjadi 230px dan ditambah link cadangan “buka link foto”.
- QR tetap privat per sesi dan memakai parameter `?n=nama-file.jpg`.

Jika QR hasil scan masih menampilkan teks “LabShot Drive aktif”, artinya salah satu dari ini:
1. Google Apps Script belum diganti dengan `apps-script/Code.gs` versi terbaru.
2. Apps Script sudah diganti tetapi belum Deploy → New version.
3. GitHub Pages masih membaca app.js lama karena cache. Tekan Ctrl+F5.
4. QR yang discan berasal dari hasil foto lama sebelum update.


## Update v25 – Perbaikan Preview Frame

Perubahan:
- Preview frame sekarang memiliki `src` default, jadi tidak kosong saat halaman pertama dibuka.
- Ditambahkan fallback script di `index.html` agar preview tetap berubah saat frame dipilih meskipun cache app.js terlambat update.
- Preview frame memakai cache-buster `?v=25`.
- Jika preview gagal, pesan error akan menunjukkan bahwa folder `assets/frames` belum ikut di-upload.
- QR diperbesar lagi menjadi 250px.


## Update v26 – Layout Lebih Rapi Tanpa Scroll + Logo Baru

Perubahan:
- Tampilan desktop dibuat 3 kolom:
  - kiri: pengaturan frame/filter
  - tengah: kamera
  - kanan: hasil foto + QR
- Dirancang agar tidak perlu scroll ke bawah pada layar desktop.
- Preview frame diperbesar agar tulisan dalam template lebih terbaca.
- Logo `assets/logo-ti-umy.png` diganti dengan logo terbaru dari lampiran.
- Asset frame yang dihapus:
  - `birthday-collage.png`
  - `birthday-camera.png`
  - `memories-box.png`
  - `memories-simple.png`
- Konfigurasi `memoriesSimple` dihapus dari app.js karena tidak lagi digunakan.


## Update v27 – Foto Langsung Tampil Setelah Scan QR

Perubahan:
- `apps-script/Code.gs` diperbarui.
- Saat QR discan dan foto sudah tersedia, foto langsung tampil di halaman.
- Tidak perlu klik tombol “Buka Gambar” terlebih dahulu.
- Gambar disisipkan langsung sebagai base64 data URL di halaman HTML.
- Tombol “Download Foto” tetap tersedia.
- Jika browser HP tertentu tidak mendukung tombol download data URL, pengunjung bisa tekan dan tahan gambar lalu simpan gambar.

Penting:
- Paste ulang `apps-script/Code.gs` ke Google Apps Script.
- Deploy ulang Web App sebagai `New version`.


## Update v28 – Preview Live Masuk ke Kotak Foto

Perubahan:
- Preview frame sekarang mengikuti proporsi frame story IG, jadi tidak memanjang dengan area kosong berlebih.
- Saat kamera aktif, preview live langsung masuk ke kotak foto pada frame.
- Untuk frame 2 atau 3 foto:
  - sebelum foto 1 diambil, slot 1 tampil LIVE
  - setelah foto 1 diambil, slot 1 berisi hasil foto 1 dan slot 2 tampil LIVE
  - setelah foto 2 diambil, slot 1–2 berisi hasil sebelumnya dan slot 3 tampil LIVE
- Slot aktif diberi badge `LIVE` agar pengguna mudah memperkirakan framing.
- Script fallback preview lama di `index.html` dihapus karena sekarang semua preview ditangani langsung oleh `app.js`.


## Update v29 – Preview Box Saja yang Disesuaikan

Perubahan:
- Yang disesuaikan hanya kotak luar preview.
- Frame preview tidak lagi dipaksa mengisi box dengan rasio tetap.
- Canvas preview sekarang tampil dengan `height: auto`, sehingga frame tidak terlihat seperti ditarik.
- Cocok untuk frame yang memiliki proporsi sedikit berbeda.


## Update v30 – Kualitas Preview Disamakan + QR Lebih Besar

Perubahan:
- Preview frame dibuat lebih tajam agar tampilannya lebih dekat dengan kamera utama.
- Canvas preview memakai backing resolution lebih besar (`1.5x`) supaya hasil live preview tidak tampak kusam.
- `imageSmoothingQuality` diatur ke `high`.
- Refresh preview dipercepat dari 150 ms menjadi 90 ms.
- Preview frame sedikit diperbesar.
- QR code di panel hasil diperbesar supaya lebih mudah discan.


## Update v31 – Review Foto Sebelum Finish

Perubahan:
- Setelah semua foto diambil, hasil akhir dan QR belum langsung dibuat.
- Thumbnail di bawah kamera sekarang bisa diklik untuk memilih foto.
- Foto terpilih bisa:
  - digeser ke kiri
  - digeser ke kanan
  - di-retake tanpa mengulang semua foto
- Setelah urutan dan hasil foto sudah cocok, klik `Finish & Buat QR`.
- QR dan hasil akhir baru muncul setelah tombol Finish diklik.


## Update v32 – Preview Sinkron dengan Kamera Utama + Tombol Foto Baru

Perubahan:
- Preview frame live sekarang mengambil area yang benar-benar terlihat pada kamera utama.
- Foto yang ditangkap juga memakai area tampilan kamera utama, sehingga hasilnya lebih konsisten dengan preview besar.
- Tombol `Bagikan` diubah menjadi `Foto Baru`.
- Tombol `Foto Baru` akan:
  - menghapus hasil sesi sebelumnya
  - membersihkan thumbnail/review
  - mempertahankan kamera tetap aktif
  - menyiapkan sesi untuk orang berikutnya


## Update v33 – Menu Tema + Template One Piece

Perubahan:
- Menambahkan dropdown `Tema` sebelum `Template`.
- Tema baru: `One Piece / Anime Pirate`.
- Menambahkan 9 template dari file `one piece.zip`.
- Area foto pada template baru sudah dibuat transparan otomatis dari area checkerboard.
- Template baru disimpan di `assets/frames/one-piece/`.
- Jumlah take foto otomatis mengikuti jumlah slot foto pada template.

Catatan:
- Template `Pirate Memory Board` dan `Grand Line Journal` memiliki 2 slot foto.
- Template lain memiliki 1 slot foto.


## Update v34 – Tema SIE Expo 2026

Perubahan:
- Menambahkan tema baru: `SIE Expo 2026`.
- Menambahkan 11 template dari `Expo.zip`.
- Alur tetap: pilih Tema → pilih Template → pilih Filter → Aktifkan Kamera → Mulai Foto.
- Semua template Expo menggunakan 1 foto otomatis.
- Area foto pada template Expo sudah dibuat transparan otomatis.
- Template tersimpan di `assets/frames/expo/`.


## Update v35 – Expo Photo Layer + Pilihan Kamera

Perubahan:
- Tema SIE Expo diperbaiki agar foto terasa berada di belakang template, bukan seperti ditempel di depan.
- Background blur full-bleed dinonaktifkan khusus template Expo agar foto hanya muncul pada lubang foto template.
- Ditambahkan inner shadow pada area foto Expo supaya lebih natural menyatu dengan frame.
- Pilihan kamera dibuat selalu tersedia untuk memilih webcam eksternal.
- Tombol refresh kamera (↻) ditambahkan untuk membaca ulang daftar kamera setelah webcam eksternal dipasang/diizinkan browser.


## Update 4K QR Output
- Hasil akhir download dirender 4K portrait: 2160 × 3840 px.
- File yang dikirim ke Google Drive dan dibuka melalui QR juga memakai resolusi 2160 × 3840 px.
- Preview aplikasi tetap ringan memakai basis 1080 × 1920 agar laptop tidak terbebani sebelum klik Finish.
- Catatan: proses upload QR bisa sedikit lebih lama karena ukuran gambar lebih besar.

## Update v38 – Tambahan 7 Template Expo + Output Final 4K

Perubahan:
- Menambahkan **7 template baru** ke tema **SIE Expo 2026**.
- Semua template Expo baru sudah dimasukkan ke folder `assets/frames/expo/`.
- Area kotak foto pada 7 template baru sudah disesuaikan dan dibersihkan agar hasil foto lebih menyatu dengan template.
- Render final untuk hasil scan QR tetap memakai **4K portrait (2160 × 3840 px)**.
- Opsi **pilih kamera** tetap aktif, sehingga webcam internal atau kamera eksternal bisa dipilih dari aplikasi.

Template Expo tambahan:
- SIE Expo - Innovation Panel
- SIE Expo - Ideas Ignite
- SIE Expo - Collaboration Glow
- SIE Expo - Future Circuit
- SIE Expo - Science Spark
- SIE Expo - Bold Blueprint
- SIE Expo - Smart Collaboration
