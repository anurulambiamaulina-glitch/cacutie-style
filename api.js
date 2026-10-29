/* api.js - satu-satunya pintu komunikasi ke Google Apps Script.
   Baca data publik : JSONP (tag <script>, GET)
   Tulis / admin    : form POST -> iframe tersembunyi -> jawaban via postMessage
   Sukses hanya dilaporkan jika backend benar-benar menjawab. */
(function (w) {
  "use strict";
  var CFG = w.CS_CONFIG || {}, TOKEN_KEY = "cs_admin_token", pending = {};

  function ApiError(code, message) { this.name = "ApiError"; this.code = code; this.message = message; }
  ApiError.prototype = Object.create(Error.prototype);

  function log() { if (CFG.DEBUG && w.console) console.log.apply(console, ["[API]"].concat([].slice.call(arguments))); }
  function rid() {
    var a = new Uint8Array(16); w.crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function base() {
    var u = String(CFG.API_URL || "");
    if (u.indexOf("https://script.google.com/") !== 0 || !/\/exec$/.test(u)) {
      throw new ApiError("CONFIG", "URL backend belum diisi. Buka js/config.js dan isi API_URL dengan URL Web App (berakhiran /exec).");
    }
    return u;
  }
  function unwrap(res) {
    if (res && res.ok === true) return res.data;
    var e = (res && res.error) || {};
    throw new ApiError(e.code || "UNKNOWN", e.message || "Terjadi kesalahan. Coba lagi.");
  }

  function get(action, params) {
    return new Promise(function (resolve, reject) {
      var url; try { url = base(); } catch (e) { return reject(e); }
      var cb = "cb_" + rid(), s = document.createElement("script"), done = false;
      function end() { done = true; clearTimeout(t); w[cb] = function () {}; if (s.parentNode) s.parentNode.removeChild(s); }
      var t = setTimeout(function () { if (!done) { end(); reject(new ApiError("TIMEOUT", "Server tidak merespons. Periksa koneksi internet lalu coba lagi.")); } }, CFG.GET_TIMEOUT_MS || 20000);
      w[cb] = function (res) { if (done) return; end(); try { resolve(unwrap(res)); } catch (e) { reject(e); } };
      s.onerror = function () { if (!done) { end(); reject(new ApiError("NETWORK", "Gagal menghubungi server. Pastikan URL backend benar dan deployment diatur ke akses 'Anyone'.")); } };
      var q = { action: action, callback: cb, _: Date.now() };
      Object.keys(params || {}).forEach(function (k) { q[k] = params[k]; });
      log("GET", action);
      s.async = true;
      s.src = url + "?" + Object.keys(q).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(q[k]); }).join("&");
      document.head.appendChild(s);
    });
  }

  function field(f, n, v) { var i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); }

  function post(action, data, token) {
    return new Promise(function (resolve, reject) {
      var url; try { url = base(); } catch (e) { return reject(e); }
      var id = rid(), name = "csf_" + id;
      var fr = document.createElement("iframe"); fr.name = name; fr.title = "api"; fr.tabIndex = -1;
      fr.setAttribute("aria-hidden", "true"); fr.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
      var f = document.createElement("form"); f.method = "POST"; f.action = url; f.target = name; f.style.display = "none";
      field(f, "rid", id); field(f, "payload", JSON.stringify({ action: action, token: token || null, data: data || {} }));
      function cleanup() { clearTimeout(t); delete pending[id]; if (fr.parentNode) fr.parentNode.removeChild(fr); if (f.parentNode) f.parentNode.removeChild(f); }
      var t = setTimeout(function () { cleanup(); reject(new ApiError("TIMEOUT", "Server belum merespons. Status permintaan belum pasti.")); }, CFG.POST_TIMEOUT_MS || 30000);
      pending[id] = { resolve: resolve, reject: reject, cleanup: cleanup };
      log("POST", action);
      document.body.appendChild(fr); document.body.appendChild(f); f.submit();
    });
  }

  // Satu listener untuk semua jawaban POST. Validasi: origin, bentuk pesan, dan rid (nonce acak).
  w.addEventListener("message", function (ev) {
    if (!/^https:\/\/[a-z0-9.-]+\.googleusercontent\.com$/i.test(ev.origin)) { log("ditolak, origin:", ev.origin); return; }
    var m = ev.data;
    if (!m || typeof m !== "object" || m.source !== "cacutie-api" || typeof m.rid !== "string") return;
    var p = pending[m.rid]; if (!p) return;
    p.cleanup();
    try { p.resolve(unwrap(m.result)); } catch (e) { p.reject(e); }
  });

  function tok() { try { return w.sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setTok(v) { try { v ? w.sessionStorage.setItem(TOKEN_KEY, v) : w.sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  // Cegah klik ganda: tombol dikunci sampai proses selesai
  function busy(btn, fn) {
    if (!btn) return Promise.resolve().then(fn);
    if (btn.getAttribute("data-busy")) return Promise.resolve();
    var label = btn.textContent;
    btn.setAttribute("data-busy", "1"); btn.disabled = true;
    btn.textContent = btn.getAttribute("data-loading") || "Memproses...";
    function back() { btn.removeAttribute("data-busy"); btn.disabled = false; btn.textContent = label; }
    return Promise.resolve().then(fn).then(function (r) { back(); return r; }, function (e) { back(); throw e; });
  }

  w.CSApi = {
    ApiError: ApiError, newKey: rid, busy: busy,
    products: function () { return get("products"); },
    settings: function () { return get("settings"); },
    reviews: function (pid) { return get("reviews", { product_id: pid }); },
    createOrder: function (o) { return post("createOrder", o); },
    trackOrder: function (kode, whatsapp) { return post("trackOrder", { kode: kode, whatsapp: whatsapp }); },
    submitReview: function (r) { return post("submitReview", r); },
    admin: {
      has: function () { return !!tok(); },
      login: function (key) { return post("adminLogin", { key: key }).then(function (r) { setTok(r.token); return r; }); },
      logout: function () { var t = tok(); setTok(null); return t ? post("adminLogout", {}, t) : Promise.resolve(); },
      call: function (action, data) {
        var t = tok();
        if (!t) return Promise.reject(new ApiError("UNAUTHORIZED", "Silakan login admin terlebih dahulu."));
        return post(action, data, t).catch(function (e) { if (e.code === "UNAUTHORIZED") setTok(null); throw e; });
      }
    }
  };
})(window);
