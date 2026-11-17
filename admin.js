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
    <div class="field"><label for="key">Kunci admin</label><input id="key" type="password" autocomplete="current-password"></div>
    <div id="lmsg"></div><button class="btn" id="login" data-loading="Memeriksa...">Masuk</button></div></section>`;
  const go = () => {
    const k = $("#key").value; if (!k) return $("#lmsg").innerHTML = notice("Isi kunci admin terlebih dahulu.", "error");
    API.busy($("#login"), () => ADM.login(k)).then(r => { if (r) showApp(); }).catch(e => { $("#lmsg").innerHTML = notice(e.message, "error"); });
  };
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
      <p><b>${esc(o.nama)}</b> - +${esc(o.whatsapp)}<br>${esc(o.alamat)}, ${esc(o.kota)}${o.catatan ? "<br>Catatan: " + esc(o.catatan) : ""}<br><span class="muted">${esc(o.pengiriman)} - ${esc(o.metode_bayar)}</span></p>
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
    ["info_pengiriman", "Informasi pengiriman"], ["gratis_ongkir_min", "Gratis ongkir mulai belanja (Rp, isi 0 jika tidak ada promo)"], ["info_transfer", "Info pembayaran manual (rekening, atas nama)"], ["cod_maks", "Batas total pesanan untuk COD (Rp, isi 0 jika tanpa batas)"], ["retur_hari", "Batas hari pengajuan retur setelah pesanan selesai"], ["info_retur", "Langkah cara retur (satu langkah per baris; kosongkan untuk memakai teks bawaan)"], ["info_retur_en", "Cara retur dalam English (kosongkan untuk terjemahan otomatis)"], ["qris_gambar", "Gambar QRIS (contoh assets/qris.png, tautan https, atau tautan Google Drive)"]];
  return call("adminGetSettings").then(s => {
    pane.innerHTML = `<div class="card" style="max-width:680px"><h2>Pengaturan toko</h2><p class="muted">Tarif ongkir per jasa kirim diatur di tab Jasa kirim. Untuk QRIS: unggah gambar QRIS ke folder assets di GitHub (misalnya assets/qris.png), lalu isi kolom Gambar QRIS dengan assets/qris.png. Selama kolom itu kosong, QRIS tidak bisa dipilih pelanggan.</p>
      ${F.map(f => (f[0] === "info_retur" || f[0] === "info_retur_en") ? `<div class="field"><label for="s_${f[0]}">${f[1]}</label><textarea id="s_${f[0]}" maxlength="1500">${esc(s[f[0]] || "")}</textarea></div>` : `<div class="field"><label for="s_${f[0]}">${f[1]}</label><input id="s_${f[0]}" value="${esc(s[f[0]] || "")}" maxlength="400"></div>`).join("")}
      <div id="sMsg"></div><button class="btn" id="sSave" data-loading="Menyimpan...">Simpan pengaturan</button></div>`;
    $("#sSave").onclick = () => {
      const d = {}; F.forEach(f => { d[f[0]] = $("#s_" + f[0]).value; });
      API.busy($("#sSave"), () => call("adminSaveSettings", d)).then(r => { if (r) { $("#sMsg").innerHTML = notice("Pengaturan tersimpan.", "ok"); toast("Pengaturan tersimpan.", "ok"); } })
        .catch(e => { $("#sMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Jasa kirim ---------- */
function crow(k) {
  k = k || { kurir_id: "", nama: "", tarif: 0, estimasi: "", aktif: true, cod: true };
  return `<div class="crow" data-id="${esc(k.kurir_id)}"><input aria-label="Nama jasa kirim" placeholder="Nama (JNE, J&T, ...)" maxlength="30" value="${esc(k.nama)}"><input aria-label="Tarif ongkir (Rp)" type="number" min="0" placeholder="Tarif (Rp)" value="${k.tarif}"><input aria-label="Estimasi tiba" placeholder="Estimasi (opsional)" maxlength="30" value="${esc(k.estimasi)}"><label class="chk" style="margin:0"><input type="checkbox" ${k.aktif ? "checked" : ""}> Aktif</label><label class="chk" style="margin:0"><input type="checkbox" ${k.cod ? "checked" : ""}> COD</label><button type="button" class="btn sm ghost" data-rm>Hapus</button></div>`;
}
function vCouriers(pane) {
  return call("adminListCouriers").then(list => {
    pane.innerHTML = `<div class="card" style="max-width:860px"><h2>Jasa kirim dan ongkir</h2><p class="muted">Setiap jasa kirim punya tarif sendiri yang kamu tetapkan. Tarif ini bukan hasil hitung real-time dari kurir. Pelanggan memilih jasa kirim saat checkout dan hanya jasa kirim yang aktif yang tampil.</p>
      <div id="clist">${list.map(crow).join("")}</div><button type="button" class="btn sm ghost" id="addC">Tambah jasa kirim</button>
      <div id="cMsg" style="margin:12px 0"></div><button class="btn" id="cSave" data-loading="Menyimpan...">Simpan jasa kirim</button></div>`;
    $("#addC").onclick = () => $("#clist").insertAdjacentHTML("beforeend", crow());
    $("#clist").onclick = e => { if (e.target.dataset.rm !== undefined) e.target.closest(".crow").remove(); };
    $("#cSave").onclick = () => {
      const l = [...document.querySelectorAll("#clist .crow")].map(r => { const i = r.querySelectorAll("input"); return { kurir_id: r.dataset.id, nama: i[0].value.trim(), tarif: Number(i[1].value), estimasi: i[2].value.trim(), aktif: i[3].checked, cod: i[4].checked }; });
      API.busy($("#cSave"), () => call("adminSaveCouriers", { list: l })).then(r => { if (r) { $("#cMsg").innerHTML = notice("Jasa kirim tersimpan.", "ok"); toast("Jasa kirim tersimpan.", "ok"); } })
        .catch(e => { $("#cMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Iklan (gambar, video, info) ---------- */
function arow(a) {
  a = a || { ad_id: "", judul: "", teks: "", gambar: "", video: "", tipe: "gambar", tautan: "#/produk", tombol: "Lihat Produk", aktif: true };
  const tp = (v, l) => `<option value="${v}" ${a.tipe === v ? "selected" : ""}>${l}</option>`;
  return `<div class="card arow" data-id="${esc(a.ad_id)}" style="margin-bottom:12px"><div class="row two">
    <div class="field"><label>Jenis iklan</label><select>${tp("gambar", "Gambar")}${tp("video", "Video")}${tp("info", "Info teks (tanpa gambar)")}${tp("mengambang", "Mengambang (kecil, di pojok layar, bisa ditutup)")}</select></div>
    <div class="field"><label>Judul iklan</label><input maxlength="60" value="${esc(a.judul)}"></div>
    <div class="field"><label>Teks singkat</label><input maxlength="140" value="${esc(a.teks)}"></div>
    <div class="field"><label>Teks tombol (boleh kosong)</label><input maxlength="20" value="${esc(a.tombol)}"></div>
    <div class="field"><label>Tautan (#/produk, #/produk/P02, atau https://...)</label><input maxlength="300" value="${esc(a.tautan)}"></div>
    <div class="field"><label>Gambar (https, Google Drive, atau assets/...)</label><input maxlength="500" value="${esc(a.gambar)}"></div></div>
    <div class="field"><label>Video, untuk jenis Video (YouTube, Google Drive, atau file .mp4 berupa https/assets)</label><input maxlength="500" value="${esc(a.video)}"></div>
    <div class="row two"><div class="field"><label>Judul (English, kosongkan untuk terjemahan otomatis)</label><input maxlength="80" value="${esc(a.judul_en || "")}"></div><div class="field"><label>Teks singkat (English)</label><input maxlength="160" value="${esc(a.teks_en || "")}"></div><div class="field"><label>Teks tombol (English)</label><input maxlength="30" value="${esc(a.tombol_en || "")}"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><label class="chk" style="margin:0"><input type="checkbox" ${a.aktif ? "checked" : ""}> Tampilkan di beranda</label><button type="button" class="btn sm ghost" data-rm>Hapus iklan</button></div></div>`;
}
function vAds(pane) {
  return call("adminListAds").then(list => {
    pane.innerHTML = `<div style="max-width:860px"><h2>Iklan di beranda</h2><p class="muted">Iklan tampil di beranda dengan label "Iklan". Maksimal 6. Banner <b>GRATIS ONGKIR</b> muncul otomatis dari pengaturan toko (kolom Gratis ongkir mulai belanja), jadi tidak perlu dibuat di sini.</p>
      <div id="alist">${list.map(arow).join("")}</div><button type="button" class="btn sm ghost" id="addA">Tambah iklan</button>
      <div id="aMsg" style="margin:12px 0"></div><button class="btn" id="aSave" data-loading="Menyimpan...">Simpan iklan</button></div>`;
    $("#addA").onclick = () => { if (document.querySelectorAll("#alist .arow").length >= 6) return toast("Maksimal 6 iklan.", "error"); $("#alist").insertAdjacentHTML("beforeend", arow()); };
    $("#alist").onclick = e => { if (e.target.dataset.rm !== undefined && confirm("Hapus iklan ini? Perubahan baru tersimpan setelah menekan Simpan iklan.")) e.target.closest(".arow").remove(); };
    $("#aSave").onclick = () => {
      const l = [...document.querySelectorAll("#alist .arow")].map(r => { const i = r.querySelectorAll("input"); return { ad_id: r.dataset.id, tipe: r.querySelector("select").value, judul: i[0].value.trim(), teks: i[1].value.trim(), tombol: i[2].value.trim(), tautan: i[3].value.trim(), gambar: i[4].value.trim(), video: i[5].value.trim(), judul_en: i[6].value.trim(), teks_en: i[7].value.trim(), tombol_en: i[8].value.trim(), aktif: i[9].checked }; });
      API.busy($("#aSave"), () => call("adminSaveAds", { list: l })).then(r => { if (r) { $("#aMsg").innerHTML = notice("Iklan tersimpan.", "ok"); toast("Iklan tersimpan.", "ok"); } })
        .catch(e => { $("#aMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Laporan pengunjung ---------- */
function vReport(pane) {
  const days = vReport.days || 7;
  return call("adminReport", { days }).then(r => {
    const max = Math.max(1, r.pengunjung, r.keranjang, r.pesanan), pct = v => v == null ? "-" : v + "%";
    const bar = (label, n) => `<div class="fn"><span>${label}</span><div class="fbar"><i style="width:${Math.round(n / max * 100)}%"></i></div><b>${n}</b></div>`;
    pane.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><h2 style="margin:0">Laporan</h2><div style="min-width:200px"><label for="rd">Periode</label><select id="rd"><option value="1" ${days === 1 ? "selected" : ""}>Hari ini</option><option value="7" ${days === 7 ? "selected" : ""}>7 hari terakhir</option><option value="30" ${days === 30 ? "selected" : ""}>30 hari terakhir</option></select></div></div>
      <div class="stats"><div class="card stat"><span class="muted">Pengunjung</span><b>${r.pengunjung}</b></div><div class="card stat"><span class="muted">Memasukkan ke keranjang</span><b>${r.keranjang}</b></div>
        <div class="card stat"><span class="muted">Pesanan dibuat</span><b>${r.pesanan}</b></div><div class="card stat"><span class="muted">Pesanan terbayar</span><b>${r.terbayar}</b></div><div class="card stat"><span class="muted">Omzet terbayar</span><b>${rp(r.omzet)}</b></div></div>
      <div class="card" style="margin-bottom:16px"><h3>Alur dari pengunjung sampai pembelian</h3>${bar("Pengunjung", r.pengunjung)}${bar("Masukkan keranjang", r.keranjang)}${bar("Pesanan dibuat", r.pesanan)}
        <p class="muted" style="margin:8px 0 0">Keranjang dari pengunjung: ${pct(r.konv_keranjang)}. Pesanan dari pengunjung: ${pct(r.konv_pesanan)}.</p></div>
      <div class="card tablewrap"><table><thead><tr><th>Tanggal</th><th>Pengunjung</th><th>Memasukkan keranjang</th><th>Aksi tambah keranjang</th><th>Pesanan</th><th>Terbayar</th></tr></thead><tbody>${r.harian.slice().reverse().map(h => `<tr><td>${esc(h.tanggal)}</td><td>${h.pengunjung}</td><td>${h.keranjang}</td><td>${h.aksi_keranjang}</td><td>${h.pesanan}</td><td>${h.terbayar}</td></tr>`).join("")}</tbody></table></div>
      <p class="muted" style="margin-top:12px">Catatan: pengunjung dihitung per <b>browser/perangkat</b> (ID acak di perangkat, tanpa data pribadi), bukan per orang, dan sekitar satu kali per hari per perangkat. Orang yang memblokir penyimpanan browser bisa terhitung lebih dari sekali atau tidak terhitung. Pesanan dan omzet dihitung dari sheet Pesanan (tanpa pesanan dibatalkan). Statistik baru terisi sejak versi ini dipasang.</p>`;
    $("#rd").onchange = e => { vReport.days = Number(e.target.value); render(); };
  });
}

