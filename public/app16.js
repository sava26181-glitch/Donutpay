// v71: признаки эмулятора Android (отправляются на сервер заголовком X-Env), красная кнопка СТОП в админке, пометка в форме вывода
(function () {
  // ---------- эмулятор: считаем один раз за вкладку
  const detect = () => {
    try {
      const ua = navigator.userAgent || ""; if (!/Android/i.test(ua)) return "";
      const bad = [];
      if (/bluestacks|genymotion|ldplayer|nox|memu|andy|droid4x|koplayer|mumu|sdk_gphone|android sdk built for|vbox86|emulator/i.test(ua)) bad.push("ua");
      const plat = String(navigator.platform || "");
      if (/win|mac|x86_64|i686|i386|x86/i.test(plat)) bad.push("plat"); // настоящие телефоны: «Linux armv8l»
      let gpu = ""; try { const c = document.createElement("canvas"), g = c.getContext("webgl") || c.getContext("experimental-webgl"); if (g) { const x = g.getExtension("WEBGL_debug_renderer_info"); gpu = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL) || "") + " " + String(g.getParameter(x.UNMASKED_VENDOR_WEBGL) || "") : "" } } catch { }
      // видеокарты компьютеров и программная отрисовка: у телефонов Adreno, Mali, PowerVR, Immortalis, Xclipse
      if (gpu && !/adreno|mali|powervr|immortalis|xclipse|tegra|apple/i.test(gpu) && /swiftshader|llvmpipe|mesa|virtualbox|vmware|android emulator|bluestacks|genymotion|nvidia|geforce|radeon|\bamd\b|\bati\b|intel|direct3d|d3d1|microsoft basic|angle \(/i.test(gpu)) bad.push("gpu");
      return bad.length ? "emu:" + bad.join(",") : "";
    } catch { return "" }
  };
  let env = ""; try { env = sessionStorage.dpenv; if (env === undefined || env === null) { env = detect(); sessionStorage.dpenv = env } } catch { env = detect() }
  if (env) {
    const f = window.fetch;
    window.fetch = function (u, o) {
      try { if (typeof u === "string" && u.startsWith("/api")) { o = o || {}; o.headers = { ...(o.headers || {}), "X-Env": env } } } catch { }
      return f.call(this, u, o);
    };
  }

  // ---------- красная кнопка СТОП: только владельцы
  const E2 = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mins = sec => { const m = Math.max(1, Math.ceil(sec / 60)); return m >= 60 ? Math.floor(m / 60) + " ч " + (m % 60 ? m % 60 + " мин" : "") : m + " мин" };
  const card = s => s.active
    ? `<div class="card xpn on"><div class="xpn-t"><b>СТОП включён</b><span id="xpn-left">осталось ${mins(s.left_sec)}</span></div>
<p class="m">Регистрация и вывод средств закрыты. Включил: ${E2(s.by || "владелец")}. Откроется само.</p>
<button class="btn" onclick="panicSet(false)">Снять СТОП</button></div>`
    : `<div class="card xpn"><div class="xpn-t"><b>Красная кнопка</b><span>только для владельцев</span></div>
<p class="m">Закрывает регистрацию и вывод средств на ${s.minutes >= 60 ? s.minutes / 60 + " ч" : s.minutes + " мин"}. Для случая, когда началась массовая атака.</p>
<button class="xpn-btn" onclick="panicSet(true)">СТОП</button>${s.emulators_today ? `<p class="m xpn-e">Эмуляторов заблокировано за сутки: ${s.emulators_today}</p>` : ""}</div>`;
  window.panicSet = (typeof act === "function" ? act : f => f)(async on => {
    await api("/admin/panic", { method: "POST", body: { on } });
    toast(on ? "СТОП включён: регистрация и вывод закрыты" : "СТОП снят"); route();
  });
  const _ah = window.adHomeLoad;
  if (typeof _ah === "function") window.adHomeLoad = async function () {
    const h = await _ah.apply(this, arguments); if (typeof ME === "undefined" || !ME || ME.role !== "owner") return h;
    try { const s = await api("/admin/panic"); return card(s) + h } catch { return h }
  };

  // ---------- вывод закрыт кнопкой СТОП: пишем об этом сразу, а не после нажатия
  const _wf = window.withdrawForm;
  if (typeof _wf === "function") window.withdrawForm = async function (bal) {
    const fin = window._fin || {};
    if (fin.wd_paused) { mdl(`<div class="xw"><div class="xw-h"><h3>Вывод</h3></div><p class="xw-note" style="font-size:14px;color:var(--t)">Вывод средств временно приостановлен из соображений безопасности. Деньги в сохранности. Попробуйте позже.</p><button class="btn big" style="width:100%" onclick="$('#md').remove()">Понятно</button></div>`); return }
    return _wf.apply(this, arguments);
  };
})();
