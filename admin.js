/* admin.js - panel admin Cacutie Style.
   Semua otorisasi dilakukan backend (token sesi). Menyembunyikan tombol bukan keamanan. */
(function () {
"use strict";
const API = window.CSApi, ADM = API.admin, root = document.getElementById("adm"), dlg = document.getElementById("dlg");
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp" + Number(n || 0).toLocaleString("id-ID");
const notice = (m, t) => `<div class="notice ${t || ""}" role="${t === "error" ? "alert" : "status"}">${esc(m)}</div>`;
function toast(msg, type) { const el = document.createElement("div"); el.className = "toast " + (type || ""); el.textContent = msg; $("#toast").appendChild(el); setTimeout(() => el.remove(), type === "error" ? 6000 : 3000); }
const KAT = ["Wanita", "Pria", "Aksesori"], LABEL = ["", "New", "Bestseller", "Sale"];
const STATUS = ["Menunggu pembayaran", "Menunggu konfirmasi", "Diproses", "Dikemas", "Dikirim", "Selesai", "Dibatalkan"];
const BAYAR = ["Belum dibayar", "Sudah dibayar", "Dikembalikan"];
const opts = (list, cur) => list.map(x => `<option value="${esc(x)}" ${x === cur ? "selected" : ""}>${esc(x || "(tanpa label)")}</option>`).join("");
let tab = "ringkasan", products = [];

// Semua panggilan admin lewat sini; sesi habis -> kembali ke halaman login
function call(action, data) {
  return ADM.call(action, data || {}).catch(e => { if (e.code === "UNAUTHORIZED") showLogin(e.message); throw e; });
}
const loading = () => { root.innerHTML = '<div class="loading"><div class="spin"></div>Memuat...</div>'; };

/* ---------- Login ---------- */
function showLogin(msg) {
  $("#logout").hidden = true;
  root.innerHTML = `<section class="section"><div class="card" style="max-width:420px;margin:0 auto"><h1 style="font-size:1.6rem">Masuk admin</h1>
    <p class="muted">Masukkan kunci admin. Kunci diperiksa oleh server dan tidak disimpan di website ini.</p>${msg ? notice(msg, "error") : ""}
    <div class="field"><label for="key">Kunci admin</label><div class="pwwrap"><input id="key" type="password" autocomplete="current-password"><button type="button" class="eye" id="keyEye" aria-pressed="false" aria-label="Tampilkan kata sandi" title="Tampilkan kata sandi"><svg class="open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button></div></div>
    <div id="lmsg"></div><button class="btn" id="login" data-loading="Memeriksa...">Masuk</button></div></section>`;
  const go = () => {
    const k = $("#key").value; if (!k) return $("#lmsg").innerHTML = notice("Isi kunci admin terlebih dahulu.", "error");
    API.busy($("#login"), () => ADM.login(k)).then(r => { if (r) showApp(); }).catch(e => { $("#lmsg").innerHTML = notice(e.message, "error"); });
  };
  $("#keyEye").onclick = () => { const i = $("#key"), on = i.type === "password"; i.type = on ? "text" : "password"; $("#keyEye").classList.toggle("on", on); $("#keyEye").setAttribute("aria-pressed", on); const l = on ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"; $("#keyEye").setAttribute("aria-label", l); $("#keyEye").title = l; };
  $("#login").onclick = go; $("#key").onkeydown = e => { if (e.key === "Enter") go(); };
}
$("#logout").onclick = () => { ADM.logout().catch(() => {}).then(() => showLogin("Kamu sudah keluar.")); };

/* ---------- Kerangka ---------- */
function showApp() {
  $("#logout").hidden = false;
  const tabs = [["ringkasan", "Ringkasan"], ["laporan", "Laporan"], ["produk", "Produk"], ["pesanan", "Pesanan"], ["aftersales", "After Sales"], ["ulasan", "Ulasan"], ["kurir", "Jasa kirim"], ["iklan", "Iklan"], ["pengaturan", "Pengaturan toko"]];
  root.innerHTML = `<div class="admin-tabs" role="tablist" aria-label="Menu admin">${tabs.map(t => `<button role="tab" data-t="${t[0]}" aria-selected="${tab === t[0]}">${t[1]}</button>`).join("")}</div><div id="pane"></div>`;
  $(".admin-tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; $$tabs(); render(); };
  render();
}
function $$tabs() { document.querySelectorAll(".admin-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t === tab)); }
function render() {
  const pane = $("#pane"); pane.innerHTML = '<div class="loading"><div class="spin"></div>Memuat...</div>';
  ({ ringkasan: vSummary, produk: vProducts, pesanan: vOrders, ulasan: vReviews, laporan: vReport, aftersales: vAfterSales, kurir: vCouriers, iklan: vAds, pengaturan: vSettings })[tab](pane)
    .catch(e => { if (e.code !== "UNAUTHORIZED") pane.innerHTML = notice(e.message, "error"); });
}
function modal(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
dlg.addEventListener("click", e => { if (e.target.dataset.close !== undefined) dlg.close(); });

/* ---------- Ringkasan ---------- */
function vSummary(pane) {
  return call("adminDashboard").then(d => {
    pane.innerHTML = `<div class="stats">
      <div class="card stat"><span class="muted">Produk</span><b>${d.produk}</b></div><div class="card stat"><span class="muted">Varian</span><b>${d.varian}</b></div>
      <div class="card stat"><span class="muted">Total pesanan</span><b>${d.pesanan}</b></div><div class="card stat"><span class="muted">Perlu diproses</span><b>${d.perlu_diproses}</b></div>
      <div class="card stat"><span class="muted">Penjualan terbayar</span><b>${rp(d.penjualan_terbayar)}</b></div><div class="card stat"><span class="muted">Follow-up after sales</span><b>${d.aftersales_menunggu}</b></div><div class="card stat"><span class="muted">Retur baru</span><b>${d.retur_baru}</b></div></div>
      <p class="muted">Penjualan terbayar = jumlah total pesanan berstatus pembayaran "Sudah dibayar" yang tidak dibatalkan. Angka berasal dari sheet Pesanan.</p>
      <div class="card"><h2>Stok rendah (3 atau kurang)</h2>${d.stok_rendah.length ? `<div class="tablewrap"><table><thead><tr><th>Produk</th><th>Varian</th><th>Stok</th></tr></thead><tbody>${d.stok_rendah.map(s => `<tr><td>${esc(s.produk)}</td><td>${esc(s.warna)}, ${esc(s.ukuran)}</td><td>${s.stok}</td></tr>`).join("")}</tbody></table></div>` : "<p class='muted'>Tidak ada varian dengan stok rendah.</p>"}</div>`;
  });
}

/* ---------- Produk ---------- */
function vProducts(pane) {
  return call("adminListProducts").then(list => {
    products = list;
    pane.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px"><h2 style="margin:0">Produk (${list.length})</h2><button class="btn" id="addP">Tambah produk</button></div>
      <div class="card tablewrap"><table><thead><tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Tampil</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td>${esc(p.sku)}</td><td>${esc(p.nama)}</td><td>${esc(p.kategori)}</td><td>${rp(p.harga)}</td><td>${p.varian.filter(v => v.aktif).reduce((a, v) => a + v.stok, 0)}</td>
      <td><span class="pill">${p.tampil ? "Tampil" : "Disembunyikan"}</span></td><td style="white-space:nowrap"><button class="btn sm ghost" data-edit="${esc(p.product_id)}">Edit</button> <button class="btn sm ghost" data-vis="${esc(p.product_id)}">${p.tampil ? "Sembunyikan" : "Tampilkan"}</button></td></tr>`).join("")}</tbody></table></div>`;
    $("#addP").onclick = () => editProduct(null);
    pane.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.edit) editProduct(products.find(p => p.product_id === b.dataset.edit));
      if (b.dataset.vis) {
        const p = products.find(x => x.product_id === b.dataset.vis), to = !p.tampil;
        if (!confirm((to ? "Tampilkan" : "Sembunyikan") + " produk \"" + p.nama + "\" di toko?")) return;
        call("adminSetVisible", { product_id: p.product_id, tampil: to }).then(() => { toast("Perubahan disimpan.", "ok"); render(); }).catch(er => toast(er.message, "error"));
      }
    };
  });
}
function vrow(v) {
  v = v || { variant_id: "", warna: "", ukuran: "", stok: 0, aktif: true };
  return `<div class="vrow" data-vid="${esc(v.variant_id)}"><input aria-label="Warna" placeholder="Warna" value="${esc(v.warna)}" maxlength="30"><input aria-label="Ukuran" placeholder="Ukuran (S/M/All Size)" value="${esc(v.ukuran)}" maxlength="10">
    <input aria-label="Stok" type="number" min="0" max="9999" value="${v.stok}"><label class="chk" style="margin:0"><input type="checkbox" ${v.aktif ? "checked" : ""} aria-label="Aktif"> Aktif</label><button type="button" class="btn sm ghost" data-rm>Hapus</button></div>`;
}
function editProduct(p) {
  const x = p || { product_id: "", sku: "", nama: "", kategori: "Wanita", deskripsi: "", harga: "", gambar: "", label: "", tampil: true, varian: [] };
  modal(`<h2>${p ? "Edit produk" : "Tambah produk"}</h2><div class="row two">
    <div class="field"><label for="pSku">SKU (unik)</label><input id="pSku" value="${esc(x.sku)}" maxlength="30"></div>
    <div class="field"><label for="pNama">Nama produk</label><input id="pNama" value="${esc(x.nama)}" maxlength="80"></div>
    <div class="field"><label for="pKat">Kategori</label><select id="pKat">${opts(KAT, x.kategori)}</select></div>
    <div class="field"><label for="pHarga">Harga (Rp)</label><input id="pHarga" type="number" min="1000" value="${esc(x.harga)}"></div>
    <div class="field"><label for="pLabel">Label</label><select id="pLabel">${opts(LABEL, x.label)}</select></div>
    <div class="field"><label for="pImg">Foto produk (satu tautan per baris, maksimal 5; foto pertama jadi foto utama)</label><textarea id="pImg" placeholder="https://...&#10;tautan Google Drive, atau assets/produk/p01.svg">${esc(String(x.gambar || "").split("|").join("\n"))}</textarea></div></div>
    <div class="field"><label for="pDesc">Deskripsi</label><textarea id="pDesc" maxlength="600">${esc(x.deskripsi)}</textarea></div>
    <div class="field"><label for="pUk">Panduan ukuran (satu baris per ukuran, format <b>Ukuran: keterangan</b>, maksimal 12 baris)</label><textarea id="pUk" placeholder="M: panjang baju 60 cm, lingkar dada 100 cm&#10;L: panjang baju 62 cm, lingkar dada 104 cm">${esc(x.ukuran_info || "")}</textarea></div>
    <p class="muted" style="margin:0 0 8px">English: kosongkan untuk diterjemahkan otomatis saat disimpan (terjemahan mesin Google, periksa hasilnya). Isi sendiri bila ingin terjemahan yang lebih tepat.</p>
    <div class="field"><label for="pNamaEn">Nama produk (English)</label><input id="pNamaEn" maxlength="80" value="${esc(x.nama_en || "")}"></div>
    <div class="field"><label for="pDescEn">Deskripsi (English)</label><textarea id="pDescEn" maxlength="600">${esc(x.deskripsi_en || "")}</textarea></div>
    <div class="field"><label for="pUkEn">Panduan ukuran (English)</label><textarea id="pUkEn">${esc(x.ukuran_info_en || "")}</textarea></div>
    <label class="chk"><input type="checkbox" id="pShow" ${x.tampil ? "checked" : ""}> Tampilkan di toko</label>
    <h3>Varian dan stok</h3><p class="muted">Isi minimal satu varian aktif. Varian yang dihapus hanya dinonaktifkan agar riwayat pesanan tetap utuh.</p>
    <div id="vlist">${(x.varian.length ? x.varian : [null]).map(vrow).join("")}</div><button type="button" class="btn sm ghost" id="addV">Tambah varian</button>
    <div id="pMsg" style="margin-top:12px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-close>Batal</button><button class="btn" id="pSave" data-loading="Menyimpan...">Simpan</button></div>`);
  $("#addV").onclick = () => $("#vlist").insertAdjacentHTML("beforeend", vrow());
  $("#vlist").onclick = e => { if (e.target.dataset.rm !== undefined) e.target.closest(".vrow").remove(); };
  $("#pSave").onclick = () => {
    const varian = [...document.querySelectorAll("#vlist .vrow")].map(r => { const i = r.querySelectorAll("input"); return { variant_id: r.dataset.vid, warna: i[0].value.trim(), ukuran: i[1].value.trim(), stok: Number(i[2].value), aktif: i[3].checked }; });
    const data = { product_id: x.product_id, sku: $("#pSku").value, nama: $("#pNama").value, kategori: $("#pKat").value, harga: Number($("#pHarga").value), label: $("#pLabel").value, gambar: $("#pImg").value, deskripsi: $("#pDesc").value, ukuran_info: $("#pUk").value, nama_en: $("#pNamaEn").value, deskripsi_en: $("#pDescEn").value, ukuran_info_en: $("#pUkEn").value, tampil: $("#pShow").checked, varian };
    API.busy($("#pSave"), () => call("adminSaveProduct", data)).then(r => { if (r) { dlg.close(); toast("Produk tersimpan.", "ok"); render(); } })
      .catch(e => { $("#pMsg").innerHTML = notice(e.message, "error"); });
  };
}

/* ---------- Pesanan ---------- */
function vOrders(pane) {
  const f = vOrders.filter || "";
  return call("adminListOrders", { status: f }).then(list => {
    pane.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><h2 style="margin:0">Pesanan</h2><div style="min-width:220px"><label for="of">Filter status</label><select id="of"><option value="">Semua</option>${opts(STATUS, f)}</select></div></div>
      ${list.length ? `<div class="card tablewrap"><table><thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Bayar</th><th>Dibuat</th><th></th></tr></thead><tbody>
      ${list.map(o => `<tr><td>${esc(o.kode)}</td><td>${esc(o.nama)}</td><td>${rp(o.total)}</td><td><span class="pill">${esc(o.status)}</span></td><td>${esc(o.status_bayar)}</td><td>${esc(o.dibuat)}</td><td><button class="btn sm ghost" data-o="${esc(o.order_id)}">Detail</button></td></tr>`).join("")}</tbody></table></div>` : "<div class='card'><p class='muted'>Belum ada pesanan" + (f ? " dengan status ini" : "") + ".</p></div>"}`;
    $("#of").onchange = e => { vOrders.filter = e.target.value; render(); };
    pane.onclick = e => { const b = e.target.closest("button[data-o]"); if (b) orderDetail(b.dataset.o); };
  });
}
function orderDetail(id) {
  modal('<div class="loading"><div class="spin"></div>Memuat...</div>');
  call("adminGetOrder", { order_id: id }).then(o => {
    const locked = o.status === "Dibatalkan";
    modal(`<h2>${esc(o.kode)}</h2><p class="muted">Dibuat ${esc(o.dibuat)} - diperbarui ${esc(o.diperbarui)}</p>
      <p><b>${esc(o.nama)}</b> - +${esc(o.whatsapp)}<br>${esc(o.alamat)}, ${esc(o.kota)}${o.catatan ? "<br>Catatan: " + esc(o.catatan) : ""}<br><span class="muted">${esc(o.pengiriman)} - ${esc(o.metode_bayar)}${o.bank ? " - " + esc(String(o.bank).split("|")[0]) + " " + esc(String(o.bank).split("|")[1] || "") : ""}${Number(o.est_max) ? " - estimasi " + esc(o.est_min) + "-" + esc(o.est_max) + " hari" : ""}</span></p>
      <div class="tablewrap"><table><thead><tr><th>Produk</th><th>SKU</th><th>Jml</th><th>Subtotal</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.nama)}<br><span class="muted">${esc(i.warna)}, ${esc(i.ukuran)}</span></td><td>${esc(i.sku)}</td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td></tr>`).join("")}</tbody></table></div>
      <div class="sum"><div><span>Subtotal</span><span>${rp(o.subtotal)}</span></div><div><span>Ongkir</span><span>${rp(o.ongkir)}</span></div><div class="tot"><span>Total</span><span>${rp(o.total)}</span></div></div>
      ${locked ? notice("Pesanan dibatalkan. Stok sudah dikembalikan satu kali dan status tidak bisa diubah lagi.", "warn") : ""}
      <div class="row two"><div class="field"><label for="oSt">Status pesanan</label><select id="oSt" ${locked ? "disabled" : ""}>${opts(STATUS, o.status)}</select></div>
      <div class="field"><label for="oPay">Status pembayaran</label><select id="oPay" ${locked ? "disabled" : ""}>${opts(BAYAR, o.status_bayar)}</select></div></div>
      <div class="field"><label for="oResi">Nomor resi (jika ada)</label><input id="oResi" maxlength="40" value="${esc(o.resi)}" ${locked ? "disabled" : ""}></div>
      <div id="oMsg"></div><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" data-close>Tutup</button>${locked ? "" : '<button class="btn" id="oSave" data-loading="Menyimpan...">Simpan perubahan</button>'}</div>`);
    const s = $("#oSave"); if (!s) return;
    s.onclick = () => {
      const st = $("#oSt").value;
      if (st === "Dibatalkan" && !confirm("Batalkan pesanan " + o.kode + "? Stok akan dikembalikan satu kali dan status tidak bisa diubah lagi.")) return;
      if (st !== o.status && st !== "Dibatalkan" && !confirm("Ubah status menjadi \"" + st + "\"?")) return;
      API.busy(s, () => call("adminUpdateOrder", { order_id: id, status: st, status_bayar: $("#oPay").value, resi: $("#oResi").value }))
        .then(r => { if (r) { dlg.close(); toast("Pesanan diperbarui.", "ok"); render(); } }).catch(e => { $("#oMsg").innerHTML = notice(e.message, "error"); });
    };
  }).catch(e => modal(notice(e.message, "error") + '<button class="btn ghost" data-close>Tutup</button>'));
}

/* ---------- Ulasan ---------- */
function vReviews(pane) {
  return call("adminListReviews").then(list => {
    pane.innerHTML = `<h2>Ulasan</h2>${list.length ? list.map(r => `<div class="card" style="margin-bottom:10px"><b>${esc(r.nama)}</b> untuk ${esc(r.produk)} - ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} <span class="pill">${esc(r.status)}</span>${r.terverifikasi ? ' <span class="pill">Pembeli terverifikasi</span>' : ""}
      <p style="margin:6px 0">${esc(r.komentar)}</p><span class="muted">${esc(r.dibuat)}</span><div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm" data-r="${esc(r.review_id)}" data-s="Disetujui">Setujui</button><button class="btn sm ghost" data-r="${esc(r.review_id)}" data-s="Ditolak">Tolak</button></div></div>`).join("") : "<div class='card'><p class='muted'>Belum ada ulasan.</p></div>"}`;
    pane.onclick = e => { const b = e.target.closest("button[data-r]"); if (!b) return;
      if (!confirm((b.dataset.s === "Disetujui" ? "Setujui" : "Tolak") + " ulasan ini?")) return;
      call("adminModerate", { review_id: b.dataset.r, status: b.dataset.s }).then(() => { toast("Ulasan diperbarui.", "ok"); render(); }).catch(er => toast(er.message, "error")); };
  });
}

/* ---------- Pengaturan toko ---------- */
function vSettings(pane) {
  const F = [["nama_toko", "Nama toko"], ["slogan", "Slogan"], ["whatsapp_toko", "Nomor WhatsApp toko (contoh 081234567890)"], ["email_toko", "Email toko"], ["alamat_toko", "Alamat toko"], ["jam_operasional", "Jam operasional"],
    ["info_pengiriman", "Informasi pengiriman"], ["gratis_ongkir_min", "Gratis ongkir mulai belanja (Rp, isi 0 jika tidak ada promo)"], ["info_transfer", "Info transfer cadangan (dipakai hanya jika tidak ada bank aktif di bawah)"], ["email_notifikasi", "Email notifikasi pesanan (alamat Gmail admin; pesanan baru, pembatalan, dan retur dikirim ke sini)"], ["batal_menit", "Batas waktu pembatalan oleh pelanggan (menit sejak pesanan dibuat; isi 0 untuk menonaktifkan)"], ["hari_proses", "Lama pemrosesan sebelum dikirim (hari kerja, dipakai untuk estimasi tiba)"], ["cod_maks", "Batas total pesanan untuk COD (Rp, isi 0 jika tanpa batas)"], ["retur_hari", "Batas hari pengajuan retur setelah pesanan selesai"], ["info_retur", "Langkah cara retur (satu langkah per baris; kosongkan untuk memakai teks bawaan)"], ["info_retur_en", "Cara retur dalam English (kosongkan untuk terjemahan otomatis)"], ["qris_gambar", "Gambar QRIS (contoh assets/qris.png, tautan https, atau tautan Google Drive)"]];
  return call("adminGetSettings").then(s => {
    setTimeout(() => bankCard(pane), 0);
    setTimeout(() => { const b = $("#sMail"); if (b) b.onclick = () => API.busy(b, () => call("adminTestEmail")).then(r => { if (r) $("#sMsg").innerHTML = notice("Email uji berhasil dikirim. Silakan periksa kotak masuk (atau folder spam).", "ok"); }).catch(e => { $("#sMsg").innerHTML = notice(e.message, "error"); }); }, 0);
    pane.innerHTML = `<div class="card"><h2>Pengaturan toko</h2><p class="muted">Tarif ongkir per jasa kirim diatur di tab Jasa kirim. Untuk QRIS: unggah gambar QRIS ke folder assets di GitHub (misalnya assets/qris.png), lalu isi kolom Gambar QRIS dengan assets/qris.png. Selama kolom itu kosong, QRIS tidak bisa dipilih pelanggan.</p>
      ${F.map(f => (f[0] === "info_retur" || f[0] === "info_retur_en") ? `<div class="field"><label for="s_${f[0]}">${f[1]}</label><textarea id="s_${f[0]}" maxlength="1500">${esc(s[f[0]] || "")}</textarea></div>` : `<div class="field"><label for="s_${f[0]}">${f[1]}</label><input id="s_${f[0]}" value="${esc(s[f[0]] || "")}" maxlength="400"></div>`).join("")}
      <div id="sMsg"></div><button class="btn" id="sSave" data-loading="Menyimpan...">Simpan pengaturan</button> <button class="btn ghost" id="sMail" data-loading="Mengirim..." type="button">Kirim email uji</button><p class="muted" style="margin-top:10px">Agar email dapat terkirim: setelah mengisi email notifikasi, jalankan fungsi <b>setup</b> di editor Apps Script sekali dan setujui izin pengiriman email, lalu terapkan versi baru deployment. Kuota email Gmail biasa sekitar 100 per hari.</p></div>`;
    $("#sSave").onclick = () => {
      const d = {}; F.forEach(f => { d[f[0]] = $("#s_" + f[0]).value; });
      API.busy($("#sSave"), () => call("adminSaveSettings", d)).then(r => { if (r) { $("#sMsg").innerHTML = notice("Pengaturan tersimpan.", "ok"); toast("Pengaturan tersimpan.", "ok"); } })
        .catch(e => { $("#sMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Jasa kirim ---------- */
function crow(k) {
  k = k || { kurir_id: "", nama: "", tarif: 0, est_min: 0, est_max: 0, aktif: true, cod: true };
  return `<div class="crow" data-id="${esc(k.kurir_id)}"><input aria-label="Nama jasa kirim" placeholder="Nama (JNE, J&T, ...)" maxlength="30" value="${esc(k.nama)}"><input aria-label="Tarif ongkir (Rp)" type="number" min="0" placeholder="Tarif (Rp)" value="${k.tarif}"><input aria-label="Estimasi tiba minimal (hari)" type="number" min="0" max="60" placeholder="Min hari" value="${k.est_min || ""}"><input aria-label="Estimasi tiba maksimal (hari)" type="number" min="0" max="60" placeholder="Maks hari" value="${k.est_max || ""}"><label class="chk" style="margin:0"><input type="checkbox" ${k.aktif ? "checked" : ""}> Aktif</label><label class="chk" style="margin:0"><input type="checkbox" ${k.cod ? "checked" : ""}> COD</label><button type="button" class="btn sm ghost" data-rm>Hapus</button></div>`;
}
function vCouriers(pane) {
  return call("adminListCouriers").then(list => {
    pane.innerHTML = `<div class="card"><h2>Jasa kirim dan ongkir</h2><p class="muted">Setiap jasa kirim punya tarif sendiri yang kamu tetapkan. Tarif ini bukan hasil hitung real-time dari kurir. Pelanggan memilih jasa kirim saat checkout dan hanya jasa kirim yang aktif yang tampil.</p>
      <div id="clist">${list.map(crow).join("")}</div><button type="button" class="btn sm ghost" id="addC">Tambah jasa kirim</button>
      <div id="cMsg" style="margin:12px 0"></div><button class="btn" id="cSave" data-loading="Menyimpan...">Simpan jasa kirim</button></div>`;
    $("#addC").onclick = () => $("#clist").insertAdjacentHTML("beforeend", crow());
    $("#clist").onclick = e => { if (e.target.dataset.rm !== undefined) e.target.closest(".crow").remove(); };
    $("#cSave").onclick = () => {
      const l = [...document.querySelectorAll("#clist .crow")].map(r => { const i = r.querySelectorAll("input"); return { kurir_id: r.dataset.id, nama: i[0].value.trim(), tarif: Number(i[1].value), est_min: Number(i[2].value) || 0, est_max: Number(i[3].value) || 0, aktif: i[4].checked, cod: i[5].checked }; });
      API.busy($("#cSave"), () => call("adminSaveCouriers", { list: l })).then(r => { if (r) { $("#cMsg").innerHTML = notice("Jasa kirim tersimpan.", "ok"); toast("Jasa kirim tersimpan.", "ok"); } })
        .catch(e => { $("#cMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Iklan (gambar, video, info, mengambang) ---------- */
function arow(a, prods) {
  a = a || { ad_id: "", judul: "", teks: "", gambar: "", video: "", tipe: "gambar", tautan: "#/produk", tombol: "Lihat Produk", aktif: true };
  const tp = (v, l) => `<option value="${v}" ${a.tipe === v ? "selected" : ""}>${l}</option>`;
  const dests = [["#/produk", "Semua produk"], ["#/produk?kat=Wanita", "Kategori Wanita"], ["#/produk?kat=Pria", "Kategori Pria"], ["#/produk?kat=Aksesori", "Kategori Aksesori"]]
    .concat((prods || []).map(p => ["#/produk/" + p.product_id, "Produk: " + p.nama])).concat([["#/faq", "Halaman Bantuan"], ["#/lacak", "Halaman Lacak Pesanan"]]);
  const known = dests.some(d => d[0] === a.tautan);
  return `<div class="card arow" data-id="${esc(a.ad_id)}" style="margin-bottom:12px"><div class="row two">
    <div class="field"><label>Jenis iklan</label><select>${tp("gambar", "Gambar")}${tp("video", "Video")}${tp("info", "Info teks (tanpa gambar)")}${tp("mengambang", "Mengambang (kecil, di pojok layar, bisa ditutup)")}</select></div>
    <div class="field"><label>Judul iklan</label><input maxlength="60" value="${esc(a.judul)}"></div>
    <div class="field"><label>Teks singkat</label><input maxlength="140" value="${esc(a.teks)}"></div>
    <div class="field"><label>Teks tombol (boleh kosong)</label><input maxlength="20" value="${esc(a.tombol)}"></div>
    <div class="field"><label>Tujuan saat iklan diketuk</label><select class="dest">${dests.map(d => `<option value="${esc(d[0])}" ${a.tautan === d[0] ? "selected" : ""}>${esc(d[1])}</option>`).join("")}<option value="__manual" ${known ? "" : "selected"}>Lainnya (isi manual atau https://...)</option></select>
      <input maxlength="300" style="margin-top:6px" aria-label="Tautan" value="${esc(a.tautan)}" ${known ? "readonly" : ""}></div>
    <div class="field"><label>Gambar (https, Google Drive, atau assets/...)</label><input maxlength="500" value="${esc(a.gambar)}"></div></div>
    <div class="field"><label>Video, untuk jenis Video (YouTube, Google Drive, atau file .mp4 berupa https/assets)</label><input maxlength="500" value="${esc(a.video)}"></div>
    <div class="row two"><div class="field"><label>Judul (English, kosongkan untuk terjemahan otomatis)</label><input maxlength="80" value="${esc(a.judul_en || "")}"></div><div class="field"><label>Teks singkat (English)</label><input maxlength="160" value="${esc(a.teks_en || "")}"></div><div class="field"><label>Teks tombol (English)</label><input maxlength="30" value="${esc(a.tombol_en || "")}"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><label class="chk" style="margin:0"><input type="checkbox" ${a.aktif ? "checked" : ""}> Tampilkan di beranda</label><button type="button" class="btn sm ghost" data-rm>Hapus iklan</button></div></div>`;
}
function vAds(pane) {
  return Promise.all([call("adminListAds"), call("adminListProducts")]).then(res => {
    const list = res[0], prods = res[1];
    pane.innerHTML = `<div><h2>Iklan di beranda</h2><p class="muted">Iklan tampil di beranda dengan label "Iklan". Maksimal 6. Banner <b>GRATIS ONGKIR</b> muncul otomatis dari pengaturan toko (kolom Gratis ongkir mulai belanja), jadi tidak perlu dibuat di sini. Pilih tujuan iklan dari daftar agar tautan produk selalu benar.</p>
      <div id="alist">${list.map(a => arow(a, prods)).join("")}</div><button type="button" class="btn sm ghost" id="addA">Tambah iklan</button>
      <div id="aMsg" style="margin:12px 0"></div><button class="btn" id="aSave" data-loading="Menyimpan...">Simpan iklan</button></div>`;
    $("#addA").onclick = () => { if (document.querySelectorAll("#alist .arow").length >= 6) return toast("Maksimal 6 iklan.", "error"); $("#alist").insertAdjacentHTML("beforeend", arow(null, prods)); };
    $("#alist").onclick = e => { if (e.target.dataset.rm !== undefined && confirm("Hapus iklan ini? Perubahan baru tersimpan setelah menekan Simpan iklan.")) e.target.closest(".arow").remove(); };
    $("#alist").onchange = e => {
      const sel = e.target.closest(".dest"); if (!sel) return;
      const inp = sel.closest(".field").querySelector("input");
      if (sel.value === "__manual") { inp.readOnly = false; inp.focus(); } else { inp.value = sel.value; inp.readOnly = true; }
    };
    $("#aSave").onclick = () => {
      const l = [...document.querySelectorAll("#alist .arow")].map(r => { const i = r.querySelectorAll("input"); return { ad_id: r.dataset.id, tipe: r.querySelector("select").value, judul: i[0].value.trim(), teks: i[1].value.trim(), tombol: i[2].value.trim(), tautan: i[3].value.trim(), gambar: i[4].value.trim(), video: i[5].value.trim(), judul_en: i[6].value.trim(), teks_en: i[7].value.trim(), tombol_en: i[8].value.trim(), aktif: i[9].checked }; });
      API.busy($("#aSave"), () => call("adminSaveAds", { list: l })).then(r => { if (r) { $("#aMsg").innerHTML = notice("Iklan tersimpan.", "ok"); toast("Iklan tersimpan.", "ok"); } })
        .catch(e => { $("#aMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Laporan: grafik harian, bulanan, dan perkiraan ---------- */
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtBulan = ym => BLN[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(0, 4);
const niceMax = m => { const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const SERIES = [["v", "Pengunjung"], ["c", "Memasukkan ke keranjang"], ["p", "Pesanan dibuat"]];
function chartFrame(W, H, pl, pt, pb, nice, body, summary) {
  let g = ""; for (let i = 0; i <= 4; i++) { const v = nice / 4 * i, y = pt + (H - pt - pb) * (1 - v / nice); g += `<line class="gridl" x1="${pl}" x2="${W - 8}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">${g}${body}</svg>`;
}
function lineChart(labels, data) { // data: {v:[], c:[], p:[]}
  const W = 760, H = 270, pl = 38, pr = 12, pt = 12, pb = 30, max = Math.max(1, ...Object.values(data).flat()), nice = niceMax(max);
  const x = i => pl + (labels.length < 2 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (labels.length - 1)), y = v => pt + (H - pt - pb) * (1 - v / nice);
  const step = labels.length > 16 ? 3 : 1;
  let body = labels.map((l, i) => (i % step === 0 || i === labels.length - 1) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(l)}</text>` : "").join("");
  SERIES.forEach(([k, name]) => {
    body += `<polyline class="ln l-${k}" points="${data[k].map((v, i) => x(i) + "," + y(v)).join(" ")}"/>`;
    body += data[k].map((v, i) => `<circle class="c-${k}" cx="${x(i)}" cy="${y(v)}" r="3"><title>${esc(name)}, tanggal ${esc(labels[i])}: ${v}</title></circle>`).join("");
  });
  return chartFrame(W, H, pl, pt, pb, nice, body, "Grafik garis harian pengunjung, keranjang, dan pesanan");
}
function barChart(labels, data) {
  const W = 760, H = 270, pl = 38, pr = 8, pt = 12, pb = 30, max = Math.max(1, ...Object.values(data).flat()), nice = niceMax(max);
  const gw = (W - pl - pr) / labels.length, bw = Math.min(26, (gw - 14) / 3);
  let body = "";
  labels.forEach((l, i) => {
    const x0 = pl + i * gw + (gw - bw * 3) / 2;
    body += `<text x="${pl + i * gw + gw / 2}" y="${H - 10}" text-anchor="middle">${esc(l)}</text>`;
    SERIES.forEach(([k, name], j) => { const v = data[k][i], h = (H - pt - pb) * v / nice; body += `<rect class="c-${k}" x="${x0 + j * bw}" y="${H - pb - h}" width="${bw - 2}" height="${h}" rx="3"><title>${esc(name)}, ${esc(l)}: ${v}</title></rect>`; });
  });
  return chartFrame(W, H, pl, pt, pb, nice, body, "Grafik batang perbandingan 6 bulan terakhir");
}
const legend = () => `<div class="legend">${SERIES.map(([k, n]) => `<span><i class="c-${k}"></i>${n}</span>`).join("")}</div>`;
function vReport(pane) {
  return call("adminCharts", vReport.month ? { month: vReport.month } : {}).then(r => {
    const sel = r.bulanan.find(m => m.bulan === r.bulan), idx = r.bulanan.indexOf(sel), prev = idx > 0 ? r.bulanan[idx - 1] : null;
    const diff = (a, b) => (b === null || b === undefined || !b) ? "" : `<span class="muted"> ${a >= b ? "naik" : "turun"} ${Math.abs(Math.round((a - b) / b * 100))}% dari ${fmtBulan(prev.bulan)}</span>`;
    const stat = (label, v, d) => `<div class="card stat"><span class="muted">${label}</span><b>${v}</b>${d || ""}</div>`;
    const days = r.harian.map(h => Number(h.tanggal.slice(8, 10)) + "");
    const pj = r.proyeksi;
    pane.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:14px"><h2 style="margin:0">Laporan</h2><div style="min-width:220px"><label for="rm">Bulan</label><select id="rm">${r.bulanan.slice().reverse().map(m => `<option value="${m.bulan}" ${m.bulan === r.bulan ? "selected" : ""}>${fmtBulan(m.bulan)}${m.bulan === r.bulan_ini ? " (bulan ini)" : ""}</option>`).join("")}</select></div></div>
      <div class="stats">${stat("Pengunjung", sel.pengunjung, diff(sel.pengunjung, prev && prev.pengunjung))}${stat("Memasukkan ke keranjang", sel.keranjang, diff(sel.keranjang, prev && prev.keranjang))}${stat("Pesanan dibuat", sel.pesanan, diff(sel.pesanan, prev && prev.pesanan))}${stat("Omzet terbayar", rp(sel.omzet), "")}</div>
      <div class="card" style="margin-bottom:16px"><h3>Per hari dalam ${fmtBulan(r.bulan)}</h3>${legend()}${lineChart(days, { v: r.harian.map(h => h.pengunjung), c: r.harian.map(h => h.keranjang), p: r.harian.map(h => h.pesanan) })}
        <details style="margin-top:8px"><summary><b>Lihat tabel harian</b></summary><div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Pengunjung</th><th>Keranjang</th><th>Pesanan</th></tr></thead><tbody>${r.harian.map(h => `<tr><td>${esc(h.tanggal)}</td><td>${h.pengunjung}</td><td>${h.keranjang}</td><td>${h.pesanan}</td></tr>`).join("")}</tbody></table></div></details></div>
      <div class="card" style="margin-bottom:16px"><h3>Perbandingan 6 bulan terakhir</h3>${legend()}${barChart(r.bulanan.map(m => fmtBulan(m.bulan).slice(0, 3) + " " + m.bulan.slice(2, 4)), { v: r.bulanan.map(m => m.pengunjung), c: r.bulanan.map(m => m.keranjang), p: r.bulanan.map(m => m.pesanan) })}</div>
      ${pj ? `<div class="card" style="margin-bottom:16px"><h3>Perkiraan akhir ${fmtBulan(r.bulan_ini)}</h3><p style="margin:0">Berdasarkan rata-rata ${pj.hari_berjalan} hari berjalan dari ${pj.hari_total} hari: sekitar <b>${pj.pengunjung} pengunjung</b>, <b>${pj.keranjang} yang memasukkan ke keranjang</b>, dan <b>${pj.pesanan} pesanan</b>.</p><p class="muted" style="margin:8px 0 0">Ini perkiraan sederhana (rata-rata harian dikalikan jumlah hari), bukan jaminan. Jumlah pengunjung bulan depan tidak dapat dihitung sebelum bulannya berjalan.</p></div>` : ""}
      <p class="muted">Pengunjung dihitung per browser/perangkat (ID acak tanpa data pribadi), kira-kira satu kali per hari per perangkat, bukan jumlah orang yang pasti. Pesanan dan omzet berasal dari sheet Pesanan (tanpa pesanan dibatalkan). Statistik terisi sejak versi ini dipasang.</p>`;
    $("#rm").onchange = e => { vReport.month = e.target.value; render(); };
  });
}

/* ---------- After sales & retur ---------- */
const HASIL = ["Produk sesuai", "Ada masalah", "Tidak merespons"], STATUS_RETUR = ["Diajukan", "Disetujui", "Ditolak", "Selesai"];
const waLink = (num, text) => "https://wa.me/" + String(num).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
function vAfterSales(pane) {
  return call("adminAfterSales").then(d => {
    const msg = a => `Halo ${a.nama}, ini Cacutie Style. Pesanan ${a.kode} sudah sampai ya? Apakah produknya sesuai dengan yang dipesan? Kalau ada masalah (ukuran, kondisi barang, atau lainnya), kabari kami di sini ya. Terima kasih sudah berbelanja!`;
    pane.innerHTML = `<h2>After Sales</h2><p class="muted">Setelah paket sampai, hubungi pembeli lewat WhatsApp untuk menanyakan apakah produk sesuai dan ada masalah atau tidak. Tombol <b>Chat WhatsApp</b> membuka WhatsApp dengan pesan yang sudah terisi, lalu kamu menekan kirim sendiri (pesan tidak terkirim otomatis). Setelah itu catat hasilnya agar pesanan keluar dari antrean.</p>
      <div class="card" style="margin-bottom:16px"><h3>Perlu follow-up (${d.antrean.length})</h3>${d.antrean.length ? `<div class="tablewrap"><table><thead><tr><th>Pesanan</th><th>Pembeli</th><th>Status</th><th>Sejak</th><th></th></tr></thead><tbody>${d.antrean.map(a => `<tr><td>${esc(a.kode)}</td><td>${esc(a.nama)}</td><td><span class="pill">${esc(a.status)}</span></td><td>${a.hari} hari</td><td style="white-space:nowrap"><a class="btn sm" target="_blank" rel="noopener" href="${waLink(a.whatsapp, msg(a))}">Chat WhatsApp</a> <button class="btn sm ghost" data-as="${esc(a.order_id)}" data-k="${esc(a.kode)}">Catat hasil</button></td></tr>`).join("")}</tbody></table></div>` : "<p class='muted'>Tidak ada pesanan yang menunggu follow-up.</p>"}</div>
      <div class="card" style="margin-bottom:16px"><h3>Permintaan retur (${d.retur.filter(r => r.status === "Diajukan").length} baru)</h3>${d.retur.length ? d.retur.map(r => `<div class="card" style="margin-bottom:10px;background:var(--cream)" data-rid="${esc(r.retur_id)}"><b>${esc(r.kode)}</b> - ${esc(r.nama)} - ${esc(r.produk)}<br><span class="muted">Alasan: ${esc(r.alasan)}${r.catatan ? " - " + esc(r.catatan) : ""} (${esc(r.dibuat)})</span>
        <div class="row two" style="margin-top:8px"><div class="field"><label>Status</label><select>${STATUS_RETUR.map(x => `<option ${x === r.status ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>Catatan untuk pembeli</label><input maxlength="500" value="${esc(r.catatan_admin)}"></div></div>
        <button class="btn sm" data-rsave="1">Simpan</button> <a class="btn sm ghost" target="_blank" rel="noopener" href="${waLink(r.whatsapp, "Halo " + r.nama + ", ini Cacutie Style. Terkait pengajuan retur pesanan " + r.kode + " (" + r.produk + ")...")}">Chat WhatsApp</a></div>`).join("") : "<p class='muted'>Belum ada permintaan retur.</p>"}</div>
      <div class="card"><h3>Riwayat follow-up</h3>${d.riwayat.length ? `<div class="tablewrap"><table><thead><tr><th>Pesanan</th><th>Pembeli</th><th>Hasil</th><th>Catatan</th><th>Dicatat</th></tr></thead><tbody>${d.riwayat.map(h => `<tr><td>${esc(h.kode)}</td><td>${esc(h.nama)}</td><td><span class="pill">${esc(h.hasil)}</span></td><td>${esc(h.catatan)}</td><td>${esc(h.dibuat)}</td></tr>`).join("")}</tbody></table></div>` : "<p class='muted'>Belum ada riwayat.</p>"}</div>`;
    pane.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.as) {
        modal(`<h2>Catat hasil follow-up ${esc(b.dataset.k)}</h2><div class="field"><label for="asHasil">Hasil</label><select id="asHasil">${HASIL.map(h => `<option>${h}</option>`).join("")}</select></div>
          <div class="field"><label for="asCat">Catatan</label><textarea id="asCat" maxlength="500" placeholder="Contoh: pembeli puas, atau ukuran kekecilan dan minta tukar"></textarea></div>
          <div id="asMsg"></div><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" data-close>Batal</button><button class="btn" id="asSave" data-loading="Menyimpan...">Simpan</button></div>`);
        $("#asSave").onclick = () => API.busy($("#asSave"), () => call("adminAfterSalesSave", { order_id: b.dataset.as, hasil: $("#asHasil").value, catatan: $("#asCat").value }))
          .then(r => { if (r) { dlg.close(); toast("Hasil follow-up tersimpan.", "ok"); render(); } }).catch(er => { $("#asMsg").innerHTML = notice(er.message, "error"); });
      } else if (b.dataset.rsave) {
        const box = b.closest("[data-rid]");
        API.busy(b, () => call("adminReturUpdate", { retur_id: box.dataset.rid, status: box.querySelector("select").value, catatan_admin: box.querySelector("input").value }))
          .then(r => { if (r) toast("Status retur tersimpan.", "ok"); }).catch(er => toast(er.message, "error"));
      }
    };
  });
}

/* ---------- Rekening bank (pilihan bank saat transfer) ---------- */
function brow(b) {
  b = b || { bank_id: "", nama: "", no_rekening: "", atas_nama: "", aktif: false };
  return `<div class="brow crow" data-id="${esc(b.bank_id)}" style="grid-template-columns:1fr 1.3fr 1.3fr auto auto"><input list="bankNames" aria-label="Nama bank" placeholder="Nama bank" maxlength="30" value="${esc(b.nama)}"><input aria-label="Nomor rekening" inputmode="numeric" placeholder="Nomor rekening" maxlength="30" value="${esc(b.no_rekening)}"><input aria-label="Atas nama" placeholder="Atas nama" maxlength="60" value="${esc(b.atas_nama)}"><label class="chk" style="margin:0"><input type="checkbox" ${b.aktif ? "checked" : ""}> Aktif</label><button type="button" class="btn sm ghost" data-rm>Hapus</button></div>`;
}
function bankCard(pane) {
  call("adminListBanks").then(list => {
    pane.insertAdjacentHTML("beforeend", `<div class="card" style="margin-top:18px"><h2>Rekening bank untuk transfer</h2><p class="muted">Saat pelanggan memilih Transfer Bank, mereka memilih salah satu bank aktif di bawah. Isi nomor rekening dan atas nama <b>sebelum</b> mengaktifkan. Selama belum ada bank aktif, pelanggan melihat teks "Info transfer cadangan" di atas. Nomor rekening hanya tampil kepada pembeli setelah pesanan dibuat.</p>
      <datalist id="bankNames"><option value="BCA"><option value="BRI"><option value="BNI"><option value="Mandiri"><option value="BSI"><option value="CIMB Niaga"><option value="Permata"><option value="Jago"><option value="SeaBank"></datalist>
      <div id="blist">${list.map(brow).join("")}</div><button type="button" class="btn sm ghost" id="addB">Tambah bank</button><div id="bMsg" style="margin:12px 0"></div><button class="btn" id="bSave" data-loading="Menyimpan...">Simpan rekening bank</button></div>`);
    $("#addB").onclick = () => { if (document.querySelectorAll("#blist .brow").length >= 8) return toast("Maksimal 8 bank.", "error"); $("#blist").insertAdjacentHTML("beforeend", brow()); };
    $("#blist").onclick = e => { if (e.target.dataset.rm !== undefined) e.target.closest(".brow").remove(); };
    $("#bSave").onclick = () => {
      const l = [...document.querySelectorAll("#blist .brow")].map(r => { const i = r.querySelectorAll("input"); return { bank_id: r.dataset.id, nama: i[0].value.trim(), no_rekening: i[1].value.trim(), atas_nama: i[2].value.trim(), aktif: i[3].checked }; });
      API.busy($("#bSave"), () => call("adminSaveBanks", { list: l })).then(r => { if (r) { $("#bMsg").innerHTML = notice("Rekening bank tersimpan.", "ok"); toast("Rekening bank tersimpan.", "ok"); } })
        .catch(e => { $("#bMsg").innerHTML = notice(e.message, "error"); });
    };
  }).catch(() => {});
}

/* ---------- Mulai (dipanggil app.js saat mode admin dipilih) ---------- */
window.CSAdmin = { start() { if (ADM.has()) { loading(); call("adminSession").then(showApp).catch(() => {}); } else showLogin(); } };
})();
