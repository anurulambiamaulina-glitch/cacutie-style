# Cacutie Style: Website E-Commerce (GitHub Pages + Google Apps Script + Google Sheets)

> **Status jujur:** kode ini dibuat tanpa bisa dijalankan di browser atau Apps Script. Hanya pemeriksaan sintaks JavaScript yang dilakukan. Semua pengujian fungsi (checklist di bawah) **harus kamu jalankan sendiri**, terutama komunikasi lintas domain (uji #22).

## 1. Arsitektur

```
Browser (GitHub Pages: HTML/CSS/JS statis)
   | BACA data publik  -> JSONP (tag <script>)
   | TULIS / lacak / admin -> form POST ke iframe tersembunyi, jawaban via postMessage
   v
Google Apps Script Web App (/exec)  -> validasi, LockService, token admin
   v
Google Sheets (database)
```

**Kenapa bukan `fetch()` biasa?** Apps Script me-redirect `/exec` dan tidak bisa mengatur header CORS. `no-cors` bisa mengirim tetapi responsnya tidak terbaca, jadi website tidak tahu pesanan berhasil atau tidak. Maka dipakai JSONP (baca) dan form+iframe+`postMessage` (tulis).

**Keamanan komunikasi:**
- Jawaban POST dikirim dengan `targetOrigin` = `ALLOWED_ORIGIN` (bukan `*`), jadi situs lain tidak bisa membaca hasilnya.
- Frontend memeriksa origin pengirim (`*.googleusercontent.com`), format pesan, dan `rid` acak milik permintaan itu.
- Kunci admin hanya ada di Script Properties. Login menghasilkan token acak (berlaku 6 jam) yang disimpan di `sessionStorage` dan diverifikasi backend pada **setiap** aksi admin.
- Backend menghitung ulang harga, stok, ongkir, dan total. `LockService` mencegah stok negatif. Kunci permintaan (`client_key`) mencegah pesanan ganda.

**Batasan yang perlu kamu tahu:**
- Apps Script tidak bisa membaca header `Origin`, jadi server tidak bisa menolak permintaan dari situs lain. Perlindungannya: validasi input, token admin, pembatasan percobaan, dan data publik saja yang lewat JSONP.
- Admin memakai **satu kunci bersama** (tidak ada akun per orang): tidak ada jejak siapa melakukan apa. Jika kunci bocor, ganti `ADMIN_KEY` di Script Properties. Kunci salah 5 kali mengunci login 15 menit untuk semua orang.
- Web App berjalan sebagai pemilik, jadi punya akses penuh ke spreadsheet. Karena itu semua input divalidasi. **Jangan bagikan spreadsheet** ke pengunjung.
- Google Sheets bukan database transaksional. Pesanan ditulis lalu stok dikurangi; jika langkah gagal, kode mencoba membatalkan tulisan sebelumnya (rollback manual). Itu cukup untuk skala tugas, bukan skala toko besar.
- Gambar produk contoh belum memakai foto. Sistem menampilkan penanda nama produk sampai admin mengisi tautan gambar HTTPS. Isi tautan gambar lewat panel admin.
- Ongkir adalah tarif flat buatan admin. Pembayaran manual (transfer atau lewat WhatsApp), tanpa payment gateway. Ulasan **belum terverifikasi sebagai pembelian**.

## 2. Struktur file

```
cacutie-style/                 <- SEMUA ini diunggah ke GitHub, KECUALI folder apps-script
├── index.html                 halaman toko (beranda, katalog, detail, keranjang, checkout, lacak, info)
├── admin.html                 panel admin
├── css/style.css
├── js/config.js               <- isi API_URL di sini
├── js/api.js                  komunikasi ke Apps Script (satu-satunya pintu)
├── js/app.js                  logika toko
├── js/admin.js                logika admin
├── apps-script/Code.gs        <- DITEMPEL ke Apps Script, JANGAN diunggah ke GitHub
└── README.md
```

Penyederhanaan dari contoh struktur: toko dibuat satu halaman (`index.html`) dengan rute `#/produk`, `#/keranjang`, dst., supaya tidak ada tautan antarfile yang patah di GitHub Pages. Backend cukup satu `Code.gs`, dan tidak butuh file HTML tambahan di Apps Script (respons `postMessage` dibuat dari kode).

## 3. Struktur Google Sheets (dibuat otomatis oleh `setup()`)

| Sheet | Kolom |
|---|---|
| `ProfilToko` | key, value |
| `Produk` | product_id, sku, nama, kategori, deskripsi, harga, gambar, label, tampil, dibuat, diperbarui |
| `Varian` | variant_id, product_id, warna, ukuran, stok, aktif |
| `Pesanan` | order_id, kode, nama, whatsapp, alamat, kota, catatan, pengiriman, ongkir, subtotal, total, metode_bayar, status_bayar, status, resi, stok_dikembalikan, client_key, dibuat, diperbarui |
| `ItemPesanan` | item_id, order_id, product_id, variant_id, sku, nama, warna, ukuran, harga, jumlah, subtotal |
| `Ulasan` | review_id, product_id, nama, rating, komentar, status, dibuat |

Relasi: `Produk (1) -> (banyak) Varian`; `Pesanan (1) -> (banyak) ItemPesanan`; `ItemPesanan.variant_id -> Varian`; `Ulasan.product_id -> Produk`. Stok disimpan **per varian**. Nilai `tampil` dan `aktif` berisi `ya` atau `tidak`. Item pesanan menyimpan salinan nama dan harga saat membeli, jadi riwayat tidak berubah saat produk diedit.

## 4. Panduan pemasangan dari nol

### Tahap 1: Google Sheets
1. Buka <https://sheets.google.com>, buat spreadsheet kosong, beri nama **Cacutie Style DB**.
2. Biarkan kosong. Sheet dan data contoh dibuat otomatis di tahap 2.

### Tahap 2: Apps Script
1. Di spreadsheet: **Extensions > Apps Script**.
2. Hapus isi `Code.gs` bawaan, lalu tempel seluruh isi `apps-script/Code.gs`. Klik **Save**.
3. **Project Settings (ikon roda gigi) > Script Properties > Add script property**, tambahkan:
   - `ADMIN_KEY` = kunci rahasia pilihanmu, **minimal 12 karakter**.
   - `ALLOWED_ORIGIN` = alamat GitHub Pages-mu **tanpa nama repo dan tanpa garis miring akhir**, contoh `https://usernamekamu.github.io`. (Kalau belum tahu username, kerjakan Tahap 5 dulu lalu isi.)
4. Kembali ke editor, pilih fungsi **`setup`** di dropdown, klik **Run**. Setujui izin (pilih akun > *Advanced* > *Go to project* > *Allow*). Layar peringatan itu normal untuk skrip buatan sendiri.
5. Cek spreadsheet: harus ada 6 sheet, 10 produk di `Produk`, varian di `Varian`, dan pengaturan di `ProfilToko`. `setup()` aman dijalankan ulang: tidak menghapus data dan tidak menggandakan produk.
6. Isi `whatsapp_toko` (format `6281234567890`) dan `info_transfer` (rekening) di sheet `ProfilToko` atau nanti lewat panel admin.

### Tahap 3: Deploy Web App
1. **Deploy > New deployment > ikon roda gigi > Web app**.
2. **Execute as: Me**. **Who has access: Anyone** (wajib, agar pengunjung bisa membuka toko tanpa login Google).
3. Klik **Deploy**, setujui izin, lalu **salin Web app URL** (berakhiran `/exec`).
4. Konsekuensi keamanan: siapa pun yang tahu URL bisa memanggil endpoint, dan kode berjalan dengan hak akses pemilik. Karena itu aksi admin wajib token, dan semua input divalidasi di server.
5. Uji: buka URL `/exec` di browser. Harus muncul JSON dengan `"spreadsheetReady":true`, `"originReady":true`, `"adminKeyReady":true`. Jika ada yang `false`, periksa Script Properties.
6. **Setiap kali mengubah `Code.gs`**: **Deploy > Manage deployments > ikon pensil > Version: New version > Deploy**. URL tetap sama. Jangan membuat deployment baru kalau tidak perlu, karena URL-nya akan berbeda.

### Tahap 4: Frontend
1. Buka `js/config.js`, ganti `GANTI_DENGAN_URL_WEB_APP_ANDA` dengan URL Web App dari tahap 3.
2. Gambar produk: buka panel admin > Produk > Edit, isi tautan gambar HTTPS (misalnya gambar yang kamu unggah ke repository GitHub atau layanan lain yang punya tautan langsung). Jangan memakai foto yang bukan milikmu dan jangan klaim foto contoh sebagai foto asli toko.

### Tahap 5: GitHub Pages
1. Buat akun di <https://github.com>, lalu **New repository** (misal `cacutie-style`, Public).
2. **Add file > Upload files**, unggah `index.html`, `admin.html`, folder `css`, folder `js`, dan `README.md` (kalau unggah lewat browser, tarik folder-nya sekaligus). **Jangan unggah folder `apps-script`.** Pastikan `index.html` ada di root repository. Klik **Commit changes**.
3. **Settings > Pages > Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`, **Save**.
4. Tunggu 1 sampai 3 menit. Alamatnya `https://USERNAME.github.io/cacutie-style/`.
5. Pastikan `ALLOWED_ORIGIN` di Script Properties = `https://USERNAME.github.io` (tanpa `/cacutie-style`). Jika baru mengubahnya, tidak perlu deploy ulang.

### Tahap 6: Pengujian akhir
Ikuti checklist di bagian 5. Buka tab Console (F12) jika ada masalah, dan ubah `DEBUG: true` di `config.js` untuk melihat log komunikasi.

## 5. Checklist pengujian manual

Status saat ini: **belum ada yang diuji di browser**. Centang setelah kamu coba sendiri.

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka beranda | Hero, kategori, produk unggulan dan terbaru tampil dari data Sheets |
| 2 | Cari "kaos", filter kategori, urut harga, centang "hanya yang tersedia" | Daftar menyesuaikan; pencarian kosong menampilkan "Produk tidak ditemukan" |
| 3 | Buka detail produk | Foto/penanda, SKU, harga, deskripsi, warna, ukuran, stok varian |
| 4 | Pilih warna dan ukuran | Opsi yang habis dicoret; stok varian tampil; jumlah tidak melebihi stok |
| 5 | Tambah beberapa produk ke keranjang | Notifikasi muncul, angka di ikon keranjang bertambah |
| 6 | Ubah jumlah, hapus item | Subtotal dan total ikut berubah; keranjang kosong tampil pesan ramah |
| 7 | Checkout tanpa login | Tidak ada permintaan login/registrasi; sampai konfirmasi |
| 8 | Kirim form tidak lengkap atau WA salah | Pesan error di bawah kolom yang salah; fokus pindah ke kolom itu |
| 9 | Ubah stok varian di Sheets jadi 0 lalu checkout | Dialihkan ke keranjang dengan pesan jelas; pesanan tidak dibuat |
| 10 | Ubah harga di Sheets setelah item masuk keranjang | Ringkasan checkout memakai harga baru; server memakai harga database |
| 11 | Buat pesanan | Baris baru di `Pesanan` dan `ItemPesanan`; stok varian berkurang sesuai jumlah |
| 12 | Cek nomor pesanan | Format `CSyymmdd-XXXXX`, unik tiap pesanan |
| 13 | Lacak dengan kode + WA yang benar | Status, item, total tampil (tanpa alamat lengkap) |
| 14 | Lacak dengan WA salah / kode ditebak | Pesan "tidak ditemukan"; setelah 5 kali salah dikunci sementara |
| 15 | Login admin dengan kunci benar/salah | Benar masuk; salah ditolak; 5 salah mengunci 15 menit |
| 16 | Admin tambah/edit produk dan stok, coba SKU kembar | Tersimpan di Sheets; SKU kembar ditolak |
| 17 | Ubah status pesanan, isi resi | Tersimpan; pelanggan melihat status baru |
| 18 | Batalkan pesanan | Stok kembali **sekali**; pesanan terkunci, tidak bisa diubah/dibatalkan lagi |
| 19 | Buka di HP dan desktop | Tidak ada geser horizontal; tombol mudah ditekan; menu mobile bekerja |
| 20 | Tutup tab admin lalu buka lagi / hapus token | Wajib login lagi; aksi admin tanpa token ditolak `UNAUTHORIZED` |
| 21 | Klik "Buat Pesanan" cepat berulang | Hanya satu pesanan tercatat |
| 22 | **Lintas domain di GitHub Pages sungguhan** | Pesanan, lacak, dan admin berhasil (bukan hanya baca produk). Jika gagal, lihat troubleshooting |
| 23 | Dua pesanan hampir bersamaan untuk stok terakhir | Salah satu ditolak "stok tersisa"; stok tidak negatif |

**Sudah diuji:** hanya sintaks JavaScript. **Wajib kamu uji sendiri:** semua baris di atas.

## 6. Penerapan 10 heuristik Nielsen dan evaluasi

| # | Heuristik | Penerapan | Skenario uji | Kriteria lulus |
|---|---|---|---|---|
| 1 | Visibility of system status | Spinner "Memuat", tombol berubah "Membuat pesanan...", toast tambah keranjang, status pesanan, label "Habis" | Buat pesanan dengan koneksi lambat | Ada umpan balik di setiap proses; sukses hanya muncul setelah server menjawab |
| 2 | Match with real world | Bahasa Indonesia sederhana, format Rupiah, ukuran S/M/L, ikon tas dan kaca pembesar | Minta 3 teman membaca label menu | Tidak ada istilah yang membingungkan |
| 3 | User control & freedom | Tautan kembali, ubah jumlah, hapus item, "Ubah data pengiriman", ringkasan sebelum pesanan dikirim | Mundur dari ringkasan ke form lalu ke keranjang | Data form tetap terisi; tidak ada langkah terkunci |
| 4 | Consistency & standards | Satu gaya tombol (`.btn`), palet cokelat sama di toko dan admin, istilah konsisten | Bandingkan tombol di semua halaman | Fungsi sama tampil dan bekerja sama |
| 5 | Error prevention | Validasi form, opsi habis dinonaktifkan, jumlah dibatasi stok, konfirmasi aksi admin, kunci anti-ganda, total dihitung server | Isi WA salah; klik ganda; jumlah melebihi stok | Kesalahan dicegah atau ditolak sebelum tersimpan |
| 6 | Recognition vs recall | Foto, varian, harga di keranjang; indikator langkah checkout; pesanan terakhir di halaman lacak | Selesaikan checkout tanpa membuka catatan | Pengguna tidak perlu mengingat pilihan sebelumnya |
| 7 | Flexibility & efficiency | Pencarian, filter, urut harga, checkout tamu, tombol Beli Sekarang | Cari dan beli satu produk | Tidak ada langkah yang tidak perlu |
| 8 | Aesthetic & minimalist | Palet terbatas, ruang kosong, tanpa pop-up, animasi minimal | Penilaian visual oleh 3 orang | Info produk tidak tertutup dekorasi |
| 9 | Recognize, diagnose, recover from errors | Pesan menjelaskan masalah dan solusi ("ukuran habis, pilih lain"); keranjang tidak dikosongkan saat gagal; timeout aman diulang | Matikan internet saat checkout | Pesan jelas, keranjang utuh, tidak ada pesanan ganda |
| 10 | Help & documentation | FAQ, cara melacak, info pengiriman, kontak, kebijakan privasi dan pengembalian di footer | Cari cara melacak pesanan | Ditemukan dalam 2 klik |

**Catatan:** fitur sudah dibuat untuk tiap heuristik, tetapi itu belum berarti "lulus". Kelulusan harus dibuktikan lewat uji pengguna (misalnya 3 sampai 5 orang) dan dicatat hasilnya.

## 7. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Pesan "URL backend belum diisi" | `API_URL` masih placeholder | Isi `js/config.js` dengan URL `/exec` |
| "Gagal menghubungi server" saat membuka toko | Akses deployment bukan *Anyone*, URL salah, atau memakai `/dev` | Deploy ulang dengan akses Anyone; salin URL `/exec` |
| Produk muncul tetapi checkout/lacak/login **timeout** | `ALLOWED_ORIGIN` kosong/salah, atau pesan ditolak karena origin iframe | Pastikan `ALLOWED_ORIGIN` = `https://USERNAME.github.io` persis; nyalakan `DEBUG` dan lihat Console. Jika Console mencatat "ditolak, origin: ..." dengan origin Google lain, kirim log itu agar aturan origin disesuaikan |
| Perubahan `Code.gs` tidak berpengaruh | Deployment belum diperbarui | Manage deployments > pensil > New version |
| "Backend belum disiapkan" | `setup()` belum dijalankan | Jalankan `setup()` dari editor |
| "ADMIN_KEY belum diatur" | Script Property belum ada atau kurang dari 12 karakter | Tambahkan di Script Properties |
| Gambar tidak tampil | Tautan bukan HTTPS atau tidak publik | Pakai tautan gambar langsung yang publik; yang gagal otomatis diganti penanda nama |
| Halaman GitHub Pages 404 | `index.html` tidak di root atau Pages belum aktif | Periksa lokasi file dan pengaturan Pages |
| Data tanggal/nomor WA berubah format di Sheets | Kolom tidak berformat teks | Jalankan ulang `setup()` (aman) agar format teks diterapkan |

**Membersihkan data uji:** fungsi `resetDataTransaksi_HAPUS_SEMUA()` di `Code.gs` menghapus semua pesanan, item, dan ulasan. Fungsi ini **tidak pernah berjalan otomatis**; jalankan manual hanya sebelum toko dipakai sungguhan.
