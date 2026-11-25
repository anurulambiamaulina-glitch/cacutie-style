/* app.js - Cacutie Style: gerbang, toko pelanggan, dan pemicu panel admin (satu tautan).
   Semua teks tampilan memakai t("kunci") dari js/lang.js (Indonesia / English). */
(function () {
"use strict";
const A = window.CSApi, L = window.CS_LANG;
const S = { banks: [], cust: null, couriers: [], ads: [], products: null, settings: {}, idx: {}, co: { step: 2, form: {}, metode: "Transfer Bank", key: null, done: null } };
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
// Teks data toko: pakai kolom *_en (diisi admin / terjemahan otomatis) saat bahasa English, jika kosong kembali ke Indonesia
const pick = (o, f) => (lang === "en" && o && o[f + "_en"]) ? o[f + "_en"] : (o ? (o[f] || "") : "");
const pn = p => pick(p, "nama"), pdsc = p => pick(p, "deskripsi");
const COLORS_EN = { hitam: "Black", putih: "White", cokelat: "Brown", coklat: "Brown", biru: "Blue", merah: "Red", hijau: "Green", kuning: "Yellow", abu: "Gray", "abu-abu": "Gray", emas: "Gold", perak: "Silver", krem: "Cream", "merah muda": "Pink", ungu: "Purple", oranye: "Orange" };
const cn = c => lang === "en" ? (COLORS_EN[String(c).trim().toLowerCase()] || c) : c;
const est = e => lang === "en" ? String(e).replace(/hari kerja/gi, "business days").replace(/hari/gi, "days") : e;
const pm = m => ({ "Transfer Bank": t("pay.bank"), "QRIS": "QRIS", "COD": t("pay.cod"), "Konfirmasi via WhatsApp": t("pay.wa") }[m] || m);
const pname = (pid, fb) => { const p = (S.products || []).find(x => x.id === pid); return p ? pn(p) : fb; };
function applyStatic() {
  document.documentElement.lang = lang; document.title = t("title");
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === lang));
  labelTheme();
}
/* ---------- Tema terang / gelap ---------- */
const THEME_KEY = "cs_theme";
const curTheme = () => document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
function labelTheme() { $$("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", b.dataset.themeSet === curTheme())); }
function applyTheme(th, persist) { document.documentElement.setAttribute("data-theme", th); if (persist) { try { localStorage.setItem(THEME_KEY, th); } catch (e) {} } labelTheme(); }
function setLang(l) {
  if (!L[l]) return; lang = l; save(LANG_KEY, l); applyStatic(); updateAcct(); renderAnnc(); renderFooter();
  if (!$("#shop").hidden) route();
}

/* ---------- UI dasar ---------- */
function toast(msg, type) { const el = document.createElement("div"); el.className = "toast " + (type || ""); el.textContent = msg; $("#toast").appendChild(el); setTimeout(() => el.remove(), type === "error" ? 6000 : 3500); }
let noScroll = false;
function show(html, full) { app.onclick = null; app.innerHTML = full ? html : `<div class="wrap page">${html}</div>`; app.focus({ preventScroll: true }); if (!noScroll) window.scrollTo(0, 0); noScroll = false; }
const loading = () => show(`<div class="skel" style="height:34px;width:min(320px,60%);margin-bottom:22px"></div><div class="skelgrid">${'<div class="skel"></div>'.repeat(4)}</div>`);
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const backBtn = (href, label) => `<a class="btn ghost backbtn" href="${esc(href)}">${ARROW}${esc(label || t("back"))}</a>`;
const pageHead = (title, back) => `<div class="pagehead">${back ? backBtn(back.href, back.label) : ""}<h1>${title}</h1></div>`;
const notice = (msg, type) => `<div class="notice ${type || ""}" role="${type === "error" ? "alert" : "status"}">${esc(msg)}</div>`;
const addBiz = (d, n) => { const x = new Date(d.getTime()); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0) n--; } return x; }; // hari Minggu tidak dihitung
const parseTs = s => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : new Date(); };
function etaText(min, max, start) {
  if (!max) return "";
  const a = addBiz(start, min), b = addBiz(start, max), loc = lang === "en" ? "en-GB" : "id-ID";
  const f = (d, y) => d.toLocaleDateString(loc, y ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
  return a.getTime() === b.getTime() ? f(a, true) : f(a, false) + " - " + f(b, true);
}
function etaLine(o) {
  if (!o.est_max || o.status === "Selesai" || o.status === "Dibatalkan") return "";
  const shipped = (o.riwayat || []).find(r => r.jenis === "status" && r.nilai === "Dikirim");
  const start = shipped ? parseTs(shipped.waktu) : addBiz(parseTs(o.dibuat), o.hari_proses || 0);
  return `<p class="eta"><b>${t("eta.label")}:</b> ${etaText(o.est_min, o.est_max, start)}<br><span class="muted">${t(shipped ? "eta.note.ship" : "eta.note", { days: o.hari_proses || 0 })}</span></p>`;
}
const fmtT = s => s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) + " " + String(s).slice(11, 16) : "";

/* ---------- WhatsApp ---------- */
const waNum = () => String(S.settings.whatsapp_toko || "").replace(/\D/g, "");
const waUrl = text => "https://wa.me/" + waNum() + "?text=" + encodeURIComponent(text);
const waA = (text, label, cls) => waNum() ? `<a class="${cls || ""}" href="${waUrl(text)}" target="_blank" rel="noopener">${label}</a>` : `<a class="${cls || ""}" href="#" data-nowa>${label}</a>`;
document.addEventListener("click", e => { const c = e.target.closest("[data-copy]"); if (c) { const v = c.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast(t("copy.ok"), "ok")).catch(() => toast(t("done.copy.manual") + " " + v)); } });
document.addEventListener("click", e => { const a = e.target.closest("[data-nowa]"); if (a) { e.preventDefault(); toast(t("wa.notset"), "error"); } });
function updateFab(text) {
  const f = $("#waFab"); text = text || t("wa.ask.general");
  if (waNum()) { f.href = waUrl(text); f.target = "_blank"; f.rel = "noopener"; f.removeAttribute("data-nowa"); }
  else { f.href = "#"; f.removeAttribute("target"); f.setAttribute("data-nowa", ""); }
}

/* ---------- Iklan mengambang (kecil, bisa ditutup) ---------- */
function floatAdData() {
  const a = (S.ads || []).find(x => x.tipe === "mengambang"); if (a) return a;
  const m = freeMin(); return m > 0 ? { id: "auto-free", promo: true, judul: t("ad.free.title"), teks: t("ad.free.short", { min: rp(m) }), tautan: "#/produk" } : null;
}
function renderFloatAd() {
  const box = $("#floatAd"); if (!box) return;
  const a = S.products ? floatAdData() : null, name = (hashInfo().parts[0] || "home");
  let closed = false; try { closed = !!a && sessionStorage.getItem("cs_fad") === String(a.id); } catch (e) {}
  if (!a || closed || name === "checkout" || $("#shop").hidden) { box.hidden = true; return; }
  const ext = /^https:/.test(a.tautan || ""), tx = pick(a, "teks");
  const inner = `${a.gambar ? `<img src="${esc(imgSrc(a.gambar))}" alt="">` : ""}<span class="ftxt"><small>${a.promo ? t("ad.promo") : t("ad.label")}</small><b>${esc(pick(a, "judul"))}</b>${tx ? `<span>${esc(tx)}</span>` : ""}</span>`;
  box.innerHTML = `<button type="button" class="fclose" aria-label="${esc(t("fad.close"))}">&times;</button>` + (a.tautan ? `<a class="fbody" href="${esc(adLink(a.tautan))}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${inner}</a>` : `<div class="fbody">${inner}</div>`);
  $(".fclose", box).onclick = () => { box.hidden = true; try { sessionStorage.setItem("cs_fad", String(a.id)); } catch (e) {} };
  box.hidden = false;
}

/* ---------- Statistik pengunjung (anonim, tanpa data pribadi) ---------- */
const trackEvent = (type, ref) => { if (A.admin.has()) return; A.track(type, ref).catch(() => {}); };
function visitOnce() { try { if (sessionStorage.getItem("cs_visit")) return; sessionStorage.setItem("cs_visit", "1"); } catch (e) {} trackEvent("visit"); }

/* ---------- Keranjang (localStorage hanya menyimpan variant_id + jumlah) ---------- */
const getCart = () => { const c = load(CART_KEY, []); return Array.isArray(c) ? c.filter(x => x && typeof x.vid === "string" && x.qty > 0) : []; };
function setCart(c) { save(CART_KEY, c); S.co.key = null; S.co.done = null; updateBadge(); }
function updateBadge() { const n = getCart().reduce((a, x) => a + x.qty, 0), b = $("#cartCount"); b.textContent = n; b.hidden = !n; }
const inCart = vid => (getCart().find(x => x.vid === vid) || { qty: 0 }).qty;
function addToCart(vid, qty) { const c = getCart(), it = c.find(x => x.vid === vid); if (it) it.qty += qty; else c.push({ vid, qty }); setCart(c); }

