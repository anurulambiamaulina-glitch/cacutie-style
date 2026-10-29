/* app.js - website pelanggan Cacutie Style (halaman tunggal dengan rute #/...)
   Semua data produk, harga, dan stok berasal dari Google Sheets lewat CSApi. */
(function () {
"use strict";
const A = window.CSApi, app = document.getElementById("app");
const S = { products: null, settings: {}, idx: {}, co: { step: 2, form: {}, metode: "Transfer Bank", key: null, done: null } };
const CART_KEY = "cs_cart_v1", ORD_KEY = "cs_orders_v1";

/* ---------- Util ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp" + Number(n || 0).toLocaleString("id-ID");
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
function toast(msg, type) {
  const el = document.createElement("div"); el.className = "toast " + (type || ""); el.textContent = msg;
  $("#toast").appendChild(el); setTimeout(() => el.remove(), type === "error" ? 6000 : 3500);
}
function show(html) { app.onclick = null; app.innerHTML = html; app.focus({ preventScroll: true }); window.scrollTo(0, 0); }
const loading = () => show('<div class="loading"><div class="spin"></div>Memuat data...</div>');
const notice = (msg, type) => `<div class="notice ${type || ""}" role="${type === "error" ? "alert" : "status"}">${esc(msg)}</div>`;

/* ---------- Keranjang (localStorage hanya menyimpan variant_id + jumlah) ---------- */
const getCart = () => { const c = load(CART_KEY, []); return Array.isArray(c) ? c.filter(x => x && typeof x.vid === "string" && x.qty > 0) : []; };
function setCart(c) { save(CART_KEY, c); S.co.key = null; S.co.done = null; updateBadge(); }
function updateBadge() { const n = getCart().reduce((a, x) => a + x.qty, 0), b = $("#cartCount"); b.textContent = n; b.hidden = !n; }
const inCart = vid => (getCart().find(x => x.vid === vid) || { qty: 0 }).qty;
function addToCart(vid, qty) {
  const c = getCart(), it = c.find(x => x.vid === vid);
  if (it) it.qty += qty; else c.push({ vid, qty });
  setCart(c);
}

/* ---------- Data ---------- */
function indexData() { S.idx = {}; S.products.forEach(p => p.varian.forEach(v => { S.idx[v.id] = { p, v }; })); }
function fillFooter() {
  const st = S.settings;
  $("#fSlogan").textContent = st.slogan || "Your Style, Your Story.";
  $("#fContact").innerHTML = [st.whatsapp_toko ? "WhatsApp: +" + esc(st.whatsapp_toko) : "", st.email_toko ? esc(st.email_toko) : "", esc(st.jam_operasional || "")].filter(Boolean).join("<br>");
}
function ensureData(force) {
  if (S.products && !force) return Promise.resolve();
  return Promise.all([A.products(), A.settings()]).then(r => { S.products = r[0]; S.settings = r[1]; indexData(); fillFooter(); });
}
function withData(fn, force) {
  loading();
  ensureData(force).then(fn).catch(err => {
    show(`<div class="empty"><h2>Data belum bisa dimuat</h2><p>${esc(err.message)}</p><button class="btn" id="retry">Coba lagi</button></div>`);
    $("#retry").onclick = () => route();
  });
}

/* ---------- Komponen ---------- */
function imgHtml(p) {
  if (p.gambar) return `<img src="${esc(p.gambar)}" alt="${esc(p.nama)}" loading="lazy" data-ph="${esc(p.nama)}">`;
  return `<div class="ph">${esc(p.nama)}</div>`;
}
document.addEventListener("error", e => { // gambar gagal dimuat -> tampilkan penanda nama produk
  const t = e.target;
  if (t && t.tagName === "IMG" && t.dataset.ph) { const d = document.createElement("div"); d.className = "ph"; d.textContent = t.dataset.ph; t.replaceWith(d); }
}, true);
function pcard(p) {
  const soldout = p.stok_total <= 0, warna = new Set(p.varian.map(v => v.warna)).size;
  return `<a class="pcard" href="#/produk/${encodeURIComponent(p.id)}" aria-label="Lihat detail ${esc(p.nama)}">
    <div class="pimg">${imgHtml(p)}${soldout ? '<span class="tag soldout">Habis</span>' : (p.label ? `<span class="tag">${esc(p.label)}</span>` : "")}</div>
    <div class="meta"><h3>${esc(p.nama)}</h3><div class="price">${rp(p.harga)}</div><div class="muted">${esc(p.kategori)} - ${warna} warna</div></div></a>`;
}
const stars = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const shipCost = sub => { const st = S.settings, f = Number(st.ongkir_flat) || 0, free = Number(st.gratis_ongkir_min) || 0; return (free > 0 && sub >= free) ? 0 : f; };

/* ---------- Router ---------- */
function parseQs(s) { const o = {}; s.split("&").forEach(p => { if (!p) return; const i = p.indexOf("="); o[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? "" : decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); }); return o; }
function route() {
  const h = location.hash.replace(/^#/, "") || "/", qi = h.indexOf("?");
  const parts = (qi < 0 ? h : h.slice(0, qi)).split("/").filter(Boolean), qs = parseQs(qi < 0 ? "" : h.slice(qi + 1));
  const name = parts[0] || "home";
  $("#nav").classList.remove("open"); $("#btnMenu").setAttribute("aria-expanded", "false");
  $$("#nav a[data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === name));
  updateBadge();
  switch (name) {
    case "home": return withData(vHome);
    case "produk": return parts[1] ? withData(() => vDetail(decodeURIComponent(parts[1]))) : withData(() => vCatalog(qs));
    case "keranjang": return withData(vCart);
    case "checkout": return withData(vCheckout, true);
    case "lacak": return withData(() => vTrack(qs.kode || ""));
    case "tentang": case "faq": case "privasi": case "pengembalian": return withData(() => vInfo(name));
    default: show(`<div class="empty"><h2>Halaman tidak ditemukan</h2><p>Alamat yang kamu buka tidak tersedia.</p><a class="btn" href="#/">Kembali ke beranda</a></div>`);
  }
}

/* ---------- Beranda ---------- */
function vHome() {
  const P = S.products, st = S.settings;
  const feat = P.filter(p => p.label === "Bestseller").concat(P.filter(p => p.label !== "Bestseller")).slice(0, 4);
  const latest = P.slice().sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))).slice(0, 4);
  const free = Number(st.gratis_ongkir_min) || 0;
  show(`
  <section class="hero"><div><h1>${esc(st.nama_toko || "Cacutie Style")}</h1>
    <p style="font-size:1.15rem">${esc(st.slogan || "Your Style, Your Story.")}<br><span class="muted">Fashion wanita, pria, dan aksesori yang manis, simpel, dan mudah dipadukan.</span></p>
    <a class="btn" href="#/produk">Belanja Sekarang</a></div>
    <div class="art" aria-hidden="true">Your Style,<br>Your Story.</div></section>
  <section class="section"><h2>Kategori</h2><div class="cats">
    <a class="cat" href="#/produk?kat=Wanita">Wanita</a><a class="cat" href="#/produk?kat=Pria">Pria</a><a class="cat" href="#/produk?kat=Aksesori">Aksesori</a></div></section>
  <section class="section"><h2>Produk unggulan</h2><div class="grid">${feat.map(pcard).join("")}</div></section>
  <section class="section"><div class="promo"><div><h2>${free > 0 ? "Gratis ongkir untuk belanja " + rp(free) + " ke atas" : "Belanja tanpa ribet"}</h2>
    <p style="margin:0">${free > 0 ? "Berlaku otomatis saat checkout." : "Checkout cukup isi data pengiriman, tanpa perlu akun."}</p></div><a class="btn" href="#/produk">Belanja Sekarang</a></div></section>
  <section class="section"><h2>Produk terbaru</h2><div class="grid">${latest.map(pcard).join("")}</div></section>
  <section class="section"><h2>Kenapa belanja di sini</h2><div class="why">
    <div class="card"><h3>Stok jelas per varian</h3><p class="muted">Setiap warna dan ukuran punya stok sendiri, jadi kamu tahu mana yang masih tersedia.</p></div>
    <div class="card"><h3>Checkout tanpa akun</h3><p class="muted">Pilih produk, isi data pengiriman, dan pesanan langsung tercatat. Tidak perlu daftar.</p></div>
    <div class="card"><h3>Pesanan bisa dilacak</h3><p class="muted">Pakai nomor pesanan dan nomor WhatsApp yang kamu isi saat checkout.</p></div></div></section>
  <section class="section card"><h2>Tentang Cacutie Style</h2><p class="muted" style="margin:0">Toko fashion online untuk anak muda dan mahasiswa. Produk di website ini adalah data contoh untuk tugas mata kuliah E-Commerce. <a href="#/tentang">Selengkapnya</a></p></section>`);
}

/* ---------- Katalog ---------- */
function vCatalog(qs) {
  const f = { q: qs.q || "", kat: qs.kat || "", urut: qs.urut || "", harga: qs.harga || "", stok: qs.stok === "1" };
  const opt = (v, t, cur) => `<option value="${v}" ${cur === v ? "selected" : ""}>${t}</option>`;
  show(`<section class="section"><h1>Semua Produk</h1><div class="filters">
    <div><label for="fq">Cari nama atau SKU</label><input id="fq" type="search" value="${esc(f.q)}" placeholder="Contoh: kaos atau CS-WM-001"></div>
    <div><label for="fkat">Kategori</label><select id="fkat">${opt("", "Semua", f.kat)}${opt("Wanita", "Wanita", f.kat)}${opt("Pria", "Pria", f.kat)}${opt("Aksesori", "Aksesori", f.kat)}</select></div>
    <div><label for="fharga">Harga</label><select id="fharga">${opt("", "Semua harga", f.harga)}${opt("0-100000", "Di bawah Rp100.000", f.harga)}${opt("100000-200000", "Rp100.000 - Rp200.000", f.harga)}${opt("200000-", "Di atas Rp200.000", f.harga)}</select></div>
    <div><label for="furut">Urutkan</label><select id="furut">${opt("", "Terbaru", f.urut)}${opt("murah", "Harga termurah", f.urut)}${opt("mahal", "Harga termahal", f.urut)}</select></div>
    <label class="chk"><input type="checkbox" id="fstok" ${f.stok ? "checked" : ""}> Hanya yang tersedia</label></div>
    <p class="muted" id="count" aria-live="polite"></p><div id="grid"></div></section>`);
  function paint() {
    f.q = $("#fq").value.trim(); f.kat = $("#fkat").value; f.harga = $("#fharga").value; f.urut = $("#furut").value; f.stok = $("#fstok").checked;
    let l = S.products.filter(p => {
      if (f.kat && p.kategori !== f.kat) return false;
      if (f.stok && p.stok_total <= 0) return false;
      if (f.q && (p.nama + " " + p.sku).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.harga) { const r = f.harga.split("-"), lo = Number(r[0]) || 0, hi = r[1] ? Number(r[1]) : Infinity; if (p.harga < lo || p.harga >= hi) return false; }
      return true;
    });
    if (f.urut === "murah") l.sort((a, b) => a.harga - b.harga); else if (f.urut === "mahal") l.sort((a, b) => b.harga - a.harga);
    else l.sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
    $("#count").textContent = l.length + " produk ditemukan";
    $("#grid").innerHTML = l.length ? `<div class="grid">${l.map(pcard).join("")}</div>` :
      `<div class="empty"><h2>Produk tidak ditemukan</h2><p>Coba kata kunci lain atau hapus beberapa filter.</p><button class="btn ghost" id="reset">Hapus semua filter</button></div>`;
    const r = $("#reset"); if (r) r.onclick = () => { $("#fq").value = ""; $("#fkat").value = ""; $("#fharga").value = ""; $("#furut").value = ""; $("#fstok").checked = false; paint(); };
    const q = []; if (f.q) q.push("q=" + encodeURIComponent(f.q)); if (f.kat) q.push("kat=" + encodeURIComponent(f.kat)); if (f.harga) q.push("harga=" + f.harga); if (f.urut) q.push("urut=" + f.urut); if (f.stok) q.push("stok=1");
    history.replaceState(null, "", "#/produk" + (q.length ? "?" + q.join("&") : ""));
  }
  ["fq", "fkat", "fharga", "furut", "fstok"].forEach(id => $("#" + id).addEventListener(id === "fq" ? "input" : "change", paint));
  paint();
}

/* ---------- Detail produk ---------- */
function vDetail(id) {
  const p = S.products.find(x => x.id === id);
  if (!p) return show(`<div class="empty"><h2>Produk tidak tersedia</h2><p>Produk ini tidak ditemukan atau sedang tidak dijual.</p><a class="btn" href="#/produk">Kembali ke katalog</a></div>`);
  const colors = [...new Set(p.varian.map(v => v.warna))], sizes = [...new Set(p.varian.map(v => v.ukuran))];
  const sel = { w: colors.length === 1 ? colors[0] : "", u: sizes.length === 1 ? sizes[0] : "", qty: 1 };
  const find = (w, u) => p.varian.find(v => v.warna === w && v.ukuran === u);
  const st = S.settings;
  show(`<section class="section"><p><a href="#/produk">&larr; Kembali ke katalog</a></p><div class="detail">
    <div class="pimg" style="border-radius:var(--r)">${imgHtml(p)}${p.label ? `<span class="tag">${esc(p.label)}</span>` : ""}</div>
    <div><h1 style="font-size:1.8rem">${esc(p.nama)}</h1><p class="muted">SKU: ${esc(p.sku)} - ${esc(p.kategori)}</p>
      <p class="price" style="font-size:1.5rem">${rp(p.harga)}</p><p>${esc(p.deskripsi)}</p><div id="opts"></div>
      <div class="notice"><b>Pengiriman:</b> ${esc(st.info_pengiriman || "Ongkir mengikuti tarif flat toko.")}<br><b>Pengembalian:</b> <a href="#/pengembalian">lihat kebijakan</a></div></div></div>
    <div class="section"><h2>Ulasan pembeli</h2><div id="rev"><div class="loading"><div class="spin"></div>Memuat ulasan...</div></div></div></section>`);
  function paint() {
    const cv = sel.w && sel.u ? find(sel.w, sel.u) : null, avail = cv ? cv.stok - inCart(cv.id) : 0;
    if (sel.qty > Math.max(avail, 1)) sel.qty = Math.max(avail, 1);
    const cOk = c => p.varian.some(v => v.warna === c && (!sel.u || v.ukuran === sel.u) && v.stok > 0);
    const uOk = u => p.varian.some(v => v.ukuran === u && (!sel.w || v.warna === sel.w) && v.stok > 0);
    const hasSize = !(sizes.length === 1 && /^(all size|-)$/i.test(sizes[0]));
    let info;
    if (!cv) info = "Pilih " + (hasSize ? "warna dan ukuran" : "warna") + " untuk melihat stok.";
    else if (cv.stok <= 0) info = "Varian ini habis. Pilih warna atau ukuran lain.";
    else info = "Stok varian ini: " + cv.stok + (inCart(cv.id) ? " (" + inCart(cv.id) + " sudah di keranjangmu)" : "");
    $("#opts").innerHTML = `<div><label>Warna</label><div class="opts">${colors.map(c => `<button class="opt" data-w="${esc(c)}" aria-pressed="${sel.w === c}" ${cOk(c) ? "" : "disabled"}>${esc(c)}</button>`).join("")}</div></div>
      ${hasSize ? `<div><label>Ukuran</label><div class="opts">${sizes.map(u => `<button class="opt" data-u="${esc(u)}" aria-pressed="${sel.u === u}" ${uOk(u) ? "" : "disabled"}>${esc(u)}</button>`).join("")}</div></div>` : ""}
      <p class="muted" aria-live="polite">${esc(info)}</p>
      <div class="qty" role="group" aria-label="Jumlah"><button data-q="-1" aria-label="Kurangi jumlah">-</button><span>${sel.qty}</span><button data-q="1" aria-label="Tambah jumlah">+</button></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0"><button class="btn" data-add="cart" ${p.stok_total <= 0 ? "disabled" : ""}>Tambah ke Keranjang</button><button class="btn ghost" data-add="buy" ${p.stok_total <= 0 ? "disabled" : ""}>Beli Sekarang</button></div>
      ${p.stok_total <= 0 ? notice("Semua varian produk ini sedang habis.", "warn") : ""}`;
  }
  $("#opts").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.w !== undefined) sel.w = sel.w === b.dataset.w && colors.length > 1 ? "" : b.dataset.w;
    else if (b.dataset.u !== undefined) sel.u = sel.u === b.dataset.u && sizes.length > 1 ? "" : b.dataset.u;
    else if (b.dataset.q) { const cv = sel.w && sel.u ? find(sel.w, sel.u) : null, max = cv ? cv.stok - inCart(cv.id) : 1; sel.qty = Math.min(Math.max(1, sel.qty + Number(b.dataset.q)), Math.max(max, 1)); if (cv && sel.qty >= max && b.dataset.q === "1") toast("Jumlah sudah mencapai stok yang tersedia.", ""); }
    else if (b.dataset.add) {
      const cv = sel.w && sel.u ? find(sel.w, sel.u) : null;
      if (!cv) return toast("Pilih " + (sizes.length > 1 ? "warna dan ukuran" : "warna") + " dulu ya.", "error");
      if (cv.stok - inCart(cv.id) < sel.qty) return toast(cv.stok <= 0 ? "Varian ini sudah habis." : "Jumlah melebihi stok. Stok tersisa " + cv.stok + ".", "error");
      addToCart(cv.id, sel.qty);
      if (b.dataset.add === "buy") { location.hash = "#/checkout"; return; }
      toast("Ditambahkan ke keranjang: " + p.nama + " (" + cv.warna + ", " + cv.ukuran + ")", "ok"); sel.qty = 1;
    }
    paint();
  });
  paint();
  A.reviews(p.id).then(r => {
    $("#rev").innerHTML = `<p>${r.jumlah ? `<span class="stars">${stars(r.rata_rata)}</span> ${r.rata_rata} dari 5 (${r.jumlah} ulasan)` : "Belum ada ulasan yang disetujui."}</p>
      ${r.ulasan.map(u => `<div class="card" style="margin-bottom:10px"><b>${esc(u.nama)}</b> <span class="stars">${stars(u.rating)}</span> <span class="muted">${esc(u.tanggal)}</span><p style="margin:6px 0 0">${esc(u.komentar)}</p></div>`).join("")}
      <div class="card"><h3>Tulis ulasan</h3><p class="muted">Ulasan tampil setelah disetujui admin. Ulasan belum diverifikasi sebagai pembelian.</p>
      <div class="field" id="r-nama"><label for="rvName">Nama tampilan (boleh nama panggilan)</label><input id="rvName" maxlength="30" autocomplete="nickname"><div class="err"></div></div>
      <div class="field" id="r-rating"><label for="rvRating">Rating</label><select id="rvRating"><option value="">Pilih rating</option><option value="5">5 - Sangat bagus</option><option value="4">4 - Bagus</option><option value="3">3 - Cukup</option><option value="2">2 - Kurang</option><option value="1">1 - Buruk</option></select><div class="err"></div></div>
      <div class="field" id="r-text"><label for="rvText">Ulasan (5-500 karakter)</label><textarea id="rvText" maxlength="500"></textarea><div class="err"></div></div>
      <div id="rvMsg"></div><button class="btn" id="rvSend" data-loading="Mengirim...">Kirim Ulasan</button></div>`;
    $("#rvSend").onclick = () => {
      const n = $("#rvName").value.trim(), r = $("#rvRating").value, t = $("#rvText").value.trim(); let bad = false;
      const chk = (id, ok, msg) => { const f = $("#" + id); f.classList.toggle("bad", !ok); $(".err", f).textContent = ok ? "" : msg; if (!ok) bad = true; };
      chk("r-nama", n.length >= 2, "Isi nama tampilan minimal 2 karakter."); chk("r-rating", !!r, "Pilih rating 1 sampai 5."); chk("r-text", t.length >= 5, "Tulis ulasan minimal 5 karakter.");
      if (bad) return;
      A.busy($("#rvSend"), () => A.submitReview({ product_id: p.id, nama: n, rating: Number(r), komentar: t }))
        .then(res => { if (res) { $("#rvMsg").innerHTML = notice(res.message, "ok"); $("#rvText").value = ""; } })
        .catch(e => { $("#rvMsg").innerHTML = notice(e.message, "error"); });
    };
  }).catch(e => { $("#rev").innerHTML = notice("Ulasan belum bisa dimuat: " + e.message, "warn"); });
}

