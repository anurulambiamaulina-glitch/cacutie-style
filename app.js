/* app.js - Cacutie Style: gerbang, toko pelanggan, dan pemicu panel admin (satu tautan).
   Semua teks tampilan memakai t("kunci") dari js/lang.js (Indonesia / English). */
(function () {
"use strict";
const A = window.CSApi, L = window.CS_LANG;
const S = { cust: null, couriers: [], ads: [], products: null, settings: {}, idx: {}, co: { step: 2, form: {}, metode: "Transfer Bank", key: null, done: null } };
const CART_KEY = "cs_cart_v1", ORD_KEY = "cs_orders_v1", LANG_KEY = "cs_lang", MODE_KEY = "cs_mode";

/* ---------- Util ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp" + Number(n || 0).toLocaleString("id-ID");
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const app = $("#app");

/* ---------- Bahasa ---------- */
let lang = load(LANG_KEY, "id"); if (!L[lang]) lang = "id";
// Hasil t() untuk dimasukkan ke HTML: escape variabel dari pengguna lebih dulu (esc) sebelum dikirim sebagai v
const t = (k, v) => { let s = L[lang][k] != null ? L[lang][k] : (L.id[k] != null ? L.id[k] : k); if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => v[n] != null ? v[n] : m); return s; };
const SLUG = { "Menunggu pembayaran": "waitpay", "Menunggu konfirmasi": "waitconf", "Diproses": "process", "Dikemas": "pack", "Dikirim": "ship", "Selesai": "done", "Dibatalkan": "cancel" };
const PSLUG = { "Belum dibayar": "unpaid", "Sudah dibayar": "paid", "Dikembalikan": "refunded" };
const st = s => t("st." + (SLUG[s] || "x")), pst = s => t("pay." + (PSLUG[s] || "x"));
const em = e => (lang !== "id" && L[lang]["err." + e.code]) || e.message; // pesan error server tetap Indonesia bila tak ada padanannya
function applyStatic() {
  document.documentElement.lang = lang; document.title = t("title");
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === lang));
}
function setLang(l) {
  if (!L[l]) return; lang = l; save(LANG_KEY, l); applyStatic(); updateAcct(); renderAnnc(); renderFooter();
  if (!$("#shop").hidden) route();
}

/* ---------- UI dasar ---------- */
function toast(msg, type) { const el = document.createElement("div"); el.className = "toast " + (type || ""); el.textContent = msg; $("#toast").appendChild(el); setTimeout(() => el.remove(), type === "error" ? 6000 : 3500); }
function show(html) { app.onclick = null; app.innerHTML = html; app.focus({ preventScroll: true }); window.scrollTo(0, 0); }
const loading = () => show(`<div class="loading"><div class="spin"></div>${t("loading")}</div>`);
const notice = (msg, type) => `<div class="notice ${type || ""}" role="${type === "error" ? "alert" : "status"}">${esc(msg)}</div>`;
const fmtT = s => s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) + " " + String(s).slice(11, 16) : "";

/* ---------- WhatsApp ---------- */
const waNum = () => String(S.settings.whatsapp_toko || "").replace(/\D/g, "");
const waUrl = text => "https://wa.me/" + waNum() + "?text=" + encodeURIComponent(text);
const waA = (text, label, cls) => waNum() ? `<a class="${cls || ""}" href="${waUrl(text)}" target="_blank" rel="noopener">${label}</a>` : `<a class="${cls || ""}" href="#" data-nowa>${label}</a>`;
document.addEventListener("click", e => { const a = e.target.closest("[data-nowa]"); if (a) { e.preventDefault(); toast(t("wa.notset"), "error"); } });
function updateFab(text) {
  const f = $("#waFab"); text = text || t("wa.ask.general");
  if (waNum()) { f.href = waUrl(text); f.target = "_blank"; f.rel = "noopener"; f.removeAttribute("data-nowa"); }
  else { f.href = "#"; f.removeAttribute("target"); f.setAttribute("data-nowa", ""); }
}

/* ---------- Keranjang (localStorage hanya menyimpan variant_id + jumlah) ---------- */
const getCart = () => { const c = load(CART_KEY, []); return Array.isArray(c) ? c.filter(x => x && typeof x.vid === "string" && x.qty > 0) : []; };
function setCart(c) { save(CART_KEY, c); S.co.key = null; S.co.done = null; updateBadge(); }
function updateBadge() { const n = getCart().reduce((a, x) => a + x.qty, 0), b = $("#cartCount"); b.textContent = n; b.hidden = !n; }
const inCart = vid => (getCart().find(x => x.vid === vid) || { qty: 0 }).qty;
function addToCart(vid, qty) { const c = getCart(), it = c.find(x => x.vid === vid); if (it) it.qty += qty; else c.push({ vid, qty }); setCart(c); }

/* ---------- Data ---------- */
function indexData() { S.idx = {}; S.products.forEach(p => p.varian.forEach(v => { S.idx[v.id] = { p, v }; })); }
function ensureData(force) {
  if (S.products && !force) return Promise.resolve();
  return A.bootstrap().then(r => { S.products = r.products; S.settings = r.settings; S.couriers = r.couriers; S.ads = r.ads; indexData(); renderAnnc(); renderFooter(); updateFab(); });
}
function withData(fn, force) {
  loading();
  ensureData(force).then(fn).catch(err => {
    show(`<div class="empty"><h2>${t("err.load")}</h2><p>${esc(em(err))}</p><button class="btn" id="retry">${t("retry")}</button></div>`);
    $("#retry").onclick = () => route();
  });
}
const freeMin = () => Number(S.settings.gratis_ongkir_min) || 0;
function renderAnnc() {
  const a = $("#annc"), m = freeMin();
  a.hidden = !(m > 0 && S.products); if (m > 0) a.textContent = t("annc.free", { min: rp(m) });
}
function renderFooter() {
  const s = S.settings, wa = waNum(), nm = esc(s.nama_toko || "Cacutie Style");
  $("#footer").innerHTML = `<div class="wrap fgrid">
    <div><div class="flogo"><img src="assets/logo.svg" alt="" width="44" height="44"><b>${nm}</b></div><p>${esc(s.slogan || "Your Style, Your Story.")}</p></div>
    <div><h3>${t("f.shop")}</h3><ul><li><a href="#/produk">${t("nav.all")}</a></li><li><a href="#/produk?kat=Wanita">${t("nav.women")}</a></li><li><a href="#/produk?kat=Pria">${t("nav.men")}</a></li><li><a href="#/produk?kat=Aksesori">${t("nav.acc")}</a></li></ul></div>
    <div><h3>${t("f.help")}</h3><ul><li><a href="#/lacak">${t("nav.track")}</a></li><li><a href="#/faq">${t("nav.help")}</a></li><li>${waA(t("wa.ask.general"), t("wa.contact"))}</li></ul></div>
    <div><h3>${t("f.contact")}</h3><ul>${wa ? `<li>WhatsApp: +${esc(wa)}</li>` : ""}${s.email_toko ? `<li>${esc(s.email_toko)}</li>` : ""}${s.jam_operasional ? `<li>${esc(s.jam_operasional)}</li>` : ""}${s.alamat_toko ? `<li>${esc(s.alamat_toko)}</li>` : ""}</ul></div></div>
    <div class="wrap fcopy">&copy; ${new Date().getFullYear()} ${nm}. ${t("f.rights")}</div>`;
}