/* ---------- Data ---------- */
function indexData() { S.idx = {}; S.products.forEach(p => p.varian.forEach(v => { S.idx[v.id] = { p, v }; })); }
const BOOT_KEY = "cs_boot_v1";
function applyBoot(r) { S.products = r.products; S.settings = r.settings; S.couriers = r.couriers; S.ads = r.ads; S.banks = r.banks || []; indexData(); renderAnnc(); renderFooter(); updateFab(); renderFloatAd(); }
function fetchBoot() { return A.bootstrap().then(r => { const changed = JSON.stringify(r) !== JSON.stringify(S.raw || null); S.raw = r; save(BOOT_KEY, r); applyBoot(r); return changed; }); }
function ensureData(force) {
  if (force) return fetchBoot();
  if (S.products) return Promise.resolve();
  const c = load(BOOT_KEY, null);
  if (c && c.products) { // data tersimpan di perangkat langsung dipakai agar halaman muncul cepat, lalu disegarkan diam-diam
    S.raw = c; applyBoot(c);
    fetchBoot().then(changed => { if (changed && !$("#shop").hidden && (hashInfo().parts[0] || "home") === "home") { noScroll = true; route(); } }).catch(() => {});
    return Promise.resolve();
  }
  return fetchBoot();
}
function withData(fn, force) {
  if (!S.products || force) loading();
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
    <div><h3>${t("f.shop")}</h3><ul><li><a href="#/produk?kat=Wanita">${t("nav.women")}</a></li><li><a href="#/produk?kat=Pria">${t("nav.men")}</a></li><li><a href="#/produk?kat=Aksesori">${t("nav.acc")}</a></li></ul></div>
    <div><h3>${t("f.help")}</h3><ul><li><a href="#/lacak">${t("nav.track")}</a></li><li><a href="#/retur">${t("nav.return")}</a></li><li><a href="#/faq">${t("nav.help")}</a></li><li>${waA(t("wa.ask.general"), t("wa.contact"))}</li></ul></div>
    <div><h3>${t("f.contact")}</h3><ul>${wa ? `<li>WhatsApp: +${esc(wa)}</li>` : ""}${s.email_toko ? `<li>${esc(s.email_toko)}</li>` : ""}${s.jam_operasional ? `<li>${esc(s.jam_operasional)}</li>` : ""}${s.alamat_toko ? `<li>${esc(s.alamat_toko)}</li>` : ""}</ul></div></div>
    <div class="wrap fcopy">&copy; ${new Date().getFullYear()} ${nm}. ${t("f.rights")}</div>`;
}

/* ---------- Komponen ---------- */
// Tautan Google Drive otomatis diubah menjadi tautan gambar langsung (file harus dibagikan "Siapa saja yang memiliki link")
const imgSrc = u => { u = String(u || ""); const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/); return m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w800" : u; };
const imgList = p => String(p.gambar || "").split("|").map(s => s.trim()).filter(Boolean);
function imgHtml(p) { const l = imgList(p); return l.length ? `<img src="${esc(imgSrc(l[0]))}" alt="${esc(pn(p))}" loading="lazy" data-ph="${esc(pn(p))}">` : `<div class="ph">${esc(pn(p))}</div>`; }
document.addEventListener("error", e => { const x = e.target; if (x && x.tagName === "IMG" && x.dataset.ph) { const d = document.createElement("div"); d.className = "ph"; d.textContent = x.dataset.ph; x.replaceWith(d); } }, true);
function pcard(p) {
  const soldout = p.stok_total <= 0, warna = new Set(p.varian.map(v => v.warna)).size, n = imgList(p).length;
  return `<a class="pcard" href="#/produk/${encodeURIComponent(p.id)}" aria-label="${esc(t("card.view", { name: pn(p) }))}">
    <div class="pimg">${imgHtml(p)}${soldout ? `<span class="tag soldout">${t("card.soldout")}</span>` : (p.label ? `<span class="tag">${esc(p.label)}</span>` : "")}${n > 1 ? `<span class="photos">${n} ${t("card.photos")}</span>` : ""}</div>
    <div class="meta"><h3>${esc(pn(p))}</h3><div class="price">${rp(p.harga)}</div><div class="muted">${esc(t("cat." + p.kategori))} - ${warna} ${t("card.colors")}</div></div></a>`;
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
const adLink = l => { const m = String(l || "").match(/^#\/produk\/([^?]+)$/); return (m && !(S.products || []).some(p => p.id === decodeURIComponent(m[1]))) ? "#/produk" : String(l || ""); };
function adHtml(a) {
  const ext = /^https:/.test(a.tautan || ""), lbl = `<small class="adlabel">${a.promo ? t("ad.promo") : t("ad.label")}</small>`;
  const btn = a.tautan && a.tombol ? `<a class="btn sm" href="${esc(adLink(a.tautan))}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${esc(pick(a, "tombol"))}</a>` : "";
  const txt = `<div class="adtxt">${lbl}<h3>${esc(pick(a, "judul"))}</h3>${a.teks ? `<p>${esc(pick(a, "teks"))}</p>` : ""}${btn}</div>`;
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
  const key = name === "produk" && !parts[1] && qs.kat ? "kat:" + qs.kat : (name === "retur" ? "faq" : name);
  $$("#nav a[data-key]").forEach(a => { const on = a.dataset.key === key; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
function closeAll() { document.body.classList.remove("navopen"); $("#overlay").hidden = true; $("#profile").hidden = true; $("#nav").classList.remove("open"); $("#btnMenu").setAttribute("aria-expanded", "false"); }
function route() {
  if ($("#shop").hidden) return;
  const { parts, qs } = hashInfo(), name = parts[0] || "home";
  closeAll(); markNav(); updateBadge(); updateFab(); renderFloatAd();
  switch (name) {
    case "home": return withData(vHome);
    case "produk": return parts[1] ? withData(() => vDetail(decodeURIComponent(parts[1]))) : withData(() => vCatalog(qs));
    case "keranjang": return withData(vCart);
    case "checkout": return withData(vCheckout);
    case "lacak": return withData(() => vTrack(qs.kode || ""));
    case "faq": return withData(() => vInfo(false));
    case "retur": return withData(() => vInfo(true)); // Cara Retur ada di dalam halaman Bantuan
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
  const hero = feat.concat(latest).filter((p, i, a) => a.indexOf(p) === i && imgList(p).length).slice(0, 3);
  const catImg = k => { const p = P.find(x => x.kategori === k && imgList(x).length); return p ? imgSrc(imgList(p)[0]) : ""; };
  const ads = (m > 0 ? [{ promo: true, tipe: "info", judul: t("ad.free.title"), teks: t("ad.free.text", { min: rp(m) }), tautan: "#/produk", tombol: t("hero.cta") }] : []).concat((S.ads || []).filter(a => a.tipe !== "mengambang"));
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const tile = (k, key) => `<a class="cattile" href="#/produk?kat=${k}">${catImg(k) ? `<img src="${esc(catImg(k))}" alt="" loading="lazy" data-ph="Cacutie">` : ""}<div><b>${t(key)}</b><span>${t("home.shopnow")}</span></div></a>`;
  show(`
  <section class="hero2"><div class="wrap in"><div><span class="eyebrow">${t("hero.eyebrow")}</span><h1>${esc(s.nama_toko || "Cacutie Style")}</h1>
    <p class="lead">${esc(s.slogan || "Your Style, Your Story.")} ${t("hero.sub")}</p>
    <div class="heroact"><a class="btn" href="#/produk">${t("hero.cta")}</a><a class="btn ghost" href="#/produk?kat=Wanita">${t("hero.cta2")}</a></div></div>
    <div class="collage" aria-hidden="true"><span class="blob"></span>${hero.map((p, i) => `<div class="cc c${i + 1}"><img src="${esc(imgSrc(imgList(p)[0]))}" alt="" data-ph="Cacutie"></div>`).join("")}</div></div></section>
  <div class="wrap">
    <div class="trust">
      <div>${ic('<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>')}<span><b>${t("trust.1.t")}</b>${t("trust.1.d")}</span></div>
      <div>${ic('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>')}<span><b>${t("trust.2.t")}</b>${t("trust.2.d")}</span></div>
      <div>${ic('<path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 10A8 8 0 006.3 6.3L4 10M4 14a8 8 0 0013.7 3.7L20 14"/>')}<span><b>${t("trust.3.t")}</b>${t("trust.3.d")}</span></div>
      <div>${ic('<path d="M21 12a8 8 0 01-11.9 7L4 20l1.1-4A8 8 0 1121 12z"/>')}<span><b>${t("trust.4.t")}</b>${t("trust.4.d")}</span></div></div>
    ${ads.length ? `<section class="section"><div class="ads">${ads.map(adHtml).join("")}</div></section>` : ""}
    <section class="section"><div class="sechead"><h2>${t("home.cats")}</h2></div><div class="cats">${tile("Wanita", "nav.women")}${tile("Pria", "nav.men")}${tile("Aksesori", "nav.acc")}</div></section>
    <section class="section"><div class="sechead"><h2>${t("home.featured")}</h2><a href="#/produk">${t("home.all")} &rarr;</a></div><div class="grid">${feat.map(pcard).join("")}</div></section>
    <section class="section"><div class="sechead"><h2>${t("home.latest")}</h2><a href="#/produk">${t("home.all")} &rarr;</a></div><div class="grid">${latest.map(pcard).join("")}</div></section>
  </div>`, true);
}

/* ---------- Katalog ---------- */
function vCatalog(qs) {
  const f = { q: qs.q || "", kat: qs.kat || "", urut: qs.urut || "", harga: qs.harga || "", stok: qs.stok === "1" };
  const o = (v, label, cur) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;
  show(`<section class="section">${pageHead(`<span id="ctitle">${f.kat ? t("cat." + f.kat) : t("cat.title")}</span>`, { href: "#/" })}<div class="filters">
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
      if (f.q && (p.nama + " " + (p.nama_en || "") + " " + p.sku).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.harga) { const r = f.harga.split("-"), lo = Number(r[0]) || 0, hi = r[1] ? Number(r[1]) : Infinity; if (p.harga < lo || p.harga >= hi) return false; }
      return true;
    });
    if (f.urut === "murah") l.sort((a, b) => a.harga - b.harga); else if (f.urut === "mahal") l.sort((a, b) => b.harga - a.harga);
    else l.sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
    $("#count").textContent = t("cat.count", { n: l.length }); $("#ctitle").textContent = f.kat ? t("cat." + f.kat) : t("cat.title");
    $("#grid").innerHTML = l.length ? `<div class="grid">${l.map(pcard).join("")}</div>` : `<div class="empty"><h2>${t("cat.none")}</h2><p>${t("cat.none.d")}</p><button class="btn ghost" id="reset">${t("cat.reset")}</button></div>`;
    const r = $("#reset"); if (r) r.onclick = () => { $("#fq").value = ""; $("#fkat").value = ""; $("#fharga").value = ""; $("#furut").value = ""; $("#fstok").checked = false; paint(); };
    const q = []; if (f.q) q.push("q=" + encodeURIComponent(f.q)); if (f.kat) q.push("kat=" + encodeURIComponent(f.kat)); if (f.harga) q.push("harga=" + f.harga); if (f.urut) q.push("urut=" + f.urut); if (f.stok) q.push("stok=1");
    history.replaceState(null, "", "#/produk" + (q.length ? "?" + q.join("&") : "")); S.lastCat = location.hash; markNav();
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
  const sizeInfo = {}, sizeList = [];
  String((lang === "en" && p.ukuran_info_en) ? p.ukuran_info_en : (p.ukuran_info || "")).split("\n").forEach(l => { const m = l.match(/^([^:]{1,20}):\s*(.+)$/); if (m) { sizeInfo[m[1].trim().toLowerCase()] = m[2].trim(); sizeList.push([m[1].trim(), m[2].trim()]); } });
  const askText = t("wa.ask.product", { name: pn(p), sku: p.sku });
  show(`<section class="section"><div class="pagehead">${backBtn(S.lastCat || "#/produk", t("d.back"))}</div><div class="detail">
    <div>${galleryHtml(imgList(p), pn(p))}</div>
    <div><h1 style="font-size:1.8rem">${esc(pn(p))}</h1><p class="muted">SKU: ${esc(p.sku)} - ${esc(t("cat." + p.kategori))}</p>
      <p class="price" style="font-size:1.5rem">${rp(p.harga)}</p><p>${esc(pdsc(p))}</p><div id="opts"></div>
      <div class="notice"><b>${t("d.shipping")}:</b> ${t("d.shipping.d")}${freeMin() > 0 ? " " + esc(t("annc.free", { min: rp(freeMin()) })) : ""}</div>
      <p class="muted" style="margin:0 0 12px">${t("d.return_h")}</p>
      ${waA(askText, "&#128172; " + t("wa.ask.btn"), "btn ghost")}</div></div>
    <div class="section"><h2>${t("d.reviews")}</h2><div id="rev"><div class="loading"><div class="spin"></div>${t("d.reviews.load")}</div></div></div></section>`);
  bindGallery(app); updateFab(askText);
  function paint() {
    const cv = sel.w && sel.u ? find(sel.w, sel.u) : null, avail = cv ? cv.stok - inCart(cv.id) : 0;
    if (sel.qty > Math.max(avail, 1)) sel.qty = Math.max(avail, 1);
    const cOk = c => p.varian.some(v => v.warna === c && (!sel.u || v.ukuran === sel.u) && v.stok > 0);
    const uOk = u => p.varian.some(v => v.ukuran === u && (!sel.w || v.warna === sel.w) && v.stok > 0);
    const hasSize = !(sizes.length === 1 && /^(all size|-)$/i.test(sizes[0]));
    const sizeBlock = () => {
      if (!sizeList.length) return "";
      const one = sel.u ? sizeInfo[sel.u.toLowerCase()] : "";
      const line = hasSize ? (one ? `<p class="sizeinfo"><b>${t("d.size")} ${esc(sel.u)}:</b> ${esc(one)}</p>` : `<p class="muted">${t("d.size.pick")}</p>`) : `<p class="sizeinfo"><b>${t("d.dims")}:</b> ${esc(sizeList[0][1])}</p>`;
      const table = hasSize && sizeList.length > 1 ? `<details class="sizechart"><summary>${t("d.sizechart")}</summary><div class="tablewrap"><table><tbody>${sizeList.map(r => `<tr class="${sel.u && r[0].toLowerCase() === sel.u.toLowerCase() ? "on" : ""}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table></div></details>` : "";
      return line + table;
    };
    let info;
    if (!cv) info = t(hasSize ? "d.pick.both" : "d.pick.color");
    else if (cv.stok <= 0) info = t("d.variant.out");
    else info = t("d.stock", { n: cv.stok }) + (inCart(cv.id) ? " " + t("d.incart", { n: inCart(cv.id) }) : "");
    $("#opts").innerHTML = `<div><label>${t("d.color")}</label><div class="opts">${colors.map(c => `<button class="opt" data-w="${esc(c)}" aria-pressed="${sel.w === c}" ${cOk(c) ? "" : "disabled"}>${esc(cn(c))}</button>`).join("")}</div></div>
      ${hasSize ? `<div><label>${t("d.size")}</label><div class="opts">${sizes.map(u => `<button class="opt" data-u="${esc(u)}" aria-pressed="${sel.u === u}" ${uOk(u) ? "" : "disabled"}>${esc(u)}</button>`).join("")}</div></div>` : ""}
      ${sizeBlock()}
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
      addToCart(cv.id, sel.qty); trackEvent("cart", p.id);
      if (b.dataset.add === "buy") { location.hash = "#/checkout"; return; }
      toast(t("d.added", { name: pn(p), w: cn(cv.warna), u: cv.ukuran }), "ok"); sel.qty = 1;
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
    if (it.qty > r.v.stok) { msgs.push(t("cart.adjusted", { name: pn(r.p), w: cn(r.v.warna), u: r.v.ukuran, n: r.v.stok })); it.qty = r.v.stok; }
    sub += r.p.harga * it.qty; lines.push({ it, r });
  });
  if (msgs.length) save(CART_KEY, cart);
  return { lines, sub, msgs, blocked };
}
function vCart() {
  const c = reconcile(), m = freeMin();
  if (!c.lines.length) return show(`<div class="empty"><h2>${t("cart.empty")}</h2><p>${t("cart.empty.d")}</p><a class="btn" href="#/produk">${t("cart.start")}</a></div>`);
  show(`<section class="section">${pageHead(t("cart.title"), { href: S.lastCat || "#/produk" })}${c.msgs.map(x => notice(x, "warn")).join("")}<div class="layout2"><div class="card">
    ${c.lines.map(l => l.r ? `<div class="cartitem"><a class="pimg" href="#/produk/${encodeURIComponent(l.r.p.id)}">${imgHtml(l.r.p)}</a><div>
      <b>${esc(pn(l.r.p))}</b><div class="muted">SKU ${esc(l.r.p.sku)} - ${esc(cn(l.r.v.warna))}, ${esc(l.r.v.ukuran)}</div><div>${rp(l.r.p.harga)} ${t("cart.each")}</div>
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

/* ---------- Lokasi otomatis (opsional, hanya saat tombol ditekan) ---------- */
// Koordinat dikirim ke layanan peta OpenStreetMap (Nominatim) untuk diubah menjadi alamat. Tidak disimpan oleh toko.
function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: "unsupported" });
    navigator.geolocation.getCurrentPosition(pos => {
      const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=" + (lang === "en" ? "en" : "id") + "&lat=" + pos.coords.latitude + "&lon=" + pos.coords.longitude;
      fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(j => {
        const a = j.address || {};
        const road = a.road || a.pedestrian || a.path || a.residential || "", kel = a.village || a.neighbourhood || a.suburb || "";
        const kec = a.city_district || a.subdistrict || (a.suburb && a.suburb !== kel ? a.suburb : "") || "", kota = a.city || a.town || a.municipality || a.county || a.regency || "";
        resolve({ alamat: [road, kel].filter(Boolean).join(", "), kota: [kec, kota].filter(Boolean).join(", ").slice(0, 60), lengkap: j.display_name || "" });
      }).catch(() => reject({ code: "geocode" }));
    }, err => reject({ code: err && err.code === 1 ? "denied" : "fail" }), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
function bindLocate(btnSel, msgSel, fill) {
  const b = $(btnSel), m = $(msgSel); if (!b) return;
  b.onclick = () => {
    m.textContent = t("loc.finding"); b.disabled = true;
    locate().then(r => { fill(r); m.textContent = t("loc.ok", { place: r.kota || r.lengkap }); })
      .catch(e => { m.textContent = t(e && e.code === "denied" ? "loc.denied" : e && e.code === "unsupported" ? "loc.unsupported" : "loc.fail"); })
      .then(() => { b.disabled = false; });
  };
}
const locUi = () => `<div class="locrow"><button type="button" class="btn sm ghost" id="locBtn">&#128205; ${t("loc.use")}</button><span class="muted">${t("loc.or")}</span></div><p class="locnote" id="locMsg" aria-live="polite">${t("loc.note")}</p>`;

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
  S.co.step === 3 ? stepSummary(c) : stepForm(c);
}
function sideSummary(c, kr) {
  const ong = kr ? shipFor(c.sub, kr) : 0, hp = Number(S.settings.hari_proses) || 0;
  return `<h2>${t("sum.order")}</h2>${c.lines.map(l => `<div><span>${esc(pn(l.r.p))}<br><span class="muted">${esc(cn(l.r.v.warna))}, ${esc(l.r.v.ukuran)} x ${l.it.qty}</span></span><span>${rp(l.r.p.harga * l.it.qty)}</span></div>`).join("")}
    <div><span>${t("sum.subtotal")}</span><span>${rp(c.sub)}</span></div><div><span>${t("sum.ship")}${kr ? " (" + esc(kr.nama) + ")" : ""}</span><span>${kr ? (ong ? rp(ong) : t("sum.free")) : t("cart.ship.later")}</span></div>
    <div class="tot"><span>${t("sum.total")}</span><span>${rp(c.sub + ong)}</span></div>
    ${kr ? etaLine({ est_min: kr.est_min, est_max: kr.est_max, hari_proses: hp, dibuat: "", status: "Menunggu pembayaran" }) : ""}${freeMin() > 0 && c.sub < freeMin() ? `<p class="notice" style="margin:10px 0 0">${t("cart.free.more", { n: rp(freeMin() - c.sub) })}</p>` : ""}`;
}
function stepForm(c) {
  const saved = S.cust && S.cust.alamat ? { alamat: S.cust.alamat, kota: S.cust.kota } : {};
  const f = Object.assign({ nama: S.cust ? S.cust.nama : "", wa: S.cust ? S.cust.whatsapp : "" }, saved, S.co.form);
  const fromAcct = !!(saved.alamat && !S.co.form.alamat);
  show(`<section class="section">${pageHead("Checkout", { href: "#/keranjang", label: t("co.back") })}${stepsBar(2)}<div class="checkout"><div class="card"><h2>${t("co.ship.title")}</h2>
    <p class="muted">${S.cust ? t("co.acct", { email: esc(S.cust.email) }) : t("co.guest_h")}</p>${fromAcct ? `<p class="notice ok">${t("co.saved")}</p>` : ""}
    <div class="row two"><div class="field" id="f-nama"><label for="nama">${t("co.name")}</label><input id="nama" maxlength="60" autocomplete="name" value="${esc(f.nama || "")}"><div class="err"></div></div>
    <div class="field" id="f-wa"><label for="wa">${t("co.wa")}</label><input id="wa" inputmode="tel" autocomplete="tel" placeholder="081234567890" value="${esc(f.wa || "")}"><div class="err"></div></div></div>
    ${locUi()}
    <div class="field" id="f-alamat"><label for="alamat">${t("co.addr")}</label><textarea id="alamat" maxlength="300" autocomplete="street-address">${esc(f.alamat || "")}</textarea><div class="err"></div></div>
    <div class="row two"><div class="field" id="f-kota"><label for="kota">${t("co.city")}</label><input id="kota" maxlength="60" value="${esc(f.kota || "")}"><div class="err"></div></div>
    <div class="field" id="f-kurir"><label for="kirim">${t("co.courier")}</label><select id="kirim"><option value="">${t("co.courier.pick")}</option>${(S.couriers || []).map(k => `<option value="${esc(k.id)}" ${f.kurir === k.id ? "selected" : ""}>${esc(k.nama)} - ${rp(k.tarif)}${k.estimasi ? " (" + esc(est(k.estimasi)) + ")" : ""}</option>`).join("")}</select><div class="err"></div></div></div>
    <div class="field"><label for="cat">${t("co.note")}</label><textarea id="cat" maxlength="200" style="min-height:70px">${esc(f.catatan || "")}</textarea></div>
    ${S.cust ? `<label class="chk"><input type="checkbox" id="saveAddr" ${S.co.save !== false ? "checked" : ""}> ${t("co.save")}</label>` : ""}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;justify-content:space-between"><a class="btn ghost backbtn" href="#/keranjang">${ARROW}${t("co.back")}</a><button class="btn" id="next">${t("co.next")}</button></div></div>
    <aside class="card sumcard sum" id="sideSum">${sideSummary(c, courier(f.kurir))}</aside></div></section>`);
  $("#kirim").onchange = () => { $("#sideSum").innerHTML = sideSummary(c, courier($("#kirim").value)); };
  bindLocate("#locBtn", "#locMsg", r => { if (r.kota) $("#kota").value = r.kota; if (!$("#alamat").value.trim() && r.alamat) $("#alamat").value = r.alamat; });
  $("#next").onclick = () => {
    const v = { nama: $("#nama").value.trim(), wa: $("#wa").value.trim(), alamat: $("#alamat").value.trim(), kota: $("#kota").value.trim(), catatan: $("#cat").value.trim(), kurir: $("#kirim").value };
    let bad = false; const chk = (id, ok, msg) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : msg; if (!ok && !bad) { bad = true; $("input,textarea,select", el).focus(); } };
    chk("f-nama", v.nama.length >= 2, t("v.name")); chk("f-wa", !!normWa(v.wa), t("v.wa")); chk("f-alamat", v.alamat.length >= 10, t("v.addr")); chk("f-kota", v.kota.length >= 2, t("v.city")); chk("f-kurir", !!v.kurir, t("v.courier"));
    if (bad) return;
    S.co.save = $("#saveAddr") ? $("#saveAddr").checked : undefined; // tamu: tidak mengubah pilihan bawaan (tercentang) untuk login berikutnya
    S.co.form = v; S.co.step = 3; vCheckout();
  };
}
function stepSummary(c) {
  const f = S.co.form, kr = courier(f.kurir);
  if (!kr) { S.co.step = 2; toast(t("co.courier.gone"), "error"); return stepForm(); }
  const ong = shipFor(c.sub, kr), tot = c.sub + ong, qrisOn = !!S.settings.qris_gambar, codMax = Number(S.settings.cod_maks) || 0;
  const codOff = !kr.cod ? t("pay.cod.off", { courier: esc(kr.nama) }) : (codMax > 0 && tot > codMax ? t("pay.cod.max", { max: rp(codMax) }) : "");
  if (S.co.metode === "QRIS" && !qrisOn) S.co.metode = "Transfer Bank";
  if (S.co.metode === "COD" && codOff) S.co.metode = "Transfer Bank";
  const pay = (v, k, offMsg) => `<label class="pay ${offMsg ? "dis" : ""}"><input type="radio" name="pay" value="${v}" ${S.co.metode === v ? "checked" : ""} ${offMsg ? "disabled" : ""}><span><b>${t(k)}</b><br><span class="muted">${offMsg || t(k + ".d")}</span></span></label>`;
  show(`<section class="section">${pageHead("Checkout")}${stepsBar(3)}<div class="checkout"><div>
    <div class="card" style="margin-bottom:16px"><h2>${t("co.shipto")}</h2><p style="margin:0"><b>${esc(f.nama)}</b> - ${esc(f.wa)}<br>${esc(f.alamat)}, ${esc(f.kota)}<br><span class="muted">${t("co.courier")}: ${esc(kr.nama)}${kr.estimasi ? " (" + esc(est(kr.estimasi)) + ")" : ""}</span>${f.catatan ? `<br><span class="muted">${t("co.note.s")}: ${esc(f.catatan)}</span>` : ""}</p><button class="link" id="edit">${t("co.edit")}</button></div>
    <div class="card"><h2>${t("pay.title")}</h2><p class="muted">${t("pay.manual")}</p>${pay("Transfer Bank", "pay.bank")}<div id="bankBox"></div>${pay("QRIS", "pay.qris", qrisOn ? "" : t("pay.qris.off"))}${pay("COD", "pay.cod", codOff)}${pay("Konfirmasi via WhatsApp", "pay.wa")}</div><div style="margin-top:14px"><button type="button" class="btn ghost backbtn" id="backStep">${ARROW}${t("back")}</button></div></div>
    <aside class="card sumcard sum"><h2>${t("sum.order")}</h2>${c.lines.map(l => `<div><span>${esc(pn(l.r.p))}<br><span class="muted">${esc(cn(l.r.v.warna))}, ${esc(l.r.v.ukuran)} x ${l.it.qty}</span></span><span>${rp(l.r.p.harga * l.it.qty)}</span></div>`).join("")}
      <div><span>${t("sum.subtotal")}</span><span>${rp(c.sub)}</span></div><div><span>${t("sum.ship")} (${esc(kr.nama)})</span><span>${ong ? rp(ong) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(tot)}</span></div>
      ${etaLine({ est_min: kr.est_min, est_max: kr.est_max, hari_proses: Number(S.settings.hari_proses) || 0, dibuat: "", status: "Menunggu pembayaran" })}${freeMin() > 0 && c.sub < freeMin() ? `<p class="notice">${t("cart.free.more", { n: rp(freeMin() - c.sub) })}</p>` : ""}<p class="muted">${t("sum.server")}</p><div id="coMsg"></div>
      <div style="display:grid;gap:10px"><button class="btn" id="place" data-loading="${esc(t("co.placing"))}">${t("co.place")}</button><a class="btn ghost" href="#/keranjang">${t("co.editcart")}</a></div></aside></div></section>`);
  $("#edit").onclick = () => { S.co.step = 2; vCheckout(); };
  $("#backStep").onclick = () => { S.co.step = 2; vCheckout(); };
  const paintBanks = () => {
    const box = $("#bankBox"); if (!box) return;
    if (S.co.metode !== "Transfer Bank" || !S.banks.length) { box.innerHTML = ""; return; }
    if (S.co.bank && !S.banks.some(b => b.id === S.co.bank)) S.co.bank = "";
    box.innerHTML = `<div class="banktitle">${t("bank.title")}</div><div class="bankchips" role="radiogroup" aria-label="${esc(t("bank.title"))}">${S.banks.map(b => `<label class="bankchip"><input type="radio" name="bank" value="${esc(b.id)}" ${S.co.bank === b.id ? "checked" : ""}><span>${esc(b.nama)}</span></label>`).join("")}</div><div class="bankerr" id="bankErr"></div>`;
    $$("input[name=bank]").forEach(r => { r.onchange = () => { S.co.bank = r.value; $("#bankErr").textContent = ""; }; });
  };
  $$("input[name=pay]").forEach(r => { r.onchange = () => { S.co.metode = r.value; paintBanks(); }; });
  paintBanks();
  $("#place").onclick = () => {
    if (S.co.metode === "Transfer Bank" && S.banks.length && !S.co.bank) { $("#bankErr").textContent = t("bank.v"); $("#bankBox").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    S.co.key = S.co.key || A.newKey(); // kunci sama dipakai ulang saat coba lagi, jadi tidak membuat pesanan ganda
    const body = { nama: f.nama, whatsapp: f.wa, alamat: f.alamat, kota: f.kota, catatan: f.catatan, kurir: f.kurir, metode_bayar: S.co.metode, bank: S.co.metode === "Transfer Bank" ? (S.co.bank || "") : "", client_key: S.co.key, simpan_alamat: !!(S.cust && S.co.save !== false), items: c.lines.map(l => ({ variant_id: l.it.vid, jumlah: l.it.qty })) };
    A.busy($("#place"), () => A.createOrder(body)).then(res => {
      if (!res) return;
      if (S.cust && S.co.save !== false) { S.cust.alamat = f.alamat; S.cust.kota = f.kota; }
      setCart([]); S.co.done = res; S.co.step = 2; S.co.key = null; S.co.form = {};
      const o = load(ORD_KEY, []); o.unshift({ kode: res.kode, wa: f.wa, t: Date.now() }); save(ORD_KEY, o.slice(0, 10));
      stepDone();
    }).catch(e => {
      let m = em(e); if (e.code === "TIMEOUT") m += " " + t("co.timeout");
      if (e.code === "OUT_OF_STOCK" || e.code === "UNAVAILABLE") { toast(m, "error"); S.products = null; location.hash = "#/keranjang"; return; }
      $("#coMsg").innerHTML = notice(m, "error");
    });
  };
}
function bankBox(o) {
  if (!o.bank) return `<div class="notice"><b>${t("done.bank")}</b><br>${esc(o.info_transfer || t("done.bank.none"))}<br>${t("done.bank.note")}</div>`;
  return `<div class="notice"><b>${t("done.bank.to", { bank: esc(o.bank.nama) })}</b><p style="margin:6px 0 2px">${t("done.bank.no")}: <b class="acc">${esc(o.bank.rek)}</b> <button type="button" class="btn sm ghost" data-copy="${esc(o.bank.rek)}">${t("done.bank.copy")}</button></p><p style="margin:0">${t("done.bank.an")}: <b>${esc(o.bank.atas_nama)}</b></p><p>${t("done.bank.amount", { total: rp(o.total) })}</p><p class="muted" style="margin:0">${t("done.bank.note")}</p></div>`;
}
function itemsTable(o) { return `<div class="tablewrap"><table><thead><tr><th>${t("tb.product")}</th><th>${t("tb.qty")}</th><th>${t("tb.subtotal")}</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(pname(i.product_id, i.nama))}<br><span class="muted">${esc(cn(i.warna))}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td></tr>`).join("")}</tbody></table></div>`; }
function stepDone() {
  const o = S.co.done;
  const proof = t("wa.proof", { kode: o.kode, total: rp(o.total) });
  const payBox = o.metode_bayar === "QRIS"
    ? `<div class="notice"><b>${t("done.qris")}</b><p>${t("done.qris.amount", { total: rp(o.total) })}</p>${o.qris ? `<img class="qris" src="${esc(imgSrc(o.qris))}" alt="QRIS" data-ph="${esc(t("done.qris.err"))}">` : ""}<p class="muted" style="margin:0">${t("done.qris.note")}</p></div>`
    : o.metode_bayar === "COD" ? `<div class="notice"><b>${t("done.cod")}</b><p>${t("done.cod.amount", { total: rp(o.total) })}</p><p class="muted" style="margin:0">${t("done.cod.note")}</p></div>`
    : o.metode_bayar === "Transfer Bank" ? bankBox(o)
    : `<div class="notice"><b>${t("done.wa")}</b><br>${t("done.wa.note")}</div>`;
  show(`<section class="section narrow">${pageHead(t("done.title"))}${stepsBar(4)}<div class="card">
    <p>${t("done.code")}</p><p><span class="code" id="kode">${esc(o.kode)}</span></p><button class="btn sm ghost" id="copy">${t("done.copy")}</button>
    <p style="margin-top:16px">${t("done.status")}: <span class="pill">${esc(st(o.status))}</span></p>${itemsTable(o)}
    <div class="sum"><div><span>${t("sum.subtotal")}</span><span>${rp(o.subtotal)}</span></div><div><span>${t("sum.ship")} (${esc(o.pengiriman)})</span><span>${o.ongkir ? rp(o.ongkir) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(o.total)}</span></div></div>
    ${etaLine(o)}${payBox}<div style="display:flex;gap:10px;flex-wrap:wrap">${o.metode_bayar === "Transfer Bank" || o.metode_bayar === "QRIS" ? waA(proof, t("done.sendproof"), "btn") : waA(proof, t("done.chat"), "btn")}
    <a class="btn ghost" href="#/lacak?kode=${encodeURIComponent(o.kode)}">${t("done.track")}</a><a class="btn ghost" href="#/produk">${t("cart.continue")}</a></div></div></section>`);
  $("#copy").onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(o.kode) : Promise.reject()).then(() => toast(t("done.copied"), "ok")).catch(() => toast(t("done.copy.manual") + " " + o.kode)); };
}

/* ---------- Pelacakan pesanan (linimasa seperti aplikasi pesan-antar) ---------- */
function timeline(o) {
  const log = o.riwayat || [], when = (j, n) => { const r = log.filter(x => x.jenis === j && x.nilai === n)[0]; return r ? r.waktu : ""; };
  const cancelled = o.status === "Dibatalkan", cod = o.metode_bayar === "COD", idx = { "Menunggu pembayaran": 0, "Menunggu konfirmasi": 0, "Diproses": 2, "Dikemas": 3, "Dikirim": 4, "Selesai": 5 }[o.status] || 0;
  const paid = o.status_bayar === "Sudah dibayar" || idx >= 2;
  const steps = [
    { k: "created", done: true, time: o.dibuat },
    cod ? { k: "confirm", done: idx >= 2, time: when("status", "Diproses") } : { k: "paid", done: paid, time: when("bayar", "Sudah dibayar") },
    { k: "process", done: idx > 2, time: when("status", "Diproses") },
    { k: "pack", done: idx > 3, time: when("status", "Dikemas") },
    { k: "ship", done: idx > 4, time: when("status", "Dikirim") },
    { k: cod ? "donecod" : "done", done: idx === 5, time: when("status", "Selesai") }
  ];
  if (!cancelled) { const cur = steps.find(x => !x.done); if (cur) cur.cur = true; }
  const detail = x => x.k === "ship" && (x.done || x.cur) && (o.pengiriman || o.resi) ? `<div class="muted">${esc(o.pengiriman || "")}${o.resi ? " - " + t("tl.resi") + ": " + esc(o.resi) : ""}</div>` : "";
  const li = x => `<li class="${cancelled && x.k !== "created" && !x.done ? "todo" : (x.done ? "done" : (x.cur ? "cur" : "todo"))}"><span class="dot" aria-hidden="true"></span><div><b>${t("tl." + x.k + (x.cur ? ".now" : ""))}</b>${x.time ? `<span class="muted"> ${fmtT(x.time)}</span>` : ""}${detail(x)}</div></li>`;
  const cancelLi = cancelled ? `<li class="cancel"><span class="dot" aria-hidden="true"></span><div><b>${t("tl.cancel")}</b><span class="muted"> ${fmtT(when("status", "Dibatalkan"))}</span></div></li>` : "";
  return `<ol class="tl" aria-label="${esc(t("tl.title"))}">${steps.map(li).join("")}${cancelLi}</ol><p class="muted" style="font-size:.82rem">${t("tl.note")}</p>`;
}
const RETUR_ST = { "Diajukan": "req", "Disetujui": "ok", "Ditolak": "no", "Selesai": "done" };
const ALASAN = ["Ukuran tidak sesuai", "Produk rusak atau cacat", "Tidak sesuai pesanan", "Lainnya"];
function returnBox(o) {
  const list = o.retur || [], have = {}; list.forEach(r => { have[r.product_id] = true; });
  const open = !!o.bisa_retur && o.items.some(i => !have[i.product_id]);
  return `${list.length ? `<h3>${t("rt.requests")}</h3><ul class="rtlist">${list.map(r => `<li><b>${esc(pname(r.product_id, r.nama))}</b> <span class="pill">${t("rt.st." + (RETUR_ST[r.status] || "req"))}</span>${r.catatan_admin ? `<div class="muted">${t("rt.admin")}: ${esc(r.catatan_admin)}</div>` : ""}</li>`).join("")}</ul>` : ""}
    ${open ? `<div style="margin-top:8px"><button class="btn sm ghost" data-ret="1">${t("rt.give")}</button> <a class="link" href="#/retur">${t("nav.return")}</a></div><div id="rtBox"></div>` : (o.status === "Selesai" && !list.length && o.bisa_retur === false ? `<p class="muted">${t("rt.expired", { days: o.retur_hari || 3 })}</p>` : "")}`;
}
function cancelBox(o) {
  if (!o.bisa_batal) return "";
  return `<div class="notice warn" style="margin-top:14px"><b>${t("cx.title")}</b><br>${t("cx.info", { n: o.batal_sisa, m: o.batal_menit })}<div style="margin-top:10px"><button class="btn sm danger" type="button" data-cancel="1">${t("cx.btn")}</button></div><div id="cxBox"></div></div>`;
}
function orderResult(o) {
  const slug = SLUG[o.status] || "x";
  return `<div class="card"><div class="headline ${slug}"><small>${t("tr.order")} ${esc(o.kode)}</small><b>${t("hl." + slug)}</b><span>${t("hl." + slug + ".d")}</span></div>
    ${etaLine(o)}${timeline(o)}${o.metode_bayar === "Transfer Bank" && o.bank && o.status_bayar !== "Sudah dibayar" && o.status !== "Dibatalkan" ? bankBox(o) : ""}<p>${t("tr.payment")}: <span class="pill">${esc(pst(o.status_bayar))}</span> <span class="pill">${esc(pm(o.metode_bayar))}</span></p><p class="muted">${t("tr.dest")}: ${esc(o.kota)}</p>
    <div class="tablewrap"><table><thead><tr><th>${t("tb.product")}</th><th>${t("tb.qty")}</th><th>${t("tb.subtotal")}</th><th>${t("tb.review")}</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(pname(i.product_id, i.nama))}<br><span class="muted">${esc(cn(i.warna))}, ${esc(i.ukuran)}</span></td><td>${i.jumlah}</td><td>${rp(i.subtotal)}</td><td>${o.bisa_ulasan ? (i.sudah_ulasan ? `<span class="pill">${t("rv.done")}</span>` : `<button class="btn sm ghost" data-rv="${esc(i.product_id)}" data-n="${esc(pname(i.product_id, i.nama))}">${t("rv.give")}</button>`) : "-"}</td></tr>`).join("")}</tbody></table></div>
    <div class="sum"><div><span>${t("sum.ship")} (${esc(o.pengiriman)})</span><span>${o.ongkir ? rp(o.ongkir) : t("sum.free")}</span></div><div class="tot"><span>${t("sum.total")}</span><span>${rp(o.total)}</span></div></div>
    ${o.bisa_ulasan ? "" : `<p class="muted">${t("rv.later")}</p>`}${returnBox(o)}${cancelBox(o)}<div style="margin-top:10px">${waA(t("wa.ask.order", { kode: o.kode }), "&#128172; " + t("wa.order.btn"), "btn sm ghost")}</div><div id="rvBox"></div></div>`;
}
// ctx = { kode, wa, o } : tamu memakai kode + WhatsApp, pelanggan yang login cukup kode
function bindReviews(box, ctx) {
  box.onclick = e => {
    const cb = e.target.closest("button[data-cancel]");
    if (cb) {
      $("#cxBox").innerHTML = `<div style="margin-top:10px"><div class="field"><label for="cxWhy">${t("cx.reason")}</label><textarea id="cxWhy" maxlength="200" style="min-height:70px"></textarea></div><div id="cxMsg"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm danger" id="cxYes" data-loading="${esc(t("cx.sending"))}">${t("cx.yes")}</button><button type="button" class="btn sm ghost" id="cxNo">${t("cx.no")}</button></div></div>`;
      $("#cxNo").onclick = () => { $("#cxBox").innerHTML = ""; };
      $("#cxYes").onclick = () => A.busy($("#cxYes"), () => A.cancelOrder({ kode: ctx.kode, whatsapp: ctx.wa || "", alasan: $("#cxWhy").value.trim() })).then(r => { if (!r) return; toast(t("cx.done"), "ok"); if (ctx.reload) ctx.reload(); }).catch(er => { $("#cxMsg").innerHTML = notice(em(er), "error"); });
      return;
    }
    const rb = e.target.closest("button[data-ret]");
    if (rb) {
      const o = ctx.o || { items: [], retur: [] }, taken = {}; (o.retur || []).forEach(r => { taken[r.product_id] = true; });
      const items = o.items.filter(i => !taken[i.product_id]);
      $("#rtBox").innerHTML = `<div class="card" style="margin-top:12px;background:var(--cream)"><h3>${t("rt.for")}</h3>
        <div class="field"><label for="rtProd">${t("rt.product")}</label><select id="rtProd">${items.map(i => `<option value="${esc(i.product_id)}">${esc(pname(i.product_id, i.nama))} (${esc(cn(i.warna))}, ${esc(i.ukuran)})</option>`).join("")}</select></div>
        <div class="field" id="rt-reason"><label for="rtReason">${t("rt.reason")}</label><select id="rtReason"><option value="">${t("rv.pick")}</option>${ALASAN.map((a, i) => `<option value="${a}">${t("rt.r" + (i + 1))}</option>`).join("")}</select><div class="err"></div></div>
        <div class="field" id="rt-note"><label for="rtNote">${t("rt.note")}</label><textarea id="rtNote" maxlength="500"></textarea><div class="err"></div></div>
        <div id="rtMsg"></div><button class="btn" id="rtSend" data-loading="${esc(t("rv.sending"))}">${t("rt.send")}</button></div>`;
      $("#rtReason").focus();
      $("#rtSend").onclick = () => {
        const pid = $("#rtProd").value, why = $("#rtReason").value, note = $("#rtNote").value.trim(); let bad = false;
        const chk = (id, ok, m) => { const f = $("#" + id); f.classList.toggle("bad", !ok); $(".err", f).textContent = ok ? "" : m; if (!ok) bad = true; };
        chk("rt-reason", !!why, t("rt.v.reason")); chk("rt-note", why !== "Lainnya" || note.length >= 5, t("rt.v.note")); if (bad) return;
        const it = items.find(i => i.product_id === pid) || {};
        A.busy($("#rtSend"), () => A.submitReturn({ kode: ctx.kode, whatsapp: ctx.wa || "", product_id: pid, alasan: why, catatan: note })).then(res => {
          if (!res) return;
          $("#rtBox").innerHTML = notice(t("rt.sent"), "ok") + `<p style="margin-top:10px">${waA(t("wa.return", { kode: ctx.kode, name: pname(it.product_id, it.nama || "") }), "&#128172; " + t("rt.proof"), "btn sm")}</p>`;
          rb.disabled = true;
        }).catch(er => { $("#rtMsg").innerHTML = notice(em(er), "error"); });
      };
      return;
    }
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
  const recent = load(ORD_KEY, []), memo = load("cs_lookup", {});
  const ocard = (o, wa) => `<button type="button" class="ocard" data-k="${esc(o.kode)}" data-wa="${esc(wa || "")}"><span><b>${esc(o.kode)}</b><span class="muted">${esc(String(o.dibuat || "").slice(0, 10))}${o.total ? " - " + rp(o.total) : ""}</span></span><span>${o.status ? `<span class="pill">${esc(st(o.status))}</span>` : `<span class="muted">${t("tr.open")}</span>`}</span></button>`;
  show(`<section class="section mid">${pageHead(t("nav.track"), { href: "#/" })}<div class="lookup"><div class="card"><h2>${t("tr.byphone")}</h2><p class="muted">${t("tr.byphone.d")}</p>
      ${S.cust ? `<p class="notice">${t("tr.loggedin_h", { name: esc(S.cust.nama) })}</p>` : ""}
      <div class="field" id="t-wa"><label for="tw">${t("co.wa")}</label><input id="tw" inputmode="tel" placeholder="081234567890" value="${esc(S.cust ? S.cust.whatsapp : (memo.wa || ""))}"><div class="err"></div></div>
      <div class="field" id="t-nama"><label for="tn">${t("tr.name")}</label><input id="tn" maxlength="60" autocomplete="name" value="${esc(S.cust ? S.cust.nama : (memo.nama || ""))}"><div class="err"></div></div>
      <div id="tMsg"></div><button class="btn" id="tgo" data-loading="${esc(t("tr.searching"))}">${t("tr.find")}</button><div id="tList"></div>
      <details style="margin-top:16px" id="byCode"><summary><b>${t("tr.bycode")}</b></summary><p class="muted" style="margin-top:8px">${t("tr.bycode.d")}</p>
        <div class="field" id="t-kode"><label for="tk">${t("tr.code")}</label><input id="tk" maxlength="30" placeholder="CS260101-AB3XY" value="${esc(prefill)}"><div class="err"></div></div>
        <button class="btn ghost" id="tgo2" data-loading="${esc(t("tr.searching"))}">${t("tr.check")}</button></details></div>
    <div><div id="tRes"></div>${recent.length ? `<div class="card" id="recentBox" style="margin-top:16px"><h3>${t("tr.recent")}</h3><p class="muted" style="margin-top:-4px">${t("tr.recent.d")}</p><div class="olist">${recent.map(r => ocard(r, r.wa)).join("")}</div></div>` : ""}</div></div></section>`);
  let bad = false;
  const chk = (id, ok, m) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : m; if (!ok) bad = true; };
  const openOrder = (kode, wa, btn) => {
    const ctx = { kode, wa };
    return A.busy(btn || null, () => A.trackOrder(kode, wa)).then(o => {
      if (!o) return;
      ctx.o = o; ctx.reload = () => openOrder(kode, wa);
      $("#tRes").innerHTML = orderResult(o); bindReviews($("#tRes"), ctx); updateFab(t("wa.ask.order", { kode: o.kode }));
      $("#tRes").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(er => toast(em(er), "error"));
  };
  app.onclick = e => {
    const b = e.target.closest(".ocard"); if (!b) return;
    if (!b.dataset.wa) { $("#byCode").open = true; $("#tk").value = b.dataset.k; $("#tw").focus(); toast(t("tr.needwa")); return; }
    openOrder(b.dataset.k, b.dataset.wa, b);
  };
  $("#tgo").onclick = () => {
    bad = false; const w = $("#tw").value.trim(), n = $("#tn").value.trim();
    chk("t-wa", !!normWa(w), t("v.wa")); chk("t-nama", n.length >= 2, t("v.name")); if (bad) return;
    $("#tMsg").innerHTML = ""; $("#tList").innerHTML = "";
    A.busy($("#tgo"), () => A.trackByPhone(w, n)).then(list => {
      if (!list) return; save("cs_lookup", { wa: w, nama: n });
      $("#tList").innerHTML = `<h3 style="margin-top:18px">${t("tr.results", { n: list.length })}</h3><div class="olist">${list.map(o => ocard(o, w)).join("")}</div>`;
      if (list.length === 1) openOrder(list[0].kode, w);
    }).catch(e => { $("#tMsg").innerHTML = notice(em(e), "error"); });
  };
  $("#tgo2").onclick = () => {
    bad = false; const w = $("#tw").value.trim(), k = $("#tk").value.trim().toUpperCase();
    chk("t-wa", !!normWa(w), t("v.wa")); chk("t-kode", k.length >= 5, t("v.code")); if (bad) return;
    openOrder(k, w, $("#tgo2"));
  };
  if (prefill) { const r = recent.find(x => x.kode === prefill && x.wa); if (r) openOrder(prefill, r.wa); else if (S.cust) openOrder(prefill, S.cust.whatsapp); else $("#byCode").open = true; }
}

/* ---------- Akun pelanggan (opsional) ---------- */
function updateAcct() {
  const a = $("#navAcct"); if (a) { a.textContent = S.cust ? t("nav.account") : t("nav.login"); a.href = S.cust ? "#/akun" : "#/masuk"; }
  $("#gAcctSub").textContent = S.cust ? t("gate.acct.as", { name: S.cust.nama }) : t("gate.acct.d");
  const bp = $("#btnProfile"); if (bp) bp.classList.toggle("on", !!S.cust);
}
const EYE = '<svg class="open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function pwInput(id, ac) { return `<div class="pwwrap"><input id="${id}" type="password" autocomplete="${ac}"><button type="button" class="eye" data-eye="${id}" aria-pressed="false" aria-label="${esc(t("pw.show"))}" title="${esc(t("pw.show"))}">${EYE}</button></div>`; }
function toggleEye(b) { const i = $("#" + b.dataset.eye), on = i.type === "password"; i.type = on ? "text" : "password"; b.setAttribute("aria-pressed", on); b.classList.toggle("on", on); const l = t(on ? "pw.hide" : "pw.show"); b.setAttribute("aria-label", l); b.title = l; }
function vAuth() {
  if (S.cust) { location.hash = "#/akun"; return; }
  const forms = {
    in: `<div class="field" id="a-email"><label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email"><div class="err"></div></div>
      <div class="field" id="a-pw"><label for="aPw">${t("au.pw")}</label>${pwInput("aPw", "current-password")}<div class="err"></div></div>
      <div id="aMsg"></div><button class="btn" id="aGo" data-loading="${esc(t("au.checking"))}">${t("au.signin")}</button>`,
    up: `<div class="field" id="a-nama"><label for="aNama">${t("au.name")}</label><input id="aNama" maxlength="60" autocomplete="name"><div class="err"></div></div>
      <div class="field" id="a-wa"><label for="aWa">${t("co.wa")}</label><input id="aWa" inputmode="tel" placeholder="081234567890" autocomplete="tel"><div class="err"></div></div>
      <div class="field" id="a-email"><label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email"><div class="err"></div></div>
      <div class="field" id="a-pw"><label for="aPw">${t("au.pw.new")}</label>${pwInput("aPw", "new-password")}<div class="err"></div></div>
      <div class="field" id="a-pw2"><label for="aPw2">${t("au.pw2")}</label>${pwInput("aPw2", "new-password")}<div class="err"></div></div>
      <div id="aMsg"></div><button class="btn" id="aGo" data-loading="${esc(t("au.creating"))}">${t("au.create")}</button>`
  };
  let tab = "in";
  show(`<section class="section" style="max-width:480px;margin:0 auto">${pageHead(t("au.title"), { href: "#/" })}<div class="card"><p class="muted">${t("au.optional")}</p>
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
    $$("[data-eye]").forEach(b => { b.onclick = () => toggleEye(b); });
  }
  $$("[data-t]").forEach(b => { b.onclick = () => { tab = b.dataset.t; paint(); }; });
  paint();
}
function doLogout() { return A.cust.logout().then(() => { S.cust = null; updateAcct(); closeAll(); toast(t("au.out"), "ok"); location.hash = "#/"; if (location.hash === "#/") route(); }); }
function vAccount(qs) {
  if (!S.cust) { location.hash = "#/masuk"; return; }
  const addrView = () => S.cust.alamat ? `${esc(S.cust.alamat)}, ${esc(S.cust.kota)}` : t("ac.addr.none");
  show(`<section class="section mid">${pageHead(t("nav.account"), { href: "#/" })}<div class="card" style="margin-bottom:18px"><p style="margin:0"><b>${esc(S.cust.nama)}</b><br>${esc(S.cust.email)}<br>WhatsApp: +${esc(S.cust.whatsapp)}</p>
    <button class="btn sm ghost" id="out" style="margin-top:12px">${t("au.signout")}</button></div>
    <div class="card" style="margin-bottom:18px"><h3>${t("ac.addr")}</h3><p class="muted" id="addrView">${addrView()}</p><button class="btn sm ghost" id="addrEdit">${t("ac.addr.edit")}</button>
      <div id="addrForm" hidden style="margin-top:12px">${locUi()}
        <div class="field" id="ad-alamat"><label for="adAlamat">${t("co.addr")}</label><textarea id="adAlamat" maxlength="300">${esc(S.cust.alamat || "")}</textarea><div class="err"></div></div>
        <div class="field" id="ad-kota"><label for="adKota">${t("co.city")}</label><input id="adKota" maxlength="60" value="${esc(S.cust.kota || "")}"><div class="err"></div></div>
        <div id="adMsg"></div><div style="display:flex;gap:10px"><button class="btn" id="adSave" data-loading="${esc(t("rv.sending"))}">${t("ac.addr.save")}</button><button class="btn ghost" id="adCancel" type="button">${t("ac.addr.cancel")}</button></div></div></div>
    <h2>${t("ac.orders")}</h2><div id="mine"><div class="loading"><div class="spin"></div>${t("loading")}</div></div><div id="mineRes" style="margin-top:16px"></div></section>`);
  $("#out").onclick = doLogout;
  $("#addrEdit").onclick = () => { $("#addrForm").hidden = false; $("#addrEdit").hidden = true; };
  $("#adCancel").onclick = () => { $("#addrForm").hidden = true; $("#addrEdit").hidden = false; };
  bindLocate("#locBtn", "#locMsg", r => { if (r.kota) $("#adKota").value = r.kota; if (!$("#adAlamat").value.trim() && r.alamat) $("#adAlamat").value = r.alamat; });
  $("#adSave").onclick = () => {
    const a = $("#adAlamat").value.trim(), k = $("#adKota").value.trim(); let bad = false;
    const chk = (id, ok, m) => { const el = $("#" + id); el.classList.toggle("bad", !ok); $(".err", el).textContent = ok ? "" : m; if (!ok) bad = true; };
    chk("ad-alamat", a.length >= 10, t("v.addr")); chk("ad-kota", k.length >= 2, t("v.city")); if (bad) return;
    A.busy($("#adSave"), () => A.cust.saveAddress(a, k)).then(r => { if (!r) return; S.cust = r.profil; $("#addrView").innerHTML = addrView(); $("#adMsg").innerHTML = notice(t("ac.addr.saved"), "ok"); $("#addrForm").hidden = true; $("#addrEdit").hidden = false; })
      .catch(er => { $("#adMsg").innerHTML = notice(em(er), "error"); });
  };
  const open = (kode, btn) => A.busy(btn, () => A.trackOrder(kode, "")).then(o => { if (!o) return; $("#mineRes").innerHTML = orderResult(o); bindReviews($("#mineRes"), { kode: o.kode, o }); updateFab(t("wa.ask.order", { kode: o.kode })); $("#mineRes").scrollIntoView({ behavior: "smooth" }); }).catch(er => toast(em(er), "error"));
  A.cust.orders().then(list => {
    $("#mine").innerHTML = list.length ? `<div class="card tablewrap"><table><thead><tr><th>${t("ac.no")}</th><th>${t("ac.date")}</th><th>${t("sum.total")}</th><th>${t("done.status")}</th><th></th></tr></thead><tbody>${list.map(o => `<tr><td>${esc(o.kode)}</td><td>${esc(String(o.dibuat).slice(0, 10))}</td><td>${rp(o.total)}</td><td><span class="pill">${esc(st(o.status))}</span></td><td><button class="btn sm ghost" data-k="${esc(o.kode)}">${t("ac.detail")}</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card"><p class="muted" style="margin:0">${t("ac.none")}</p></div>`;
    if (qs && qs.kode) open(qs.kode, null);
  }).catch(e => { if (e.code === "UNAUTHORIZED") { S.cust = null; updateAcct(); location.hash = "#/masuk"; } else $("#mine").innerHTML = notice(em(e), "error"); });
  $("#mine").onclick = ev => { const b = ev.target.closest("button[data-k]"); if (b) open(b.dataset.k, b); };
}

/* ---------- Cara retur ---------- */
function returnCard() { // dipakai di dalam halaman Bantuan
  const s = S.settings, days = Number(s.retur_hari) || 3;
  const txt = (lang === "en" && s.info_retur_en) ? s.info_retur_en : (s.info_retur || "");
  const custom = String(txt).split("\n").map(x => x.trim()).filter(Boolean);
  const steps = custom.length ? custom : [1, 2, 3, 4, 5].map(i => t("rt.step" + i, { days }));
  return `<div class="card" id="returSection" style="margin-bottom:16px"><h2>${t("rt.title")}</h2><p class="muted">${t("rt.intro", { days })}</p>
    <ol class="rsteps">${steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="#/lacak">${t("rt.cta")}</a>${waA(t("wa.ask.return"), "&#128172; " + t("wa.contact"), "btn ghost")}</div></div>`;
}

/* ---------- Bantuan (FAQ) ---------- */
function vInfo(toRetur) {
  const s = S.settings, wa = waNum();
  const contact = [wa ? "WhatsApp: +" + esc(wa) : "", s.email_toko ? "Email: " + esc(s.email_toko) : "", s.jam_operasional ? esc(s.jam_operasional) : ""].filter(Boolean);
  show(`<section class="section narrow">${pageHead(t("nav.help"), { href: "#/" })}<div class="card" style="margin-bottom:16px" id="faqSection">
    <div class="chips"><button type="button" class="chip" data-go="faqSection">${t("help.faq")}</button><button type="button" class="chip" data-go="returSection">${t("rt.title")}</button><button type="button" class="chip" data-go="contactSection">${t("f.contact")}</button></div>
    ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<details ${i === 1 ? "open" : ""}><summary><b>${t("faq.q" + i)}</b></summary><p>${t("faq.a" + i)}</p></details>`).join("")}</div>
    ${returnCard()}
    <div class="card" id="contactSection"><h2>${t("f.contact")}</h2>${contact.length ? `<ul>${contact.map(c => `<li>${c}</li>`).join("")}</ul>` : ""}<p>${waA(t("wa.ask.general"), "&#128172; " + t("wa.contact"), "btn")}</p></div></section>`);
  app.onclick = e => { const b = e.target.closest("[data-go]"); if (!b) return; const el = $("#" + b.dataset.go); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (toRetur) setTimeout(() => { const el = $("#returSection"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
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
      ${S.cust.alamat ? `<p class="muted">${t("ac.addr")}: ${esc(S.cust.alamat)}, ${esc(S.cust.kota)}</p>` : ""}
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
$("#btnMenu").onclick = () => { const o = !$("#nav").classList.contains("open"); closeAll(); if (o) { document.body.classList.add("navopen"); $("#nav").classList.add("open"); $("#overlay").hidden = false; $("#btnMenu").setAttribute("aria-expanded", "true"); } };
$("#nav").addEventListener("click", e => { if (e.target.closest("a")) closeAll(); });
$("#searchForm").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); location.hash = "#/produk" + (q ? "?q=" + encodeURIComponent(q) : ""); };

/* ---------- Mode: gerbang pilihan, toko, admin (satu tautan) ---------- */
function setMode(m) {
  $("#gate").hidden = m !== "gate"; $("#shop").hidden = m !== "shop"; $("#admin").hidden = m !== "admin"; closeAll();
  window.scrollTo(0, 0);
  if (m === "shop") { route(); visitOnce(); } else if (m === "admin") window.CSAdmin.start();
}
$("#gGuest").onclick = () => { if (location.hash === "" || location.hash === "#") location.hash = "#/"; setMode("shop"); };
$("#gAcct").onclick = () => { location.hash = S.cust ? "#/akun" : "#/masuk"; setMode("shop"); };
$("#gAdmin").onclick = () => setMode("admin");
$("#admShop").onclick = () => { location.hash = "#/"; setMode("shop"); };
$("#admGate").onclick = () => setMode("gate");
$("#skip").onclick = () => { (!$("#shop").hidden ? $("#app") : !$("#admin").hidden ? $("#adm") : $("#gGuest")).focus(); };
$$("[data-theme-set]").forEach(b => { b.onclick = () => applyTheme(b.dataset.themeSet, true); });
try { const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)"); if (mq && mq.addEventListener) mq.addEventListener("change", e => { let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (x) {} if (!saved) applyTheme(e.matches ? "dark" : "light", false); }); } catch (e) {}
$$(".lang button").forEach(b => { b.onclick = () => setLang(b.dataset.l); });
window.addEventListener("hashchange", () => { route(); });

applyStatic(); updateAcct(); updateBadge();
setMode("gate"); // beranda dan menu baru tampil setelah pengunjung memilih cara masuk
ensureData().catch(() => {}); // data dimuat lebih dulu selagi pengunjung memilih, sehingga beranda langsung muncul
if (A.cust.has()) { // pulihkan sesi akun tanpa menghambat tampilan awal
  A.cust.session().then(r => { S.cust = r.profil; updateAcct(); if (!$("#shop").hidden) route(); }).catch(() => {});
}
})();