/* ---------- Keranjang ---------- */
// Cocokkan keranjang dengan data terbaru dari database; sesuaikan jumlah bila stok berubah
function reconcile() {
  const msgs = [], lines = []; let sub = 0, blocked = false;
  const cart = getCart();
  cart.forEach(it => {
    const r = S.idx[it.vid];
    if (!r) { lines.push({ it, issue: "Produk ini sudah tidak tersedia. Hapus dari keranjang." }); blocked = true; return; }
    if (r.v.stok <= 0) { lines.push({ it, r, issue: "Varian ini sudah habis. Hapus, lalu pilih varian lain." }); blocked = true; return; }
    if (it.qty > r.v.stok) { msgs.push(r.p.nama + " (" + r.v.warna + ", " + r.v.ukuran + "): stok tersisa " + r.v.stok + ", jumlah disesuaikan."); it.qty = r.v.stok; }
    sub += r.p.harga * it.qty; lines.push({ it, r });
  });
  if (msgs.length) save(CART_KEY, cart);
  return { lines, sub, msgs, blocked };
}
function vCart() {
  const c = reconcile();
  if (!c.lines.length) return show(`<div class="empty"><h2>Keranjangmu masih kosong</h2><p>Yuk pilih beberapa produk favoritmu dulu.</p><a class="btn" href="#/produk">Mulai belanja</a></div>`);
  show(`<section class="section"><h1>Keranjang Belanja</h1>${c.msgs.map(m => notice(m, "warn")).join("")}<div class="layout2"><div class="card">
    ${c.lines.map(l => l.r ? `<div class="cartitem"><a class="pimg" href="#/produk/${encodeURIComponent(l.r.p.id)}">${imgHtml(l.r.p)}</a><div>
      <b>${esc(l.r.p.nama)}</b><div class="muted">SKU ${esc(l.r.p.sku)} - ${esc(l.r.v.warna)}, ${esc(l.r.v.ukuran)}</div><div>${rp(l.r.p.harga)} per item</div>
      ${l.issue ? notice(l.issue, "error") : ""}<div class="line"><div class="qty" role="group" aria-label="Jumlah"><button data-dec="${esc(l.it.vid)}" aria-label="Kurangi">-</button><span>${l.it.qty}</span><button data-inc="${esc(l.it.vid)}" aria-label="Tambah">+</button></div>
      <b>${l.issue ? "" : rp(l.r.p.harga * l.it.qty)}</b><button class="link" data-del="${esc(l.it.vid)}">Hapus</button></div></div></div>`
      : `<div class="cartitem"><div></div><div>${notice(l.issue, "error")}<button class="link" data-del="${esc(l.it.vid)}">Hapus</button></div></div>`).join("")}</div>
    <aside class="card sum"><h2>Ringkasan</h2><div><span>Subtotal</span><b>${rp(c.sub)}</b></div><div class="muted"><span>Ongkir</span><span>dihitung saat checkout</span></div>
      <div style="display:grid;gap:10px;margin-top:14px"><a class="btn" href="#/checkout" ${c.blocked ? 'aria-disabled="true" id="goCo"' : ""}>Checkout</a><a class="btn ghost" href="#/produk">Lanjut belanja</a></div>
      ${c.blocked ? '<p class="muted">Hapus item yang bermasalah dulu agar bisa checkout.</p>' : ""}</aside></div></section>`);
  const go = $("#goCo"); if (go) go.addEventListener("click", e => e.preventDefault());
  app.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const cart = getCart();
    const it = cart.find(x => x.vid === (b.dataset.inc || b.dataset.dec || b.dataset.del)); if (!it) return;
    const r = S.idx[it.vid];
    if (b.dataset.del) { setCart(cart.filter(x => x !== it && x.vid !== it.vid)); toast("Produk dihapus dari keranjang."); }
    else if (b.dataset.inc) { if (r && it.qty >= r.v.stok) return toast("Jumlah sudah mencapai stok yang tersedia (" + r.v.stok + ").", "error"); it.qty++; setCart(cart); }
    else if (b.dataset.dec) { if (it.qty <= 1) return toast("Jumlah minimal 1. Gunakan Hapus untuk membuang produk.", ""); it.qty--; setCart(cart); }
    vCart();
  };
}