/* ---------- Komponen ---------- */
// Tautan Google Drive otomatis diubah menjadi tautan gambar langsung (file harus dibagikan "Siapa saja yang memiliki link")
const imgSrc = u => { u = String(u || ""); const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/); return m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w800" : u; };
const imgList = p => String(p.gambar || "").split("|").map(s => s.trim()).filter(Boolean);
function imgHtml(p) { const l = imgList(p); return l.length ? `<img src="${esc(imgSrc(l[0]))}" alt="${esc(p.nama)}" loading="lazy" data-ph="${esc(p.nama)}">` : `<div class="ph">${esc(p.nama)}</div>`; }
document.addEventListener("error", e => { const x = e.target; if (x && x.tagName === "IMG" && x.dataset.ph) { const d = document.createElement("div"); d.className = "ph"; d.textContent = x.dataset.ph; x.replaceWith(d); } }, true);
function pcard(p) {
  const soldout = p.stok_total <= 0, warna = new Set(p.varian.map(v => v.warna)).size, n = imgList(p).length;
  return `<a class="pcard" href="#/produk/${encodeURIComponent(p.id)}" aria-label="${esc(t("card.view", { name: p.nama }))}">
    <div class="pimg">${imgHtml(p)}${soldout ? `<span class="tag soldout">${t("card.soldout")}</span>` : (p.label ? `<span class="tag">${esc(p.label)}</span>` : "")}${n > 1 ? `<span class="photos">${n} ${t("card.photos")}</span>` : ""}</div>
    <div class="meta"><h3>${esc(p.nama)}</h3><div class="price">${rp(p.harga)}</div><div class="muted">${esc(t("cat." + p.kategori))} - ${warna} ${t("card.colors")}</div></div></a>`;
}
const stars = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const courier = id => (S.couriers || []).find(k => k.id === id);
const shipFor = (sub, kr) => { const m = freeMin(); return (m > 0 && sub >= m) ? 0 : (kr ? kr.tarif : 0); };

// Galeri foto: geser (swipe) di HP, tombol panah, titik, dan thumbnail
function galleryHtml(list, alt) {
  const many = list.length > 1;
  if (!list.length) return `<div class="pimg" style="border-radius:var(--r)"><div class="ph">${esc(alt)}</div></div>`;
  return `<div class="gal"><div class="slides" id="slides" tabindex="0" role="group" aria-roledescription="carousel" aria-label="${esc(t("d.photos"))}">${list.map((u, i) => `<div class="slide"><img src="${esc(imgSrc(u))}" alt="${esc(alt)} ${i + 1}/${list.length}" ${i ? 'loading="lazy"' : ""} data-ph="${esc(alt)}"></div>`).join("")}</div>
    ${many ? `<button class="gnav prev" type="button" aria-label="${t("d.prev")}">&#8249;</button><button class="gnav next" type="button" aria-label="${t("d.next")}">&#8250;</button><div class="dots">${list.map((_, i) => `<button type="button" class="dot" data-i="${i}" aria-label="${t("d.photo")} ${i + 1}"></button>`).join("")}</div>` : ""}</div>
    ${many ? `<div class="thumbs">${list.map((u, i) => `<button type="button" class="th" data-i="${i}" aria-label="${t("d.photo")} ${i + 1}"><img src="${esc(imgSrc(u))}" alt=""></button>`).join("")}</div>` : ""}`;
}
function bindGallery(root) {
  const sl = $("#slides", root); if (!sl) return;
  const n = sl.children.length, w = () => sl.clientWidth || 1, cur = () => Math.round(sl.scrollLeft / w()), go = i => sl.scrollTo({ left: w() * Math.max(0, Math.min(n - 1, i)), behavior: "smooth" });
  const sync = () => { const c = cur(); $$(".dot,.th", root).forEach(b => b.classList.toggle("on", Number(b.dataset.i) === c)); };
  sl.addEventListener("scroll", () => { clearTimeout(sl._t); sl._t = setTimeout(sync, 50); });
  const pv = $(".prev", root), nx = $(".next", root);
  if (pv) pv.onclick = () => go(cur() - 1); if (nx) nx.onclick = () => go(cur() + 1);
  $$("[data-i]", root).forEach(b => { b.onclick = () => go(Number(b.dataset.i)); });
  sl.onkeydown = e => { if (e.key === "ArrowLeft") { e.preventDefault(); go(cur() - 1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(cur() + 1); } };
  sync();
}

// Iklan: gambar, video (YouTube / Google Drive / file mp4), atau info teks
function videoHtml(u) {
  u = String(u || "");
  let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/))([\w-]{6,})/);
  if (m) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}?rel=0" title="Video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" title="Video" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  return `<video src="${esc(u)}" controls muted playsinline preload="metadata"></video>`;
}
function adHtml(a) {
  const ext = /^https:/.test(a.tautan || ""), lbl = `<small class="adlabel">${a.promo ? t("ad.promo") : t("ad.label")}</small>`;
  const btn = a.tautan && a.tombol ? `<a class="btn sm" href="${esc(a.tautan)}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${esc(a.tombol)}</a>` : "";
  const txt = `<div class="adtxt">${lbl}<h3>${esc(a.judul)}</h3>${a.teks ? `<p>${esc(a.teks)}</p>` : ""}${btn}</div>`;
  if (a.tipe === "video" && a.video) return `<div class="ad video"><div class="adv">${videoHtml(a.video)}</div>${txt}</div>`;
  if (a.tipe === "info") return `<div class="ad info">${txt}</div>`;
  return `<div class="ad">${a.gambar ? `<div class="adimg"><img src="${esc(imgSrc(a.gambar))}" alt="" loading="lazy"></div>` : ""}${txt}</div>`;
}

