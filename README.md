# Cacutie Style: Toko Online (GitHub Pages + Google Apps Script + Google Sheets)

Satu tautan untuk semua: saat dibuka, muncul 3 pilihan (**Masuk sebagai Tamu**, **Login / Buat Akun**, **Login Admin**).

> **Status pengujian:** logika backend sudah diuji dengan tiruan layanan Google di komputer (bukan Google asli). Tampilan, komunikasi lintas domain di browser, dan Google Sheets asli **belum diuji**. Gunakan checklist di bagian 5.

## 1. Cara kerja

```
Browser (GitHub Pages)  --JSONP (baca)-->  Apps Script Web App  --> Google Sheets
                        --form+iframe+postMessage (tulis/akun/admin)-->
```
- Baca data publik: JSONP. Tulis, lacak, akun, admin: form POST ke iframe tersembunyi, jawaban kembali lewat `postMessage` yang hanya dikirim ke `ALLOWED_ORIGIN`.
- Backend menghitung ulang harga, stok, ongkir, dan total. `LockService` mencegah stok negatif. `client_key` mencegah pesanan ganda.
- Tiga mode: **Tamu** (tanpa akun), **Pelanggan** (akun opsional, riwayat pesanan, ulasan), **Admin** (kunci rahasia di Script Properties).
- Tombol pilihan di layar awal bukan pengaman. Keamanan admin ada di token yang diperiksa backend pada setiap aksi.

**Batasan jujur**
- Admin memakai satu kunci bersama (tidak ada jejak siapa melakukan apa). Ganti `ADMIN_KEY` jika bocor.
- Akun pelanggan: kata sandi disimpan sebagai hash SHA-256 bergaram yang diulang 1000 kali (Apps Script tidak punya bcrypt, jadi lebih lemah dari standar industri). Belum ada verifikasi email dan belum ada "lupa kata sandi". Sesi akun berlaku 6 jam.
- Apps Script tidak bisa membaca header `Origin`, jadi situs lain tetap bisa memanggil endpoint. Perlindungannya: validasi input, token, pembatasan percobaan, dan jawaban hanya dikirim ke origin kita.
- Ongkir per jasa kirim adalah tarif yang kamu tetapkan di tab Jasa kirim, bukan tarif real-time kurir. Pembayaran manual (tanpa payment gateway).
- Gambar produk bawaan adalah **ilustrasi SVG**, bukan foto. Ganti dengan foto asli lewat panel admin.
- Google Sheets bukan database transaksional. Gagal simpan akan dibatalkan (rollback manual), cukup untuk skala kecil.

## 2. Struktur file (unggah semuanya ke GitHub, KECUALI `apps-script`)

```
cacutie-style/
├── index.html           satu-satunya halaman (gerbang, toko, admin)
├── css/style.css
├── js/config.js         <- isi API_URL
├── js/api.js  js/app.js  js/admin.js
├── assets/logo.svg
├── assets/produk/p01.svg ... p10.svg
├── apps-script/Code.gs  <- DITEMPEL ke Apps Script, jangan diunggah
└── README.md
```

## 3. Sheet (dibuat otomatis oleh `setup()`)

| Sheet | Isi |
|---|---|
| `ProfilToko` | pengaturan toko (key, value) |
| `Produk`, `Varian` | produk dan stok per varian |
| `JasaKirim` | kurir_id, nama, tarif, estimasi, aktif |
| `Iklan` | ad_id, judul, teks, gambar, tautan, tombol, aktif |
| `Pelanggan` | akun opsional (hash kata sandi, bukan kata sandi) |
| `Pesanan`, `ItemPesanan` | pesanan (kolom `cust_id` terisi jika dibuat saat login) dan itemnya |
| `Ulasan` | ulasan dari pembeli (kolom `order_id`, `terverifikasi`) |

`setup()` aman dijalankan ulang: tidak menghapus data, tidak menggandakan produk, dan menambahkan sheet atau kolom baru bila versi kode bertambah.

## 4. Pemasangan

