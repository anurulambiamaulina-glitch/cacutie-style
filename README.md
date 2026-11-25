# Cacutie Style: Toko Online (GitHub Pages + Google Apps Script + Google Sheets)

Satu tautan untuk semua. Beranda, menu, dan footer **baru tampil setelah pengunjung memilih cara masuk**. Saat dibuka: **Masuk sebagai Tamu**, **Login / Buat Akun**, atau (tautan kecil) **Login Admin**. Dua bahasa: Indonesia dan English.

> **Status pengujian:** logika backend diuji dengan tiruan layanan Google (52 tes) dan alur tampilan di browser tiruan (37 tes). Tampilan visual (terutama mode gelap dan tata letak) hanya diperiksa lewat aturan warna dan struktur, bukan di layar sungguhan. Google Sheets asli, GPS/lokasi di HP, dan komunikasi lintas domain di browser sungguhan **belum diuji**. Gunakan checklist di bagian 4.

## 1. Fitur
- **Pelanggan:** katalog, foto geser (hingga 5 foto), panduan ukuran per produk, keranjang, checkout tamu atau akun, lacak pesanan dengan linimasa, ulasan dari pembeli, ajukan retur.
- **Alamat:** opsi **Gunakan lokasi saya** (opsional) atau isi manual. Pelanggan yang login: alamat tersimpan dan terisi otomatis (tetap diperiksa sebelum lanjut). Tamu harus mengisi alamat setiap kali.
- **Pembayaran:** Transfer Bank, QRIS (gambar QRIS milikmu), COD (per jasa kirim), konfirmasi via WhatsApp. Semua dikonfirmasi **manual** oleh admin.
- **Admin:** ringkasan, **laporan** (pengunjung, keranjang, pesanan), produk, pesanan, **after sales + retur**, ulasan, jasa kirim (tarif + COD), iklan (gambar/video/info), pengaturan toko.
- **Email notifikasi:** setiap pesanan baru, pembatalan oleh pelanggan, dan pengajuan retur dikirim ke Gmail admin (Pengaturan toko > Email notifikasi pesanan, ada tombol **Kirim email uji**).
- **Lacak pesanan tanpa mengingat nomor:** cari dengan nomor WhatsApp + nama pemesan, atau ketuk pesanan terakhir di perangkat (satu ketukan), atau lewat Akun Saya. Cara lama (nomor pesanan + WhatsApp) tetap ada.
- **Batalkan pesanan:** pelanggan dapat membatalkan sendiri selama pesanan belum diproses dan masih dalam batas waktu (bawaan 60 menit; atur atau nonaktifkan di Pengaturan toko). Stok dikembalikan otomatis satu kali.
- **Laporan bergrafik:** grafik harian dalam satu bulan, perbandingan 6 bulan, dan perkiraan akhir bulan berjalan.
- **Mode terang/gelap:** tombol bulan/matahari di gerbang, header toko, dan header admin. Pilihan disimpan di perangkat; jika belum memilih, mengikuti pengaturan perangkat.
- **Transfer Bank dengan pilihan bank:** admin mengisi rekening di Pengaturan toko > Rekening bank. Pelanggan memilih bank, lalu melihat nomor rekening dan tombol salin setelah pesanan dibuat.
- **Estimasi tiba:** admin mengisi estimasi hari (min-maks) per jasa kirim dan lama pemrosesan; pelanggan melihat perkiraan tanggal tiba (hari Minggu tidak dihitung, hari libur tidak diperhitungkan).
- Kolom kata sandi punya tombol mata (tampilkan/sembunyikan).
- **Iklan mengambang** kecil di pojok kiri bawah (ada tombol tutup, diingat selama sesi). Jika tidak ada iklan berjenis Mengambang, tampil banner gratis ongkir otomatis dari pengaturan toko.
- **Bahasa English** juga menerjemahkan nama dan deskripsi produk, panduan ukuran, iklan, dan langkah retur (kolom English di panel admin; kosong = diterjemahkan otomatis dengan terjemahan mesin Google, lalu bisa diedit).
- Profil (ikon orang): tamu melihat ajakan login; pelanggan melihat data diri, alamat, riwayat pembelian; admin melihat panel admin.