/* ---------- Router & navigasi ---------- */
function parseQs(s) { const o = {}; s.split("&").forEach(p => { if (!p) return; const i = p.indexOf("="); o[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? "" : decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); }); return o; }
function hashInfo() {
  const h = location.hash.replace(/^#/, "") || "/", qi = h.indexOf("?");
  return { parts: (qi < 0 ? h : h.slice(0, qi)).split("/").filter(Boolean), qs: parseQs(qi < 0 ? "" : h.slice(qi + 1)) };
}
function markNav() { // penanda menu aktif (pil gelap) sesuai halaman dan kategori yang sedang dibuka
  const { parts, qs } = hashInfo(), name = parts[0] || "home";
  const key = name === "produk" && !parts[1] && qs.kat ? "kat:" + qs.kat : name;
  $$("#nav a[data-key]").forEach(a => { const on = a.dataset.key === key; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
function closeAll() { $("#overlay").hidden = true; $("#profile").hidden = true; $("#nav").classList.remove("open"); $("#btnMenu").setAttribute("aria-expanded", "false"); }
function route() {
  if ($("#shop").hidden) return;
  const { parts, qs } = hashInfo(), name = parts[0] || "home";
  closeAll(); markNav(); updateBadge(); updateFab();
  switch (name) {
    case "home": return withData(vHome);
    case "produk": return parts[1] ? withData(() => vDetail(decodeURIComponent(parts[1]))) : withData(() => vCatalog(qs));
    case "keranjang": return withData(vCart);
    case "checkout": return withData(vCheckout, true);
    case "lacak": return withData(() => vTrack(qs.kode || ""));
    case "faq": return withData(vInfo);
    case "masuk": return vAuth();
    case "akun": return vAccount(qs);
    default: show(`<div class="empty"><h2>${t("nf.title")}</h2><p>${t("nf.text")}</p><a class="btn" href="#/">${t("nf.back")}</a></div>`);
  }
}

/* ---------- Beranda ---------- */
function vHome() {
  const P = S.products, s = S.settings, m = freeMin();
  const feat = P.filter(p => p.label === "Bestseller").concat(P.filter(p => p.label !== "Bestseller")).slice(0, 4);
  const latest = P.slice().sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))).slice(0, 4);
  const ads = (m > 0 ? [{ promo: true, tipe: "info", judul: t("ad.free.title"), teks: t("ad.free.text", { min: rp(m) }), tautan: "#/produk", tombol: t("hero.cta") }] : []).concat(S.ads || []);
  show(`<section class="hero"><div><h1>${esc(s.nama_toko || "Cacutie Style")}</h1>
    <p style="font-size:1.15rem">${esc(s.slogan || "Your Style, Your Story.")}<br><span class="muted">${t("hero.sub")}</span></p><a class="btn" href="#/produk">${t("hero.cta")}</a></div>
    <div class="art"><img src="assets/logo.svg" alt="${esc(t("logo.alt"))}"></div></section>
  ${ads.length ? `<section class="section"><div class="ads">${ads.map(adHtml).join("")}</div></section>` : ""}
  <section class="section"><h2>${t("home.cats")}</h2><div class="cats"><a class="cat" href="#/produk?kat=Wanita">${t("nav.women")}</a><a class="cat" href="#/produk?kat=Pria">${t("nav.men")}</a><a class="cat" href="#/produk?kat=Aksesori">${t("nav.acc")}</a></div></section>
  <section class="section"><h2>${t("home.featured")}</h2><div class="grid">${feat.map(pcard).join("")}</div></section>
  <section class="section"><h2>${t("home.latest")}</h2><div class="grid">${latest.map(pcard).join("")}</div></section>
  <section class="section"><h2>${t("home.why")}</h2><div class="why">
    <div class="card"><h3>${t("why.1.t")}</h3><p class="muted">${t("why.1.d")}</p></div>
    <div class="card"><h3>${t("why.2.t")}</h3><p class="muted">${t("why.2.d")}</p></div>
    <div class="card"><h3>${t("why.3.t")}</h3><p class="muted">${t("why.3.d")}</p></div></div></section>`);
}

/* ---------- Katalog ---------- */
function vCatalog(qs) {
  const f = { q: qs.q || "", kat: qs.kat || "", urut: qs.urut || "", harga: qs.harga || "", stok: qs.stok === "1" };
  const o = (v, label, cur) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;
  show(`<section class="section"><h1>${t("nav.all")}</h1><div class="filters">
    <div><label for="fq">${t("cat.search")}</label><input id="fq" type="search" value="${esc(f.q)}" placeholder="${esc(t("cat.search.ph"))}"></div>
    <div><label for="fkat">${t("cat.category")}</label><select id="fkat">${o("", t("cat.all"), f.kat)}${o("Wanita", t("nav.women"), f.kat)}${o("Pria", t("nav.men"), f.kat)}${o("Aksesori", t("nav.acc"), f.kat)}</select></div>
    <div><label for="fharga">${t("cat.price")}</label><select id="fharga">${o("", t("cat.price.all"), f.harga)}${o("0-100000", t("cat.price.1"), f.harga)}${o("100000-200000", t("cat.price.2"), f.harga)}${o("200000-", t("cat.price.3"), f.harga)}</select></div>
    <div><label for="furut">${t("cat.sort")}</label><select id="furut">${o("", t("cat.sort.new"), f.urut)}${o("murah", t("cat.sort.low"), f.urut)}${o("mahal", t("cat.sort.high"), f.urut)}</select></div>
    <label class="chk"><input type="checkbox" id="fstok" ${f.stok ? "checked" : ""}> ${t("cat.instock")}</label></div>
    <p class="muted" id="count" aria-live="polite"></p><div id="grid"></div></section>`);
  function paint() {
    f.q = $("#fq").value.trim(); f.kat = $("#fkat").value; f.harga = $("#fharga").value; f.urut = $("#furut").value; f.stok = $("#fstok").checked;
    const l = S.products.filter(p => {
      if (f.kat && p.kategori !== f.kat) return false;
      if (f.stok && p.stok_total <= 0) return false;
      if (f.q && (p.nama + " " + p.sku).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.harga) { const r = f.harga.split("-"), lo = Number(r[0]) || 0, hi = r[1] ? Number(r[1]) : Infinity; if (p.harga < lo || p.harga >= hi) return false; }
      return true;
    });
    if (f.urut === "murah") l.sort((a, b) => a.harga - b.harga); else if (f.urut === "mahal") l.sort((a, b) => b.harga - a.harga);
    else l.sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
    $("#count").textContent = t("cat.count", { n: l.length });
    $("#grid").innerHTML = l.length ? `<div class="grid">${l.map(pcard).join("")}</div>` : `<div class="empty"><h2>${t("cat.none")}</h2><p>${t("cat.none.d")}</p><button class="btn ghost" id="reset">${t("cat.reset")}</button></div>`;
    const r = $("#reset"); if (r) r.onclick = () => { $("#fq").value = ""; $("#fkat").value = ""; $("#fharga").value = ""; $("#furut").value = ""; $("#fstok").checked = false; paint(); };
    const q = []; if (f.q) q.push("q=" + encodeURIComponent(f.q)); if (f.kat) q.push("kat=" + encodeURIComponent(f.kat)); if (f.harga) q.push("harga=" + f.harga); if (f.urut) q.push("urut=" + f.urut); if (f.stok) q.push("stok=1");
    history.replaceState(null, "", "#/produk" + (q.length ? "?" + q.join("&") : "")); markNav();
  }
  ["fq", "fkat", "fharga", "furut", "fstok"].forEach(id => $("#" + id).addEventListener(id === "fq" ? "input" : "change", paint));
  paint();
}

/* ---------- Detail produk ---------- */
function vDetail(id) {
  const p = S.products.find(x => x.id === id);
  if (!p) return show(`<div class="empty"><h2>${t("d.gone")}</h2><p>${t("d.gone.d")}</p><a class="btn" href="#/produk">${t("d.back")}</a></div>`);
  const colors = [...new Set(p.varian.map(v => v.warna))], sizes = [...new Set(p.varian.map(v => v.ukuran))];
  const sel = { w: colors.length === 1 ? colors[0] : "", u: sizes.length === 1 ? sizes[0] : "", qty: 1 };
  const find = (w, u) => p.varian.find(v => v.warna === w && v.ukuran === u);
  const askText = t("wa.ask.product", { name: p.nama, sku: p.sku });
  show(`<section class="section"><p><a href="#/produk">&larr; ${t("d.back")}</a></p><div class="detail">
    <div>${galleryHtml(imgList(p), p.nama)}</div>
    <div><h1 style="font-size:1.8rem">${esc(p.nama)}</h1><p class="muted">SKU: ${esc(p.sku)} - ${esc(t("cat." + p.kategori))}</p>
      <p class="price" style="font-size:1.5rem">${rp(p.harga)}</p><p>${esc(p.deskripsi)}</p><div id="opts"></div>
      <div class="notice"><b>${t("d.shipping")}:</b> ${t("d.shipping.d")}${freeMin() > 0 ? " " + esc(t("annc.free", { min: rp(freeMin()) })) : ""}</div>
      ${waA(askText, "&#128172; " + t("wa.ask.btn"), "btn ghost")}</div></div>
    <div class="section"><h2>${t("d.reviews")}</h2><div id="rev"><div class="loading"><div class="spin"></div>${t("d.reviews.load")}</div></div></div></section>`);
  bindGallery(app); updateFab(askText);
  function paint() {
    const cv = sel.w && sel.u ? find(sel.w, sel.u) : null, avail = cv ? cv.stok - inCart(cv.id) : 0;
    if (sel.qty > Math.max(avail, 1)) sel.qty = Math.max(avail, 1);
    const cOk = c => p.varian.some(v => v.warna === c && (!sel.u || v.ukuran === sel.u) && v.stok > 0);
    const uOk = u => p.varian.some(v => v.ukuran === u && (!sel.w || v.warna === sel.w) && v.stok > 0);
    const hasSize = !(sizes.length === 1 && /^(all size|-)$/i.test(sizes[0]));
    let info;
    if (!cv) info = t(hasSize ? "d.pick.both" : "d.pick.color");
    else if (cv.stok <= 0) info = t("d.variant.out");
    else info = t("d.stock", { n: cv.stok }) + (inCart(cv.id) ? " " + t("d.incart", { n: inCart(cv.id) }) : "");
    $("#opts").innerHTML = `<div><label>${t("d.color")}</label><div class="opts">${colors.map(c => `<button class="opt" data-w="${esc(c)}" aria-pressed="${sel.w === c}" ${cOk(c) ? "" : "disabled"}>${esc(c)}</button>`).join("")}</div></div>
      ${hasSize ? `<div><label>${t("d.size")}</label><div class="opts">${sizes.map(u => `<button class="opt" data-u="${esc(u)}" aria-pressed="${sel.u === u}" ${uOk(u) ? "" : "disabled"}>${esc(u)}</button>`).join("")}</div></div>` : ""}
      <p class="muted" aria-live="polite">${esc(info)}</p>
      <div class="qty" role="group" aria-label="${esc(t("d.qty"))}"><button data-q="-1" aria-label="-">-</button><span>${sel.qty}</span><button data-q="1" aria-label="+">+</button></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0"><button class="btn" data-add="cart" ${p.stok_total <= 0 ? "disabled" : ""}>${t("d.add")}</button><button class="btn ghost" data-add="buy" ${p.stok_total <= 0 ? "disabled" : ""}>${t("d.buy")}</button></div>
      ${p.stok_total <= 0 ? notice(t("d.allout"), "warn") : ""}`;
  }
  $("#opts").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.w !== undefined) sel.w = sel.w === b.dataset.w && colors.length > 1 ? "" : b.dataset.w;
    else if (b.dataset.u !== undefined) sel.u = sel.u === b.dataset.u && sizes.length > 1 ? "" : b.dataset.u;
    else if (b.dataset.q) { const cv = sel.w && sel.u ? find(sel.w, sel.u) : null, max = cv ? cv.stok - inCart(cv.id) : 1; sel.qty = Math.min(Math.max(1, sel.qty + Number(b.dataset.q)), Math.max(max, 1)); if (cv && sel.qty >= max && b.dataset.q === "1") toast(t("d.maxqty")); }
    else if (b.dataset.add) {
      const cv = sel.w && sel.u ? find(sel.w, sel.u) : null;
      if (!cv) return toast(t(sizes.length > 1 ? "d.pick.first.both" : "d.pick.first.color"), "error");
      if (cv.stok - inCart(cv.id) < sel.qty) return toast(cv.stok <= 0 ? t("d.variant.out") : t("d.over", { n: cv.stok }), "error");
      addToCart(cv.id, sel.qty);
      if (b.dataset.add === "buy") { location.hash = "#/checkout"; return; }
      toast(t("d.added", { name: p.nama, w: cv.warna, u: cv.ukuran }), "ok"); sel.qty = 1;
    }
    paint();
  });
  paint();
  A.reviews(p.id).then(r => {
    $("#rev").innerHTML = `<p>${r.jumlah ? `<span class="stars">${stars(r.rata_rata)}</span> ${t("d.rating", { r: r.rata_rata, n: r.jumlah })}` : t("d.noreviews")}</p>
      ${r.ulasan.map(u => `<div class="card" style="margin-bottom:10px"><b>${esc(u.nama)}</b> <span class="stars">${stars(u.rating)}</span> ${u.terverifikasi ? `<span class="pill">${t("d.verified")}</span>` : ""} <span class="muted">${esc(u.tanggal)}</span><p style="margin:6px 0 0">${esc(u.komentar)}</p></div>`).join("")}
      <p class="muted">${t("d.review.hint_h")}</p>`;
  }).catch(e => { $("#rev").innerHTML = notice(t("d.reviews.err") + " " + em(e), "warn"); });
}