/* ---------- Checkout tamu ---------- */
const normWa = v => { let d = String(v || "").replace(/[\s\-().+]/g, ""); if (/^0/.test(d)) d = "62" + d.slice(1); return /^62[1-9]\d{7,12}$/.test(d) ? d : null; };
function stepsBar(n) {
  const t = ["Keranjang", "Data pengiriman", "Ringkasan & pembayaran", "Konfirmasi"];
  return `<ol class="steps" aria-label="Langkah checkout">${t.map((x, i) => `<li class="${i + 1 === n ? "on" : (i + 1 < n ? "done" : "")}" ${i + 1 === n ? 'aria-current="step"' : ""}>${i + 1}. ${x}</li>`).join("")}</ol>`;
}
function vCheckout() {
  if (S.co.done && !getCart().length) return stepDone();
  const c = reconcile();
  if (!c.lines.length) return show(`<div class="empty"><h2>Keranjangmu kosong</h2><p>Tambahkan produk dulu sebelum checkout.</p><a class="btn" href="#/produk">Mulai belanja</a></div>`);
  if (c.blocked || c.msgs.length) { toast(c.blocked ? "Ada produk yang tidak tersedia. Periksa keranjangmu." : "Stok berubah, jumlah disesuaikan. Periksa keranjangmu.", "error"); location.hash = "#/keranjang"; return; }
  S.co.step === 3 ? stepSummary(c) : stepForm();
}
function stepForm() {
  const f = S.co.form;
  show(`<section class="section"><h1>Checkout</h1>${stepsBar(2)}<div class="card" style="max-width:640px"><h2>Data pengiriman</h2><p class="muted">Tanpa login. Data hanya dipakai untuk memproses pesanan ini.</p>
    <div class="field" id="f-nama"><label for="nama">Nama penerima</label><input id="nama" maxlength="60" autocomplete="name" value="${esc(f.nama || "")}"><div class="err"></div></div>
    <div class="field" id="f-wa"><label for="wa">Nomor WhatsApp</label><input id="wa" inputmode="tel" autocomplete="tel" placeholder="081234567890" value="${esc(f.wa || "")}"><div class="err"></div></div>
    <div class="field" id="f-alamat"><label for="alamat">Alamat lengkap</label><textarea id="alamat" maxlength="300" autocomplete="street-address">${esc(f.alamat || "")}</textarea><div class="err"></div></div>
    <div class="field" id="f-kota"><label for="kota">Kota / kecamatan</label><input id="kota" maxlength="60" value="${esc(f.kota || "")}"><div class="err"></div></div>
    <div class="field"><label for="cat">Catatan pesanan (opsional)</label><textarea id="cat" maxlength="200">${esc(f.catatan || "")}</textarea></div>
    <div class="field"><label for="kirim">Pengiriman</label><select id="kirim" disabled><option>Reguler - tarif flat toko</option></select></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn ghost" href="#/keranjang">Kembali ke keranjang</a><button class="btn" id="next">Lanjut ke ringkasan</button></div></div></section>`);
  $("#next").onclick = () => {
    const v = { nama: $("#nama").value.trim(), wa: $("#wa").value.trim(), alamat: $("#alamat").value.trim(), kota: $("#kota").value.trim(), catatan: $("#cat").value.trim() };
    let bad = false; const chk = (id, ok, msg) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : msg; if (!ok && !bad) { bad = true; $("input,textarea", el).focus(); } };
    chk("f-nama", v.nama.length >= 2, "Isi nama penerima minimal 2 karakter.");
    chk("f-wa", !!normWa(v.wa), "Nomor WhatsApp belum benar. Contoh: 081234567890.");
    chk("f-alamat", v.alamat.length >= 10, "Isi alamat lengkap (jalan, nomor, RT/RW), minimal 10 karakter.");
    chk("f-kota", v.kota.length >= 2, "Isi kota atau kecamatan tujuan.");
    if (bad) return;
    S.co.form = v; S.co.step = 3; vCheckout();
  };
}
function stepSummary(c) {
  const f = S.co.form, ong = shipCost(c.sub), tot = c.sub + ong, st = S.settings;
  show(`<section class="section"><h1>Checkout</h1>${stepsBar(3)}<div class="layout2"><div>
    <div class="card" style="margin-bottom:16px"><h2>Dikirim ke</h2><p style="margin:0"><b>${esc(f.nama)}</b> - ${esc(f.wa)}<br>${esc(f.alamat)}, ${esc(f.kota)}${f.catatan ? "<br><span class='muted'>Catatan: " + esc(f.catatan) + "</span>" : ""}</p><button class="link" id="edit">Ubah data pengiriman</button></div>
    <div class="card"><h2>Metode pembayaran</h2><p class="muted">Pembayaran manual. Website ini belum memakai payment gateway.</p>
      <label class="pay"><input type="radio" name="pay" value="Transfer Bank" ${S.co.metode === "Transfer Bank" ? "checked" : ""}><span><b>Transfer Bank (manual)</b><br><span class="muted">Instruksi rekening tampil setelah pesanan dibuat. Status berubah setelah admin memeriksa pembayaranmu.</span></span></label>
      <label class="pay"><input type="radio" name="pay" value="Konfirmasi via WhatsApp" ${S.co.metode === "Konfirmasi via WhatsApp" ? "checked" : ""}><span><b>Konfirmasi via WhatsApp</b><br><span class="muted">Pembayaran diatur langsung dengan admin lewat WhatsApp.</span></span></label></div></div>
    <aside class="card sum"><h2>Ringkasan pesanan</h2>${c.lines.map(l => `<div><span>${esc(l.r.p.nama)}<br><span class="muted">${esc(l.r.v.warna)}, ${esc(l.r.v.ukuran)} x ${l.it.qty}</span></span><span>${rp(l.r.p.harga * l.it.qty)}</span></div>`).join("")}
      <div><span>Subtotal</span><span>${rp(c.sub)}</span></div><div><span>Ongkir (tarif flat toko)</span><span>${ong ? rp(ong) : "Gratis"}</span></div><div class="tot"><span>Total</span><span>${rp(tot)}</span></div>
      <p class="muted">Total akhir dihitung ulang oleh server dari harga di database.</p><div id="coMsg"></div>
      <div style="display:grid;gap:10px"><button class="btn" id="place" data-loading="Membuat pesanan...">Buat Pesanan</button><a class="btn ghost" href="#/keranjang">Ubah keranjang</a></div></aside></div></section>`);
  $("#edit").onclick = () => { S.co.step = 2; vCheckout(); };
  $$("input[name=pay]").forEach(r => r.onchange = () => { S.co.metode = r.value; });
  $("#place").onclick = () => {
    S.co.key = S.co.key || A.newKey(); // kunci sama dipakai ulang saat coba lagi, jadi tidak membuat pesanan ganda
    const body = { nama: f.nama, whatsapp: f.wa, alamat: f.alamat, kota: f.kota, catatan: f.catatan, metode_bayar: S.co.metode, client_key: S.co.key,
      items: c.lines.map(l => ({ variant_id: l.it.vid, jumlah: l.it.qty })) };
    A.busy($("#place"), () => A.createOrder(body)).then(res => {
      if (!res) return;
      setCart([]); S.co.done = res; S.co.step = 2; S.co.key = null; S.co.form = {};
      const o = load(ORD_KEY, []); o.unshift({ kode: res.kode, t: Date.now() }); save(ORD_KEY, o.slice(0, 10));
      stepDone();
    }).catch(e => {
      let m = e.message;
      if (e.code === "TIMEOUT") m += " Keranjangmu aman. Tekan Buat Pesanan sekali lagi, pesanan tidak akan tercatat ganda.";
      if (e.code === "OUT_OF_STOCK" || e.code === "UNAVAILABLE") { toast(m, "error"); S.products = null; location.hash = "#/keranjang"; return; }
      $("#coMsg").innerHTML = notice(m, "error");
    });
  };
}
function stepDone() {
  const o = S.co.done, st = S.settings, wa = o.whatsapp_toko;
  const txt = "Halo Cacutie Style, saya sudah membuat pesanan " + o.kode + " atas nama pelanggan. Total " + rp(o.total) + ". Item: " + o.items.map(i => i.nama + " (" + i.warna + ", " + i.ukuran + ") x" + i.jumlah).join("; ") + ".";
  show(`<section class="section"><h1>Pesanan berhasil dibuat</h1>${stepsBar(4)}<div class="card" style="max-width:680px">
    <p>Nomor pesananmu (simpan ya):</p><p><span class="code" id="kode">${esc(o.kode)}</span></p><button class="btn sm ghost" id="copy">Salin nomor pesanan</button>
    <p style="margin-top:16px">Status: <span class="pill">${esc(o.status)}</span></p>
    <div class="tablewrap"><table><thead><tr><th>Produk</th><th>Jml</th><th>Subtotal</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.nama)}<br><span class="muted">${esc(i.warna)}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td></tr>`).join("")}</tbody></table></div>
    <div class="sum"><div><span>Subtotal</span><span>${rp(o.subtotal)}</span></div><div><span>Ongkir</span><span>${o.ongkir ? rp(o.ongkir) : "Gratis"}</span></div><div class="tot"><span>Total</span><span>${rp(o.total)}</span></div></div>
    ${o.metode_bayar === "Transfer Bank" ? `<div class="notice"><b>Pembayaran manual (bukan payment gateway)</b><br>${esc(o.info_transfer || "Admin akan menghubungimu untuk instruksi pembayaran.")}<br>Setelah transfer, kirim bukti lewat WhatsApp agar admin bisa memeriksa.</div>` : `<div class="notice"><b>Pembayaran via WhatsApp</b><br>Hubungi admin lewat tombol di bawah untuk mengatur pembayaran.</div>`}
    <div style="display:flex;gap:10px;flex-wrap:wrap">${wa ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(txt)}">Kirim ke WhatsApp toko</a>` : ""}
    <a class="btn ghost" href="#/lacak?kode=${encodeURIComponent(o.kode)}">Lacak pesanan</a><a class="btn ghost" href="#/produk">Lanjut belanja</a></div>
    ${wa ? "" : '<p class="muted">Nomor WhatsApp toko belum diatur admin. Simpan nomor pesananmu untuk melacak status.</p>'}</div></section>`);
  $("#copy").onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(o.kode) : Promise.reject()).then(() => toast("Nomor pesanan disalin.", "ok")).catch(() => toast("Salin manual: " + o.kode)); };
}

/* ---------- Lacak pesanan ---------- */
function vTrack(prefill) {
  const recent = load(ORD_KEY, []);
  show(`<section class="section"><h1>Lacak Pesanan</h1><div class="card" style="max-width:560px"><p class="muted">Masukkan nomor pesanan dan nomor WhatsApp yang kamu pakai saat checkout. Tidak perlu akun.</p>
    <div class="field" id="t-kode"><label for="tk">Nomor pesanan</label><input id="tk" maxlength="30" placeholder="Contoh: CS260101-AB3XY" value="${esc(prefill)}"><div class="err"></div></div>
    <div class="field" id="t-wa"><label for="tw">Nomor WhatsApp</label><input id="tw" inputmode="tel" placeholder="081234567890"><div class="err"></div></div>
    ${recent.length ? `<p class="muted">Pesanan terakhir di perangkat ini: ${recent.map(r => `<button class="link" data-k="${esc(r.kode)}">${esc(r.kode)}</button>`).join(", ")}</p>` : ""}
    <div id="tMsg"></div><button class="btn" id="tgo" data-loading="Mencari pesanan...">Cek Status</button></div><div id="tRes" style="margin-top:20px"></div></section>`);
  $$("[data-k]").forEach(b => b.onclick = () => { $("#tk").value = b.dataset.k; $("#tw").focus(); });
  $("#tgo").onclick = () => {
    const k = $("#tk").value.trim().toUpperCase(), w = $("#tw").value.trim(); let bad = false;
    const chk = (id, ok, m) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : m; if (!ok) bad = true; };
    chk("t-kode", k.length >= 5, "Isi nomor pesanan."); chk("t-wa", !!normWa(w), "Nomor WhatsApp belum benar. Contoh: 081234567890.");
    if (bad) return;
    $("#tMsg").innerHTML = ""; $("#tRes").innerHTML = "";
    A.busy($("#tgo"), () => A.trackOrder(k, w)).then(o => {
      if (!o) return;
      $("#tRes").innerHTML = `<div class="card" style="max-width:680px"><h2>${esc(o.kode)}</h2><p>Status: <span class="pill">${esc(o.status)}</span> Pembayaran: <span class="pill">${esc(o.status_bayar)}</span></p>
        ${o.resi ? `<p>Nomor resi: <b>${esc(o.resi)}</b></p>` : ""}<p class="muted">Dibuat ${esc(o.dibuat)} - tujuan ${esc(o.kota)}</p>
        <div class="tablewrap"><table><thead><tr><th>Produk</th><th>Jml</th><th>Subtotal</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.nama)}<br><span class="muted">${esc(i.warna)}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td></tr>`).join("")}</tbody></table></div>
        <div class="sum"><div><span>Ongkir</span><span>${o.ongkir ? rp(o.ongkir) : "Gratis"}</span></div><div class="tot"><span>Total</span><span>${rp(o.total)}</span></div></div></div>`;
    }).catch(e => { $("#tMsg").innerHTML = notice(e.message, "error"); });
  };
}