## 2. Catatan jujur
- **Email:** menambah izin "Kirim email". Setelah menempel `Code.gs` baru, jalankan fungsi `setup` di editor, **setujui izin baru**, lalu terapkan versi baru deployment. Kuota email Gmail biasa sekitar 100 per hari. Email gagal terkirim tidak menggagalkan pesanan.
- **Lacak via WhatsApp + nama** memakai nama persis seperti saat checkout (huruf besar/kecil dan spasi ganda diabaikan). Percobaan menebak dibatasi. Ini lebih longgar daripada nomor pesanan, namun hanya menampilkan kode, tanggal, total, dan status.
- **Grafik:** jumlah pengunjung bulan depan tidak dapat dihitung sebelum bulannya berjalan. Yang tersedia: bulan lalu, bulan ini, dan perkiraan akhir bulan ini (rata-rata harian dikalikan jumlah hari, bukan jaminan).
- **Kecepatan:** data beranda disimpan di perangkat dan di server selama 60 detik; perubahan data oleh admin menghapus simpanan server otomatis. Perubahan langsung di Google Sheets bisa terlihat sampai 60 detik kemudian.
- **Bahasa Indonesia** memakai gaya formal ("Silakan ...", "Anda").
- **Bank:** bank contoh (BCA, BRI, BNI, Mandiri) dibuat **nonaktif dan tanpa nomor rekening**. Isi rekening milikmu lalu aktifkan; sistem menolak mengaktifkan bank tanpa nomor rekening dan atas nama.
- **Estimasi tiba** adalah perkiraan, bukan jaminan. Angka bawaan jasa kirim (misalnya JNE 2-4 hari) hanya contoh awal: sesuaikan di tab Jasa kirim.
- **Tautan iklan:** pilih tujuan dari daftar di admin (produk, kategori, Bantuan). Jika iklan menaut ke produk yang sudah tidak ada, tombolnya otomatis membuka katalog.
- **Lokasi otomatis:** koordinat dikirim ke layanan OpenStreetMap (Nominatim) hanya saat tombol ditekan, untuk diubah menjadi alamat. Hasilnya bisa kurang tepat, jadi pembeli harus memeriksa dan melengkapinya. Toko tidak menyimpan koordinat.
- **Alamat tersimpan** disimpan di sheet `Pelanggan` (terlihat oleh pemilik spreadsheet). Beri tahu pelanggan bila perlu.
- **Statistik pengunjung** dihitung per browser/perangkat (ID acak, tanpa data pribadi), kira-kira satu kali per hari per perangkat. Bukan jumlah orang yang pasti. Terisi sejak versi ini dipasang.
- **After sales** memakai WhatsApp: tombol membuka WhatsApp dengan pesan terisi dan admin menekan kirim sendiri. Tidak ada chat dalam aplikasi dan tidak ada pesan otomatis (itu butuh WhatsApp Business API berbayar).
- **COD:** centang COD hanya untuk jasa kirim yang benar-benar melayani. Jasa kirim lama otomatis diberi COD "ya" saat `setup` dijalankan, **periksa di tab Jasa kirim**.
- **Retur:** teks cara retur dan batas 3 hari adalah **bawaan yang bisa diganti** di Pengaturan toko (batas hari dan langkah-langkah). Sesuaikan dengan kebijakanmu.
- **Panduan ukuran** contoh adalah angka contoh. Ganti dengan ukuran asli produkmu di Produk > Edit.
- Admin memakai satu kunci bersama. Akun pelanggan: hash SHA-256 bergaram (bukan bcrypt), tanpa verifikasi email dan "lupa kata sandi".
- Status pesanan diubah manual oleh admin, bukan pelacakan lokasi kurir. Ongkir = tarif yang kamu tetapkan.
- Terjemahan: antarmuka toko dua bahasa. Teks produk/iklan memakai terjemahan mesin bila admin tidak mengisi sendiri, jadi hasilnya bisa kurang tepat: periksa dan edit di panel admin. Ulasan pembeli dan sebagian pesan server tetap Indonesia. Panel admin hanya Indonesia.

## 3. Pemasangan dan pembaruan
1. **Apps Script:** hapus isi editor, tempel `apps-script/Code.gs` baru, simpan. Jalankan fungsi **setup** (menambah sheet `Statistik`, `Retur`, `AfterSales`, kolom baru, dan data contoh baru tanpa menghapus data lama).
2. **Deploy > Manage deployments > pensil > New version > Deploy.**
3. **GitHub:** unggah semua file frontend (versi datar: semua di halaman utama, plus folder `assets`). Jangan menimpa `config.js` milikmu.
4. Buka website dengan `Ctrl+F5`.

Script Properties: `ADMIN_KEY` (min. 12 karakter) dan `ALLOWED_ORIGIN` (`https://USERNAME.github.io`).

## 4. Checklist pengujian (belum diuji di perangkat sungguhan)
| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka tautan | Kartu awal rapi: 2 tombol utama + tautan Login Admin kecil |
| 2 | Ikon profil sebagai tamu / pelanggan / admin | Ajakan login / data diri + riwayat / info admin |
| 3 | Ikon keranjang | Bentuk keranjang (bukan tong sampah) |
| 4 | Menu | Tanpa "Semua Produk" dan tanpa "Cara Retur"; menu aktif berpil gelap. Cara Retur ada di dalam halaman **Bantuan** |
| 5 | Checkout > Gunakan lokasi saya (di HP, izinkan lokasi) | Kota dan alamat terisi, pembeli melengkapi nomor rumah |
| 6 | Login, checkout dengan centang simpan alamat, checkout lagi | Alamat terisi otomatis |
| 7 | Tamu checkout lagi | Alamat kosong |
| 8 | Pilih jasa kirim dengan/tanpa COD | COD aktif/nonaktif sesuai jasa kirim |
| 9 | Detail produk: pilih ukuran | Keterangan ukuran tampil (contoh: M: panjang baju 60 cm, lingkar dada 100 cm) |
| 10 | Admin ubah status ke Dikirim lalu Selesai | Linimasa berubah; muncul tombol ulasan dan Ajukan retur |
| 11 | Pembeli ajukan retur; admin ubah statusnya | Status dan catatan admin terlihat pembeli |
| 12 | Admin > After Sales | Pesanan Dikirim/Selesai masuk antrean; Chat WhatsApp terisi pesan; catat hasil mengeluarkannya dari antrean |
| 13 | Admin > Laporan | Pengunjung, keranjang, pesanan, persentase, tabel harian |
| 14 | **Lintas domain di GitHub Pages sungguhan** | Semua di atas berjalan |