/* ---------- After sales & retur ---------- */
const HASIL = ["Produk sesuai", "Ada masalah", "Tidak merespons"], STATUS_RETUR = ["Diajukan", "Disetujui", "Ditolak", "Selesai"];
const waLink = (num, text) => "https://wa.me/" + String(num).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
function vAfterSales(pane) {
  return call("adminAfterSales").then(d => {
    const msg = a => `Halo ${a.nama}, ini Cacutie Style. Pesanan ${a.kode} sudah sampai ya? Apakah produknya sesuai dengan yang dipesan? Kalau ada masalah (ukuran, kondisi barang, atau lainnya), kabari kami di sini ya. Terima kasih sudah berbelanja!`;
    pane.innerHTML = `<h2>After Sales</h2><p class="muted" style="max-width:760px">Setelah paket sampai, hubungi pembeli lewat WhatsApp untuk menanyakan apakah produk sesuai dan ada masalah atau tidak. Tombol <b>Chat WhatsApp</b> membuka WhatsApp dengan pesan yang sudah terisi, lalu kamu menekan kirim sendiri (pesan tidak terkirim otomatis). Setelah itu catat hasilnya agar pesanan keluar dari antrean.</p>
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

/* ---------- Mulai (dipanggil app.js saat mode admin dipilih) ---------- */
window.CSAdmin = { start() { if (ADM.has()) { loading(); call("adminSession").then(showApp).catch(() => {}); } else showLogin(); } };
})();