/* ---------- Keranjang ---------- */
function reconcile() { // cocokkan keranjang dengan data terbaru dari database
  const msgs = [], lines = []; let sub = 0, blocked = false; const cart = getCart();
  cart.forEach(it => {
    const r = S.idx[it.vid];
    if (!r) { lines.push({ it, issue: t("cart.gone") }); blocked = true; return; }
    if (r.v.stok <= 0) { lines.push({ it, r, issue: t("cart.soldout") }); blocked = true; return; }
    if (it.qty > r.v.stok) { msgs.push(t("cart.adjusted", { name: r.p.nama, w: r.v.warna, u: r.v.ukuran, n: r.v.stok })); it.qty = r.v.stok; }
    sub += r.p.harga * it.qty; lines.push({ it, r });
  });
  if (msgs.length) save(CART_KEY, cart);
  return { lines, sub, msgs, blocked };
}
function vCart() {
  const c = reconcile(), m = freeMin();
  if (!c.lines.length) return show(`<div class="empty"><h2>${t("cart.empty")}</h2><p>${t("cart.empty.d")}</p><a class="btn" href="#/produk">${t("cart.start")}</a></div>`);
  show(`<section class="section"><h1>${t("cart.title")}</h1>${c.msgs.map(x => notice(x, "warn")).join("")}<div class="layout2"><div class="card">
    ${c.lines.map(l => l.r ? `<div class="cartitem"><a class="pimg" href="#/produk/${encodeURIComponent(l.r.p.id)}">${imgHtml(l.r.p)}</a><div>
      <b>${esc(l.r.p.nama)}</b><div class="muted">SKU ${esc(l.r.p.sku)} - ${esc(l.r.v.warna)}, ${esc(l.r.v.ukuran)}</div><div>${rp(l.r.p.harga)} ${t("cart.each")}</div>
      ${l.issue ? notice(l.issue, "error") : ""}<div class="line"><div class="qty" role="group" aria-label="${esc(t("d.qty"))}"><button data-dec="${esc(l.it.vid)}" aria-label="-">-</button><span>${l.it.qty}</span><button data-inc="${esc(l.it.vid)}" aria-label="+">+</button></div>
      <b>${l.issue ? "" : rp(l.r.p.harga * l.it.qty)}</b><button class="link" data-del="${esc(l.it.vid)}">${t("cart.remove")}</button></div></div></div>`
      : `<div class="cartitem"><div></div><div>${notice(l.issue, "error")}<button class="link" data-del="${esc(l.it.vid)}">${t("cart.remove")}</button></div></div>`).join("")}</div>
    <aside class="card sum"><h2>${t("sum.title")}</h2><div><span>${t("sum.subtotal")}</span><b>${rp(c.sub)}</b></div>
      <div class="muted"><span>${t("sum.ship")}</span><span>${t("cart.ship.later")}</span></div>
      ${m > 0 ? `<p class="notice ${c.sub >= m ? "ok" : ""}" style="margin:10px 0 0">${c.sub >= m ? t("cart.free.ok") : t("cart.free.more", { n: rp(m - c.sub) })}</p>` : ""}
      <div style="display:grid;gap:10px;margin-top:14px"><a class="btn" href="#/checkout" ${c.blocked ? 'aria-disabled="true" id="goCo"' : ""}>${t("cart.checkout")}</a><a class="btn ghost" href="#/produk">${t("cart.continue")}</a></div>
      ${c.blocked ? `<p class="muted">${t("cart.blocked")}</p>` : ""}</aside></div></section>`);
  const go = $("#goCo"); if (go) go.addEventListener("click", e => e.preventDefault());
  app.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const cart = getCart(), it = cart.find(x => x.vid === (b.dataset.inc || b.dataset.dec || b.dataset.del)); if (!it) return;
    const r = S.idx[it.vid];
    if (b.dataset.del) { setCart(cart.filter(x => x.vid !== it.vid)); toast(t("cart.removed")); }
    else if (b.dataset.inc) { if (r && it.qty >= r.v.stok) return toast(t("cart.max", { n: r.v.stok }), "error"); it.qty++; setCart(cart); }
    else if (b.dataset.dec) { if (it.qty <= 1) return toast(t("cart.min")); it.qty--; setCart(cart); }
    vCart();
  };
}

