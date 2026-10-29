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
  const tabs = [["ringkasan", "Ringkasan"], ["produk", "Produk"], ["pesanan", "Pesanan"], ["ulasan", "Ulasan"], ["pengaturan", "Pengaturan toko"]];
  root.innerHTML = `<div class="admin-tabs" role="tablist" aria-label="Menu admin">${tabs.map(t => `<button role="tab" data-t="${t[0]}" aria-selected="${tab === t[0]}">${t[1]}</button>`).join("")}</div><div id="pane"></div>`;
  $(".admin-tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; $$tabs(); render(); };
  render();
}
function $$tabs() { document.querySelectorAll(".admin-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.t === tab)); }
function render() {
  const pane = $("#pane"); pane.innerHTML = '<div class="loading"><div class="spin"></div>Memuat...</div>';
  ({ ringkasan: vSummary, produk: vProducts, pesanan: vOrders, ulasan: vReviews, pengaturan: vSettings })[tab](pane)
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
      <div class="card stat"><span class="muted">Penjualan terbayar</span><b>${rp(d.penjualan_terbayar)}</b></div></div>
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
    <div class="field"><label for="pImg">Tautan gambar (https, boleh kosong)</label><input id="pImg" value="${esc(x.gambar)}" placeholder="https://..."></div></div>
    <div class="field"><label for="pDesc">Deskripsi</label><textarea id="pDesc" maxlength="600">${esc(x.deskripsi)}</textarea></div>
    <label class="chk"><input type="checkbox" id="pShow" ${x.tampil ? "checked" : ""}> Tampilkan di toko</label>
    <h3>Varian dan stok</h3><p class="muted">Isi minimal satu varian aktif. Varian yang dihapus hanya dinonaktifkan agar riwayat pesanan tetap utuh.</p>
    <div id="vlist">${(x.varian.length ? x.varian : [null]).map(vrow).join("")}</div><button type="button" class="btn sm ghost" id="addV">Tambah varian</button>
    <div id="pMsg" style="margin-top:12px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-close>Batal</button><button class="btn" id="pSave" data-loading="Menyimpan...">Simpan</button></div>`);
  $("#addV").onclick = () => $("#vlist").insertAdjacentHTML("beforeend", vrow());
  $("#vlist").onclick = e => { if (e.target.dataset.rm !== undefined) e.target.closest(".vrow").remove(); };
  $("#pSave").onclick = () => {
    const varian = [...document.querySelectorAll("#vlist .vrow")].map(r => { const i = r.querySelectorAll("input"); return { variant_id: r.dataset.vid, warna: i[0].value.trim(), ukuran: i[1].value.trim(), stok: Number(i[2].value), aktif: i[3].checked }; });
    const data = { product_id: x.product_id, sku: $("#pSku").value, nama: $("#pNama").value, kategori: $("#pKat").value, harga: Number($("#pHarga").value), label: $("#pLabel").value, gambar: $("#pImg").value, deskripsi: $("#pDesc").value, tampil: $("#pShow").checked, varian };
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
    pane.innerHTML = `<h2>Ulasan</h2>${list.length ? list.map(r => `<div class="card" style="margin-bottom:10px"><b>${esc(r.nama)}</b> untuk ${esc(r.produk)} - ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} <span class="pill">${esc(r.status)}</span>
      <p style="margin:6px 0">${esc(r.komentar)}</p><span class="muted">${esc(r.dibuat)}</span><div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm" data-r="${esc(r.review_id)}" data-s="Disetujui">Setujui</button><button class="btn sm ghost" data-r="${esc(r.review_id)}" data-s="Ditolak">Tolak</button></div></div>`).join("") : "<div class='card'><p class='muted'>Belum ada ulasan.</p></div>"}`;
    pane.onclick = e => { const b = e.target.closest("button[data-r]"); if (!b) return;
      if (!confirm((b.dataset.s === "Disetujui" ? "Setujui" : "Tolak") + " ulasan ini?")) return;
      call("adminModerate", { review_id: b.dataset.r, status: b.dataset.s }).then(() => { toast("Ulasan diperbarui.", "ok"); render(); }).catch(er => toast(er.message, "error")); };
  });
}

/* ---------- Pengaturan toko ---------- */
function vSettings(pane) {
  const F = [["nama_toko", "Nama toko"], ["slogan", "Slogan"], ["whatsapp_toko", "Nomor WhatsApp toko (contoh 081234567890)"], ["email_toko", "Email toko"], ["alamat_toko", "Alamat toko"], ["jam_operasional", "Jam operasional"],
    ["info_pengiriman", "Informasi pengiriman"], ["ongkir_flat", "Ongkir flat (Rp)"], ["gratis_ongkir_min", "Gratis ongkir mulai belanja (Rp, 0 = tidak ada)"], ["info_transfer", "Info pembayaran manual (rekening, atas nama)"]];
  return call("adminGetSettings").then(s => {
    pane.innerHTML = `<div class="card" style="max-width:680px"><h2>Pengaturan toko</h2><p class="muted">Ongkir memakai tarif flat buatan admin, bukan tarif kurir real-time.</p>
      ${F.map(f => `<div class="field"><label for="s_${f[0]}">${f[1]}</label><input id="s_${f[0]}" value="${esc(s[f[0]] || "")}" maxlength="400"></div>`).join("")}
      <div id="sMsg"></div><button class="btn" id="sSave" data-loading="Menyimpan...">Simpan pengaturan</button></div>`;
    $("#sSave").onclick = () => {
      const d = {}; F.forEach(f => { d[f[0]] = $("#s_" + f[0]).value; });
      API.busy($("#sSave"), () => call("adminSaveSettings", d)).then(r => { if (r) { $("#sMsg").innerHTML = notice("Pengaturan tersimpan.", "ok"); toast("Pengaturan tersimpan.", "ok"); } })
        .catch(e => { $("#sMsg").innerHTML = notice(e.message, "error"); });
    };
  });
}

/* ---------- Mulai ---------- */
if (ADM.has()) { loading(); call("adminSession").then(showApp).catch(() => {}); } else showLogin();
})();