/* ---------- Halaman informasi ---------- */
function vInfo(name) {
  const st = S.settings, wa = st.whatsapp_toko;
  const contact = `<ul><li>WhatsApp: ${wa ? "+" + esc(wa) : "belum diatur admin"}</li><li>Email: ${esc(st.email_toko || "belum diatur admin")}</li><li>Alamat: ${esc(st.alamat_toko || "-")}</li><li>Jam operasional: ${esc(st.jam_operasional || "-")}</li></ul>`;
  const pages = {
    tentang: ["Tentang Kami", `<p>${esc(st.nama_toko || "Cacutie Style")} adalah toko fashion online untuk anak muda dan mahasiswa, dengan pilihan untuk wanita, pria, dan aksesori. ${esc(st.slogan || "")}</p><p class="muted">Website ini dibuat untuk tugas mata kuliah E-Commerce. Produk dan ulasan yang tampil adalah data contoh kecuali sudah diganti admin.</p><h2>Kontak toko</h2>${contact}`],
    faq: ["FAQ & Cara Belanja", `<details open><summary><b>Bagaimana cara berbelanja?</b></summary><p>Pilih produk, tentukan warna dan ukuran, lalu Tambah ke Keranjang. Buka keranjang, tekan Checkout, isi data pengiriman, periksa ringkasan, pilih metode pembayaran, lalu Buat Pesanan. Tidak perlu akun.</p></details>
      <details><summary><b>Bagaimana cara melacak pesanan?</b></summary><p>Buka menu Lacak Pesanan, isi nomor pesanan dan nomor WhatsApp yang kamu pakai saat checkout.</p></details>
      <details><summary><b>Bagaimana pembayarannya?</b></summary><p>Pembayaran masih manual: transfer bank sesuai instruksi setelah pesanan dibuat, atau diatur lewat WhatsApp. Belum ada pembayaran otomatis.</p></details>
      <details><summary><b>Bagaimana ongkos kirimnya?</b></summary><p>${esc(st.info_pengiriman || "Ongkir memakai tarif flat toko.")}</p></details>
      <details><summary><b>Ukuran yang kupilih habis, bagaimana?</b></summary><p>Pilih warna atau ukuran lain yang masih tersedia. Opsi yang habis tampil dicoret dan tidak bisa dipilih.</p></details>
      <details><summary><b>Bagaimana jika ingin menukar barang?</b></summary><p>Lihat <a href="#/pengembalian">Kebijakan Pengembalian</a> atau hubungi kontak toko.</p></details><h2>Kontak</h2>${contact}`],
    privasi: ["Kebijakan Privasi", `<p class="notice warn">Contoh kebijakan untuk tugas kuliah. Pemilik toko perlu menyesuaikannya sebelum dipakai untuk bisnis sungguhan.</p>
      <h3>Data yang dikumpulkan</h3><p>Saat checkout: nama penerima, nomor WhatsApp, alamat, kota, catatan, dan isi pesanan. Untuk ulasan: nama tampilan, rating, dan komentar. Kami tidak meminta kata sandi, PIN, atau kode OTP.</p>
      <h3>Tujuan penggunaan</h3><p>Memproses dan mengirim pesanan, menghubungi pembeli terkait pesanan, serta menampilkan status pesanan.</p>
      <h3>Penyimpanan dan akses</h3><p>Data pesanan disimpan di Google Sheets milik pemilik toko dan hanya dapat dibuka oleh admin. Pelacakan pesanan memerlukan nomor pesanan dan nomor WhatsApp yang cocok. Keranjang disimpan di browsermu sendiri (localStorage) dan berisi varian serta jumlah saja.</p>
      <h3>Kontak</h3>${contact}`],
    pengembalian: ["Kebijakan Pengembalian", `<p class="notice warn">Contoh ketentuan untuk tugas kuliah, belum merupakan kebijakan bisnis resmi. Admin dapat menyesuaikannya.</p>
      <ul><li>Penukaran ukuran atau barang cacat dapat diajukan dalam 3 hari setelah barang diterima.</li><li>Barang harus belum dipakai atau dicuci, dan label masih terpasang.</li><li>Sertakan foto atau video kondisi barang saat menghubungi toko lewat WhatsApp.</li><li>Biaya kirim penukaran karena kesalahan toko ditanggung toko. Penukaran karena alasan lain ditanggung pembeli.</li><li>Pesanan yang dibatalkan sebelum dikirim akan membuat stok kembali tersedia.</li></ul><h3>Kontak</h3>${contact}`]
  };
  show(`<section class="section"><div class="card" style="max-width:760px"><h1>${pages[name][0]}</h1>${pages[name][1]}</div></section>`);
}

/* ---------- Header: menu mobile & pencarian ---------- */
$("#btnMenu").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#btnMenu").setAttribute("aria-expanded", o); };
$("#btnSearch").onclick = () => { const o = $("#searchbar").classList.toggle("open"); $("#btnSearch").setAttribute("aria-expanded", o); if (o) $("#q").focus(); };
$("#searchForm").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); location.hash = "#/produk" + (q ? "?q=" + encodeURIComponent(q) : ""); $("#searchbar").classList.remove("open"); };
window.addEventListener("hashchange", route);
route();
})();