/* ---------- Checkout (tamu atau akun) ---------- */
const normWa = v => { let d = String(v || "").replace(/[\s\-().+]/g, ""); if (/^0/.test(d)) d = "62" + d.slice(1); return /^62[1-9]\d{7,12}$/.test(d) ? d : null; };
function stepsBar(n) {
  return `<ol class="steps" aria-label="${esc(t("co.steps"))}">${["co.s1", "co.s2", "co.s3", "co.s4"].map((k, i) => `<li class="${i + 1 === n ? "on" : (i + 1 < n ? "done" : "")}" ${i + 1 === n ? 'aria-current="step"' : ""}>${i + 1}. ${t(k)}</li>`).join("")}</ol>`;
}
function vCheckout() {
  if (S.co.done && !getCart().length) return stepDone();
  const c = reconcile();
  if (!c.lines.length) return show(`<div class="empty"><h2>${t("co.empty")}</h2><p>${t("co.empty.d")}</p><a class="btn" href="#/produk">${t("cart.start")}</a></div>`);
  if (c.blocked || c.msgs.length) { toast(t(c.blocked ? "co.blocked" : "co.changed"), "error"); location.hash = "#/keranjang"; return; }
  S.co.step === 3 ? stepSummary(c) : stepForm();
}
function stepForm() {
  const f = Object.assign({ nama: S.cust ? S.cust.nama : "", wa: S.cust ? S.cust.whatsapp : "" }, S.co.form);
  show(`<section class="section"><h1>Checkout</h1>${stepsBar(2)}<div class="card" style="max-width:640px"><h2>${t("co.ship.title")}</h2>
    <p class="muted">${S.cust ? t("co.acct", { email: esc(S.cust.email) }) : t("co.guest_h")}</p>
    <div class="field" id="f-nama"><label for="nama">${t("co.name")}</label><input id="nama" maxlength="60" autocomplete="name" value="${esc(f.nama || "")}"><div class="err"></div></div>
    <div class="field" id="f-wa"><label for="wa">${t("co.wa")}</label><input id="wa" inputmode="tel" autocomplete="tel" placeholder="081234567890" value="${esc(f.wa || "")}"><div class="err"></div></div>
    <div class="field" id="f-alamat"><label for="alamat">${t("co.addr")}</label><textarea id="alamat" maxlength="300" autocomplete="street-address">${esc(f.alamat || "")}</textarea><div class="err"></div></div>
    <div class="field" id="f-kota"><label for="kota">${t("co.city")}</label><input id="kota" maxlength="60" value="${esc(f.kota || "")}"><div class="err"></div></div>
    <div class="field"><label for="cat">${t("co.note")}</label><textarea id="cat" maxlength="200">${esc(f.catatan || "")}</textarea></div>
    <div class="field" id="f-kurir"><label for="kirim">${t("co.courier")}</label><select id="kirim"><option value="">${t("co.courier.pick")}</option>${(S.couriers || []).map(k => `<option value="${esc(k.id)}" ${f.kurir === k.id ? "selected" : ""}>${esc(k.nama)} - ${rp(k.tarif)}${k.estimasi ? " (" + esc(k.estimasi) + ")" : ""}</option>`).join("")}</select><div class="err"></div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn ghost" href="#/keranjang">${t("co.back")}</a><button class="btn" id="next">${t("co.next")}</button></div></div></section>`);
  $("#next").onclick = () => {
    const v = { nama: $("#nama").value.trim(), wa: $("#wa").value.trim(), alamat: $("#alamat").value.trim(), kota: $("#kota").value.trim(), catatan: $("#cat").value.trim(), kurir: $("#kirim").value };
    let bad = false; const chk = (id, ok, msg) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : msg; if (!ok && !bad) { bad = true; $("input,textarea,select", el).focus(); } };
    chk("f-nama", v.nama.length >= 2, t("v.name")); chk("f-wa", !!normWa(v.wa), t("v.wa")); chk("f-alamat", v.alamat.length >= 10, t("v.addr")); chk("f-kota", v.kota.length >= 2, t("v.city")); chk("f-kurir", !!v.kurir, t("v.courier"));
    if (bad) return;
    S.co.form = v; S.co.step = 3; vCheckout();
  };
}
function stepSummary(c) {
  const f = S.co.form, kr = courier(f.kurir);
  if (!kr) { S.co.step = 2; toast(t("co.courier.gone"), "error"); return stepForm(); }
  const ong = shipFor(c.sub, kr), tot = c.sub + ong, qrisOn = !!S.settings.qris_gambar;
  if (S.co.metode === "QRIS" && !qrisOn) S.co.metode = "Transfer Bank";
  const pay = (v, k, off) => `<label class="pay ${off ? "dis" : ""}"><input type="radio" name="pay" value="${v}" ${S.co.metode === v ? "checked" : ""} ${off ? "disabled" : ""}><span><b>${t(k)}</b><br><span class="muted">${off ? t("pay.qris.off") : t(k + ".d")}</span></span></label>`;
  show(`<section class="section"><h1>Checkout</h1>${stepsBar(3)}<div class="layout2"><div>
    <div class="card" style="margin-bottom:16px"><h2>${t("co.shipto")}</h2><p style="margin:0"><b>${esc(f.nama)}</b> - ${esc(f.wa)}<br>${esc(f.alamat)}, ${esc(f.kota)}<br><span class="muted">${t("co.courier")}: ${esc(kr.nama)}</span>${f.catatan ? `<br><span class="muted">${t("co.note.s")}: ${esc(f.catatan)}</span>` : ""}</p><button class="link" id="edit">${t("co.edit")}</button></div>
    <div class="card"><h2>${t("pay.title")}</h2><p class="muted">${t("pay.manual")}</p>${pay("Transfer Bank", "pay.bank")}${pay("QRIS", "pay.qris", !qrisOn)}${pay("Konfirmasi via WhatsApp", "pay.wa")}</div></div>
    <aside class="card sum"><h2>${t("sum.order")}</h2>${c.lines.map(l => `<div><span>${esc(l.r.p.nama)}<br><span class="muted">${esc(l.r.v.warna)}, ${esc(l.r.v.ukuran)} x ${l.it.qty}</span></span><span>${rp(l.r.p.harga * l.it.qty)}</span></div>`).join("")}
      <div><span>${t("sum.subtotal")}</span><span>${rp(c.sub)}</span></div><div><span>${t("sum.ship")} (${esc(kr.nama)})</span><span>${ong ? rp(ong) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(tot)}</span></div>
      ${freeMin() > 0 && c.sub < freeMin() ? `<p class="notice">${t("cart.free.more", { n: rp(freeMin() - c.sub) })}</p>` : ""}<p class="muted">${t("sum.server")}</p><div id="coMsg"></div>
      <div style="display:grid;gap:10px"><button class="btn" id="place" data-loading="${esc(t("co.placing"))}">${t("co.place")}</button><a class="btn ghost" href="#/keranjang">${t("co.editcart")}</a></div></aside></div></section>`);
  $("#edit").onclick = () => { S.co.step = 2; vCheckout(); };
  $$("input[name=pay]").forEach(r => { r.onchange = () => { S.co.metode = r.value; }; });
  $("#place").onclick = () => {
    S.co.key = S.co.key || A.newKey(); // kunci sama dipakai ulang saat coba lagi, jadi tidak membuat pesanan ganda
    const body = { nama: f.nama, whatsapp: f.wa, alamat: f.alamat, kota: f.kota, catatan: f.catatan, kurir: f.kurir, metode_bayar: S.co.metode, client_key: S.co.key, items: c.lines.map(l => ({ variant_id: l.it.vid, jumlah: l.it.qty })) };
    A.busy($("#place"), () => A.createOrder(body)).then(res => {
      if (!res) return;
      setCart([]); S.co.done = res; S.co.step = 2; S.co.key = null; S.co.form = {};
      const o = load(ORD_KEY, []); o.unshift({ kode: res.kode, t: Date.now() }); save(ORD_KEY, o.slice(0, 10));
      stepDone();
    }).catch(e => {
      let m = em(e); if (e.code === "TIMEOUT") m += " " + t("co.timeout");
      if (e.code === "OUT_OF_STOCK" || e.code === "UNAVAILABLE") { toast(m, "error"); S.products = null; location.hash = "#/keranjang"; return; }
      $("#coMsg").innerHTML = notice(m, "error");
    });
  };
}
function itemsTable(o) { return `<div class="tablewrap"><table><thead><tr><th>${t("tb.product")}</th><th>${t("tb.qty")}</th><th>${t("tb.subtotal")}</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.nama)}<br><span class="muted">${esc(i.warna)}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td></tr>`).join("")}</tbody></table></div>`; }
function stepDone() {
  const o = S.co.done;
  const proof = t("wa.proof", { kode: o.kode, total: rp(o.total) });
  const payBox = o.metode_bayar === "QRIS"
    ? `<div class="notice"><b>${t("done.qris")}</b><p>${t("done.qris.amount", { total: rp(o.total) })}</p>${o.qris ? `<img class="qris" src="${esc(imgSrc(o.qris))}" alt="QRIS">` : ""}<p class="muted" style="margin:0">${t("done.qris.note")}</p></div>`
    : o.metode_bayar === "Transfer Bank" ? `<div class="notice"><b>${t("done.bank")}</b><br>${esc(o.info_transfer || t("done.bank.none"))}<br>${t("done.bank.note")}</div>`
    : `<div class="notice"><b>${t("done.wa")}</b><br>${t("done.wa.note")}</div>`;
  show(`<section class="section"><h1>${t("done.title")}</h1>${stepsBar(4)}<div class="card" style="max-width:680px">
    <p>${t("done.code")}</p><p><span class="code" id="kode">${esc(o.kode)}</span></p><button class="btn sm ghost" id="copy">${t("done.copy")}</button>
    <p style="margin-top:16px">${t("done.status")}: <span class="pill">${esc(st(o.status))}</span></p>${itemsTable(o)}
    <div class="sum"><div><span>${t("sum.subtotal")}</span><span>${rp(o.subtotal)}</span></div><div><span>${t("sum.ship")} (${esc(o.pengiriman)})</span><span>${o.ongkir ? rp(o.ongkir) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(o.total)}</span></div></div>
    ${payBox}<div style="display:flex;gap:10px;flex-wrap:wrap">${o.metode_bayar === "Transfer Bank" || o.metode_bayar === "QRIS" ? waA(proof, t("done.sendproof"), "btn") : waA(proof, t("done.chat"), "btn")}
    <a class="btn ghost" href="#/lacak?kode=${encodeURIComponent(o.kode)}">${t("done.track")}</a><a class="btn ghost" href="#/produk">${t("cart.continue")}</a></div></div></section>`);
  $("#copy").onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(o.kode) : Promise.reject()).then(() => toast(t("done.copied"), "ok")).catch(() => toast(t("done.copy.manual") + " " + o.kode)); };
}

/* ---------- Pelacakan pesanan (linimasa seperti aplikasi pesan-antar) ---------- */
function timeline(o) {
  const log = o.riwayat || [], when = (j, n) => { const r = log.filter(x => x.jenis === j && x.nilai === n)[0]; return r ? r.waktu : ""; };
  const cancelled = o.status === "Dibatalkan", idx = { "Menunggu pembayaran": 0, "Menunggu konfirmasi": 0, "Diproses": 2, "Dikemas": 3, "Dikirim": 4, "Selesai": 5 }[o.status] || 0;
  const paid = o.status_bayar === "Sudah dibayar" || idx >= 2;
  const steps = [
    { k: "created", done: true, time: o.dibuat },
    { k: "paid", done: paid, time: when("bayar", "Sudah dibayar") },
    { k: "process", done: idx > 2, time: when("status", "Diproses") },
    { k: "pack", done: idx > 3, time: when("status", "Dikemas") },
    { k: "ship", done: idx > 4, time: when("status", "Dikirim") },
    { k: "done", done: idx === 5, time: when("status", "Selesai") }
  ];
  if (!cancelled) { const cur = steps.find(s => !s.done); if (cur) cur.cur = true; }
  const detail = s => s.k === "ship" && (s.done || s.cur) && (o.pengiriman || o.resi) ? `<div class="muted">${esc(o.pengiriman || "")}${o.resi ? " - " + t("tl.resi") + ": " + esc(o.resi) : ""}</div>` : "";
  const li = s => `<li class="${cancelled && s.k !== "created" && !s.done ? "todo" : (s.done ? "done" : (s.cur ? "cur" : "todo"))}"><span class="dot" aria-hidden="true"></span><div><b>${t("tl." + s.k + (s.cur ? ".now" : ""))}</b>${s.time ? `<span class="muted"> ${fmtT(s.time)}</span>` : ""}${detail(s)}</div></li>`;
  const cancelLi = cancelled ? `<li class="cancel"><span class="dot" aria-hidden="true"></span><div><b>${t("tl.cancel")}</b><span class="muted"> ${fmtT(when("status", "Dibatalkan"))}</span></div></li>` : "";
  return `<ol class="tl" aria-label="${esc(t("tl.title"))}">${steps.map(li).join("")}${cancelLi}</ol><p class="muted" style="font-size:.82rem">${t("tl.note")}</p>`;
}
function orderResult(o) {
  const slug = SLUG[o.status] || "x";
  return `<div class="card" style="max-width:680px"><div class="headline ${slug}"><small>${t("tr.order")} ${esc(o.kode)}</small><b>${t("hl." + slug)}</b><span>${t("hl." + slug + ".d")}</span></div>
    ${timeline(o)}<p>${t("tr.payment")}: <span class="pill">${esc(pst(o.status_bayar))}</span> <span class="pill">${esc(o.metode_bayar)}</span></p><p class="muted">${t("tr.dest")}: ${esc(o.kota)}</p>
    <div class="tablewrap"><table><thead><tr><th>${t("tb.product")}</th><th>${t("tb.qty")}</th><th>${t("tb.subtotal")}</th><th>${t("tb.review")}</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.nama)}<br><span class="muted">${esc(i.warna)}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td><td>${o.bisa_ulasan ? (i.sudah_ulasan ? `<span class="pill">${t("rv.done")}</span>` : `<button class="btn sm ghost" data-rv="${esc(i.product_id)}" data-n="${esc(i.nama)}">${t("rv.give")}</button>`) : "-"}</td></tr>`).join("")}</tbody></table></div>
    <div class="sum"><div><span>${t("sum.ship")} (${esc(o.pengiriman)})</span><span>${o.ongkir ? rp(o.ongkir) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(o.total)}</span></div></div>
    ${o.bisa_ulasan ? "" : `<p class="muted">${t("rv.later")}</p>`}<div style="margin-top:10px">${waA(t("wa.ask.order", { kode: o.kode }), "&#128172; " + t("wa.order.btn"), "btn sm ghost")}</div><div id="rvBox"></div></div>`;
}
// ctx = { kode, wa } untuk tamu, atau { kode } untuk pelanggan yang login
function bindReviews(box, ctx) {
  box.onclick = e => {
    const b = e.target.closest("button[data-rv]"); if (!b) return;
    $("#rvBox").innerHTML = `<div class="card" style="margin-top:14px;background:var(--cream)"><h3>${t("rv.for")} ${esc(b.dataset.n)}</h3>
      <div class="field" id="r-nama"><label for="rvName">${t("rv.name")}</label><input id="rvName" maxlength="30" autocomplete="nickname" value="${esc(S.cust ? S.cust.nama.split(" ")[0] : "")}"><div class="err"></div></div>
      <div class="field" id="r-rating"><label for="rvRating">${t("rv.rating")}</label><select id="rvRating"><option value="">${t("rv.pick")}</option><option value="5">${t("rv.r5")}</option><option value="4">${t("rv.r4")}</option><option value="3">${t("rv.r3")}</option><option value="2">${t("rv.r2")}</option><option value="1">${t("rv.r1")}</option></select><div class="err"></div></div>
      <div class="field" id="r-text"><label for="rvText">${t("rv.text")}</label><textarea id="rvText" maxlength="500"></textarea><div class="err"></div></div>
      <div id="rvMsg"></div><button class="btn" id="rvSend" data-loading="${esc(t("rv.sending"))}">${t("rv.send")}</button></div>`;
    $("#rvName").focus();
    $("#rvSend").onclick = () => {
      const n = $("#rvName").value.trim(), r = $("#rvRating").value, x = $("#rvText").value.trim(); let bad = false;
      const chk = (id, ok, m) => { const f = $("#" + id); f.classList.toggle("bad", !ok); $(".err", f).textContent = ok ? "" : m; if (!ok) bad = true; };
      chk("r-nama", n.length >= 2, t("rv.v.name")); chk("r-rating", !!r, t("rv.v.rating")); chk("r-text", x.length >= 5, t("rv.v.text"));
      if (bad) return;
      A.busy($("#rvSend"), () => A.submitReview({ kode: ctx.kode, whatsapp: ctx.wa || "", product_id: b.dataset.rv, nama: n, rating: Number(r), komentar: x })).then(res => {
        if (!res) return;
        $("#rvBox").innerHTML = notice(lang === "id" ? res.message : t("rv.thanks"), "ok");
        const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = t("rv.done"); b.replaceWith(pill);
      }).catch(er => { $("#rvMsg").innerHTML = notice(em(er), "error"); });
    };
  };
}
function vTrack(prefill) {
  const recent = load(ORD_KEY, []);
  show(`<section class="section"><h1>${t("nav.track")}</h1>${S.cust ? `<p class="notice">${t("tr.loggedin_h", { name: esc(S.cust.nama) })}</p>` : ""}
    <div class="card" style="max-width:560px"><p class="muted">${t("tr.intro")}</p>
    <div class="field" id="t-kode"><label for="tk">${t("tr.code")}</label><input id="tk" maxlength="30" placeholder="CS260101-AB3XY" value="${esc(prefill)}"><div class="err"></div></div>
    <div class="field" id="t-wa"><label for="tw">${t("co.wa")}</label><input id="tw" inputmode="tel" placeholder="081234567890" value="${esc(S.cust ? S.cust.whatsapp : "")}"><div class="err"></div></div>
    ${recent.length ? `<p class="muted">${t("tr.recent")}: ${recent.map(r => `<button class="link" data-k="${esc(r.kode)}">${esc(r.kode)}</button>`).join(", ")}</p>` : ""}
    <div id="tMsg"></div><button class="btn" id="tgo" data-loading="${esc(t("tr.searching"))}">${t("tr.check")}</button></div><div id="tRes" style="margin-top:20px"></div></section>`);
  $$("[data-k]").forEach(b => { b.onclick = () => { $("#tk").value = b.dataset.k; $("#tw").focus(); }; });
  $("#tgo").onclick = () => {
    const k = $("#tk").value.trim().toUpperCase(), w = $("#tw").value.trim(); let bad = false;
    const chk = (id, ok, m) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : m; if (!ok) bad = true; };
    chk("t-kode", k.length >= 5, t("v.code")); chk("t-wa", !!normWa(w), t("v.wa"));
    if (bad) return;
    $("#tMsg").innerHTML = ""; $("#tRes").innerHTML = "";
    A.busy($("#tgo"), () => A.trackOrder(k, w)).then(o => { if (!o) return; $("#tRes").innerHTML = orderResult(o); bindReviews($("#tRes"), { kode: k, wa: w }); updateFab(t("wa.ask.order", { kode: o.kode })); })
      .catch(e => { $("#tMsg").innerHTML = notice(em(e), "error"); });
  };
  if (prefill && S.cust) { /* pelanggan yang login: buka detail dari Akun Saya */ }
}