Ringkas (rincian lengkap ada di chat):
1. Buat Google Sheets, buka **Extensions > Apps Script**, tempel `Code.gs`.
2. Script Properties: `ADMIN_KEY` (min. 12 karakter) dan `ALLOWED_ORIGIN` (`https://USERNAME.github.io`, huruf kecil, tanpa `/` akhir dan tanpa nama repo).
3. Jalankan fungsi `setup`, setujui izin.
4. **Deploy > New deployment > Web app**, Execute as **Me**, access **Anyone**. Salin URL `/exec` dan uji di browser.
5. Isi `API_URL` di `js/config.js`.
6. Unggah semua file kecuali `apps-script` ke repository GitHub, aktifkan **Settings > Pages** (branch `main`, root).
7. Setiap `Code.gs` berubah: **Deploy > Manage deployments > pensil > New version > Deploy** (URL tetap).

**Memperbarui dari versi sebelumnya:** tempel `Code.gs` baru, jalankan `setup` lagi, deploy New version, lalu unggah ulang semua file frontend (termasuk folder `assets`) dan hapus `admin.html` lama dari repository.

**Mengganti foto produk:** panel admin > Produk > Edit > Tautan gambar. Bisa tautan HTTPS atau tautan berbagi Google Drive (file harus dibagikan "Siapa saja yang memiliki link").

## 5. Checklist pengujian (belum ada yang diuji di browser)

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka tautan | Muncul 3 pilihan: Tamu, Login/Buat Akun, Login Admin |
| 2 | Pilih Tamu, lihat beranda | Logo, iklan, kategori, produk dengan gambar |
| 3 | Cari, filter, urutkan produk | Daftar menyesuaikan, pesan kosong ramah |
| 4 | Pilih varian, tambah ke keranjang | Opsi habis dicoret, jumlah dibatasi stok |
| 5 | Checkout sebagai tamu, pilih JNE lalu J&T | Ongkir berubah sesuai jasa kirim; pesanan tersimpan; total dihitung server |
| 6 | Form tidak lengkap / WA salah / belum pilih jasa kirim | Pesan error per kolom |
| 7 | Buat akun, keluar, masuk lagi | Berhasil; email kembar dan sandi salah ditolak |
| 8 | Checkout saat login | Data terisi otomatis; pesanan muncul di Akun Saya |
| 9 | Lacak pesanan (tamu: kode + WA) | Benar tampil; WA salah ditolak; 5 salah mengunci sementara |
| 10 | Admin ubah status pesanan jadi Selesai | Di Lacak Pesanan / Akun Saya muncul tombol Beri ulasan |
| 11 | Kirim ulasan | Masuk "Menunggu"; ulasan kedua untuk produk yang sama ditolak |
| 12 | Admin setujui ulasan | Tampil di produk dengan label Pembeli terverifikasi |
| 13 | Admin: ubah tarif jasa kirim, ubah iklan | Berubah di checkout dan beranda |
| 14 | Admin: batalkan pesanan, coba batalkan lagi | Stok kembali sekali; pesanan terkunci |
| 15 | Aksi admin tanpa login / token pelanggan | Ditolak `UNAUTHORIZED` |
| 16 | Klik "Buat Pesanan" berulang cepat | Hanya satu pesanan |
| 17 | HP dan desktop | Tidak ada geser horizontal |
| 18 | **Lintas domain di GitHub Pages sungguhan** | Pesanan, akun, lacak, admin berhasil |

## 6. Troubleshooting

| Gejala | Solusi |
|---|---|
| "URL backend belum diisi" | Isi `js/config.js` lalu unggah ulang |
| Produk tidak muncul | URL harus `/exec`, akses **Anyone** |
| Checkout/login/akun timeout | `ALLOWED_ORIGIN` salah; nyalakan `DEBUG: true` di `config.js` dan lihat Console |
| Perubahan kode tidak berlaku | Deploy **New version** |
| Gambar produk tidak tampil | Pastikan folder `assets` ikut diunggah; untuk Drive, file harus publik |
| Salah login admin 5 kali | Terkunci 15 menit |
