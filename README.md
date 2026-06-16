# LabShot v2

Web photobox untuk Story Instagram 1080×1920 px.

## Cara upload ke GitHub

Upload semua file ini ke root repository:
```
index.html
app.js
style.css
photo.html
README.md
assets/
  logo-ti-umy.png        ← logo (sudah ada di repo lama)
  frames/
    manifest.json
    pendadaran/           ← folder kosong, isi dengan .webp
    skp/
    one-piece/
    ti-umy/
```

## Cara menambah frame

1. Siapkan file .webp (540×960 px, area foto transparan atau hitam/putih)
2. Upload ke folder tema yang sesuai di `assets/frames/{tema}/`
3. Edit `assets/frames/manifest.json`, tambahkan entry:
   ```json
   { "key": "nama-unik", "file": "nama-file.webp", "label": "Nama Tampil" }
   ```
4. Commit & push → refresh browser → frame langsung muncul

## Struktur manifest.json

```json
{
  "themes": [
    {
      "slug": "pendadaran",
      "label": "Selamat Lulus Pendadaran",
      "frames": [
        { "key": "pendadaran-1", "file": "pendadaran-1.webp", "label": "Pendadaran 1" }
      ]
    }
  ]
}
```