/* ---------- Akun pelanggan (opsional) ---------- */
function updateAcct() {
  const a = $("#navAcct"); if (a) { a.textContent = S.cust ? t("nav.account") : t("nav.login"); a.href = S.cust ? "#/akun" : "#/masuk"; }
  $("#gAcctSub").textContent = S.cust ? t("gate.acct.as", { name: S.cust.nama }) : t("gate.acct.d");
  const bp = $("#btnProfile"); if (bp) bp.classList.toggle("on", !!S.cust);
}
function vAuth() {
  if (S.cust) { location.hash = "#/akun"; return; }
  const forms = {
    in: `<div class="field" id="a-email"><label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email"><div class="err"></div></div>
      <div class="field" id="a-pw"><label for="aPw">${t("au.pw")}</label><input id="aPw" type="password" autocomplete="current-password"><div class="err"></div></div>
      <div id="aMsg"></div><button class="btn" id="aGo" data-loading="${esc(t("au.checking"))}">${t("au.signin")}</button>`,
    up: `<div class="field" id="a-nama"><label for="aNama">${t("au.name")}</label><input id="aNama" maxlength="60" autocomplete="name"><div class="err"></div></div>
      <div class="field" id="a-wa"><label for="aWa">${t("co.wa")}</label><input id="aWa" inputmode="tel" placeholder="081234567890" autocomplete="tel"><div class="err"></div></div>
      <div class="field" id="a-email"><label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email"><div class="err"></div></div>
      <div class="field" id="a-pw"><label for="aPw">${t("au.pw.new")}</label><input id="aPw" type="password" autocomplete="new-password"><div class="err"></div></div>
      <div class="field" id="a-pw2"><label for="aPw2">${t("au.pw2")}</label><input id="aPw2" type="password" autocomplete="new-password"><div class="err"></div></div>
      <div id="aMsg"></div><button class="btn" id="aGo" data-loading="${esc(t("au.creating"))}">${t("au.create")}</button>`
  };
  let tab = "in";
  show(`<section class="section"><div class="card" style="max-width:480px;margin:0 auto"><h1 style="font-size:1.6rem">${t("au.title")}</h1><p class="muted">${t("au.optional")}</p>
    <div class="admin-tabs" role="tablist"><button role="tab" data-t="in">${t("au.signin")}</button><button role="tab" data-t="up">${t("au.create")}</button></div>
    <div id="authBox"></div><p style="margin:16px 0 0"><a href="#/">${t("au.guest")}</a></p></div></section>`);
  let bad = false;
  const chk = (id, ok, m) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : m; if (!ok) bad = true; };
  const done = r => { if (!r) return; S.cust = r.profil; updateAcct(); toast(t("au.welcome", { name: r.profil.nama }), "ok"); location.hash = "#/"; };
  const isMail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  function login() {
    bad = false; const e = $("#aEmail").value.trim(), p = $("#aPw").value;
    chk("a-email", isMail(e), t("v.email")); chk("a-pw", !!p, t("v.pw.fill")); if (bad) return;
    A.busy($("#aGo"), () => A.cust.login(e, p)).then(done).catch(er => { $("#aMsg").innerHTML = notice(em(er), "error"); });
  }
  function register() {
    bad = false; const n = $("#aNama").value.trim(), w = $("#aWa").value.trim(), e = $("#aEmail").value.trim(), p = $("#aPw").value, p2 = $("#aPw2").value;
    chk("a-nama", n.length >= 2, t("v.name")); chk("a-wa", !!normWa(w), t("v.wa")); chk("a-email", isMail(e), t("v.email")); chk("a-pw", p.length >= 8 && p.length <= 64, t("v.pw.len")); chk("a-pw2", p === p2, t("v.pw.same")); if (bad) return;
    A.busy($("#aGo"), () => A.cust.register({ nama: n, whatsapp: w, email: e, password: p })).then(done).catch(er => { $("#aMsg").innerHTML = notice(em(er), "error"); });
  }
  function paint() {
    $$("[data-t]").forEach(b => b.setAttribute("aria-selected", b.dataset.t === tab));
    $("#authBox").innerHTML = forms[tab]; $("#aGo").onclick = tab === "in" ? login : register;
    $$("#authBox input").forEach(i => { i.onkeydown = ev => { if (ev.key === "Enter") $("#aGo").click(); }; });
  }
  $$("[data-t]").forEach(b => { b.onclick = () => { tab = b.dataset.t; paint(); }; });
  paint();
}
function doLogout() { return A.cust.logout().then(() => { S.cust = null; updateAcct(); closeAll(); toast(t("au.out"), "ok"); location.hash = "#/"; if (location.hash === "#/") route(); }); }
function vAccount(qs) {
  if (!S.cust) { location.hash = "#/masuk"; return; }
  show(`<section class="section"><h1>${t("nav.account")}</h1><div class="card" style="max-width:680px;margin-bottom:18px"><p style="margin:0"><b>${esc(S.cust.nama)}</b><br>${esc(S.cust.email)}<br>WhatsApp: +${esc(S.cust.whatsapp)}</p>
    <button class="btn sm ghost" id="out" style="margin-top:12px">${t("au.signout")}</button></div>
    <h2>${t("ac.orders")}</h2><div id="mine"><div class="loading"><div class="spin"></div>${t("loading")}</div></div><div id="mineRes" style="margin-top:16px"></div></section>`);
  $("#out").onclick = doLogout;
  const open = (kode, btn) => A.busy(btn, () => A.trackOrder(kode, "")).then(o => { if (!o) return; $("#mineRes").innerHTML = orderResult(o); bindReviews($("#mineRes"), { kode: o.kode }); updateFab(t("wa.ask.order", { kode: o.kode })); $("#mineRes").scrollIntoView({ behavior: "smooth" }); }).catch(er => toast(em(er), "error"));
  A.cust.orders().then(list => {
    $("#mine").innerHTML = list.length ? `<div class="card tablewrap" style="max-width:680px"><table><thead><tr><th>${t("ac.no")}</th><th>${t("ac.date")}</th><th>${t("sum.total")}</th><th>${t("done.status")}</th><th></th></tr></thead><tbody>${list.map(o => `<tr><td>${esc(o.kode)}</td><td>${esc(String(o.dibuat).slice(0, 10))}</td><td>${rp(o.total)}</td><td><span class="pill">${esc(st(o.status))}</span></td><td><button class="btn sm ghost" data-k="${esc(o.kode)}">${t("ac.detail")}</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card" style="max-width:680px"><p class="muted" style="margin:0">${t("ac.none")}</p></div>`;
    if (qs && qs.kode) open(qs.kode, null);
  }).catch(e => { if (e.code === "UNAUTHORIZED") { S.cust = null; updateAcct(); location.hash = "#/masuk"; } else $("#mine").innerHTML = notice(em(e), "error"); });
  $("#mine").onclick = ev => { const b = ev.target.closest("button[data-k]"); if (b) open(b.dataset.k, b); };
}

/* ---------- Bantuan (FAQ) ---------- */
function vInfo() {
  const s = S.settings, wa = waNum();
  const contact = [wa ? "WhatsApp: +" + esc(wa) : "", s.email_toko ? "Email: " + esc(s.email_toko) : "", s.jam_operasional ? esc(s.jam_operasional) : ""].filter(Boolean);
  show(`<section class="section"><div class="card" style="max-width:760px"><h1>${t("nav.help")}</h1>
    ${[1, 2, 3, 4, 5, 6, 7].map(i => `<details ${i === 1 ? "open" : ""}><summary><b>${t("faq.q" + i)}</b></summary><p>${t("faq.a" + i)}</p></details>`).join("")}
    <h2>${t("f.contact")}</h2>${contact.length ? `<ul>${contact.map(c => `<li>${c}</li>`).join("")}</ul>` : ""}<p>${waA(t("wa.ask.general"), "&#128172; " + t("wa.contact"), "btn")}</p></div></section>`);
}

/* ---------- Panel profil (sidebar kanan) ---------- */
function openProfile() {
  const admin = !$("#admin").hidden, d = $("#profile"), body = $("#pBody");
  $("#overlay").hidden = false; d.hidden = false;
  if (admin) {
    $("#pTitle").textContent = "Admin";
    body.innerHTML = `<div class="pbox"><div class="avatar">A</div><div><b>Admin Cacutie Style</b><div class="muted">Mode admin (kunci bersama)</div></div></div>
      <p class="muted">Panel admin untuk mengelola produk, pesanan, jasa kirim, iklan, dan pengaturan toko. Data pelanggan hanya terlihat di rincian pesanan.</p>
      <div class="pact"><button class="btn" id="pShop">Lihat toko</button><button class="btn ghost" id="pGate">Ganti mode</button><button class="btn ghost" id="pOutAdm">Keluar admin</button></div>`;
    $("#pShop").onclick = () => { closeAll(); location.hash = "#/"; setMode("shop"); };
    $("#pGate").onclick = () => { closeAll(); setMode("gate"); };
    $("#pOutAdm").onclick = () => { closeAll(); $("#logout").click(); };
  } else if (S.cust) {
    $("#pTitle").textContent = t("p.title");
    const ini = esc((S.cust.nama || "?").trim().charAt(0).toUpperCase());
    body.innerHTML = `<div class="pbox"><div class="avatar">${ini}</div><div><b>${esc(S.cust.nama)}</b><div class="muted">${esc(S.cust.email)}</div><div class="muted">+${esc(S.cust.whatsapp)}</div></div></div>
      <div class="pact"><a class="btn" href="#/akun">${t("nav.account")}</a></div><h3>${t("p.history")}</h3><div id="pOrders"><div class="loading"><div class="spin"></div></div></div>
      <div class="pact"><button class="btn ghost" id="pOut">${t("au.signout")}</button><button class="link" id="pGate">${t("p.mode")}</button></div>`;
    $("#pOut").onclick = doLogout; $("#pGate").onclick = () => { closeAll(); setMode("gate"); };
    A.cust.orders().then(l => {
      $("#pOrders").innerHTML = l.length ? `<ul class="plist">${l.slice(0, 5).map(o => `<li><a href="#/akun?kode=${encodeURIComponent(o.kode)}"><b>${esc(o.kode)}</b><span class="muted">${esc(String(o.dibuat).slice(0, 10))} - ${rp(o.total)}</span><span class="pill">${esc(st(o.status))}</span></a></li>`).join("")}</ul>` : `<p class="muted">${t("ac.none")}</p>`;
    }).catch(e => { $("#pOrders").innerHTML = notice(em(e), "error"); });
  } else {
    $("#pTitle").textContent = t("p.title");
    body.innerHTML = `<div class="pbox"><div class="avatar">?</div><div><b>${t("p.guest")}</b><div class="muted">${t("p.guest.d")}</div></div></div>
      <div class="pact"><a class="btn" href="#/masuk">${t("p.login")}</a><a class="btn ghost" href="#/lacak">${t("nav.track")}</a><button class="link" id="pGate">${t("p.mode")}</button></div>`;
    $("#pGate").onclick = () => { closeAll(); setMode("gate"); };
  }
  $("#pClose").focus();
}
$("#profile").addEventListener("click", e => { if (e.target.closest("a")) closeAll(); });
$("#pClose").onclick = closeAll; $("#overlay").onclick = closeAll;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });
$("#btnProfile").onclick = openProfile; $("#admProfile").onclick = openProfile;
$("#btnMenu").onclick = () => { const o = !$("#nav").classList.contains("open"); closeAll(); if (o) { $("#nav").classList.add("open"); $("#overlay").hidden = false; $("#btnMenu").setAttribute("aria-expanded", "true"); } };
$("#nav").addEventListener("click", e => { if (e.target.closest("a")) closeAll(); });
$("#searchForm").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); location.hash = "#/produk" + (q ? "?q=" + encodeURIComponent(q) : ""); };

/* ---------- Mode: gerbang pilihan, toko, admin (satu tautan) ---------- */
function setMode(m) {
  $("#gate").hidden = m !== "gate"; $("#shop").hidden = m !== "shop"; $("#admin").hidden = m !== "admin"; closeAll();
  try { sessionStorage.setItem(MODE_KEY, m); } catch (e) {}
  window.scrollTo(0, 0);
  if (m === "shop") route(); else if (m === "admin") window.CSAdmin.start();
}
$("#gGuest").onclick = () => { if (location.hash === "" || location.hash === "#") location.hash = "#/"; setMode("shop"); };
$("#gAcct").onclick = () => { location.hash = S.cust ? "#/akun" : "#/masuk"; setMode("shop"); };
$("#gAdmin").onclick = () => setMode("admin");
$("#admShop").onclick = () => { location.hash = "#/"; setMode("shop"); };
$("#admGate").onclick = () => setMode("gate");
$("#skip").onclick = () => { (!$("#shop").hidden ? $("#app") : !$("#admin").hidden ? $("#adm") : $("#gGuest")).focus(); };
$$(".lang button").forEach(b => { b.onclick = () => setLang(b.dataset.l); });
window.addEventListener("hashchange", () => { route(); });

let startMode = "gate";
try { startMode = sessionStorage.getItem(MODE_KEY) || "gate"; } catch (e) {}
if (["gate", "shop", "admin"].indexOf(startMode) < 0) startMode = "gate";
applyStatic(); updateAcct(); updateBadge();
setMode(startMode);
if (A.cust.has()) { // pulihkan sesi akun tanpa menghambat tampilan awal
  A.cust.session().then(r => { S.cust = r.profil; updateAcct(); if (!$("#shop").hidden) route(); }).catch(() => {});
}
})();
