// v72: валюта отображения. Курс и выбор пользователя приходят с сервера, переключатель стоит в «Финансах».
(function () {
  const SYM = { RUB: "₽", USD: "$", EUR: "€" };
  const save = () => { try { localStorage.dp_cur = CUR.c; if (CUR.r) localStorage.dp_rates = JSON.stringify(CUR.r) } catch { } };
  let first = true;
  const refresh = async () => {
    try {
      const d = await (await fetch("/api/currency", { credentials: "same-origin" })).json();
      const before = CUR.c + "|" + (CUR.r && CUR.r.usd) + "|" + (CUR.r && CUR.r.eur);
      CUR.r = d.usd && d.eur ? { usd: d.usd, eur: d.eur, at: d.at, src: d.src } : null;
      if (d.mine) CUR.c = d.mine; // у вошедшего пользователя выбор хранится на сервере и совпадает на всех устройствах
      if (CUR.c !== "RUB" && !CUR.r) CUR.c = "RUB";
      save(); const after = CUR.c + "|" + (CUR.r && CUR.r.usd) + "|" + (CUR.r && CUR.r.eur);
      if (before !== after && !first && typeof route === "function") route();
      else if (before !== after && first && document.readyState === "complete" && typeof route === "function") route();
    } catch { } first = false;
  };
  refresh();
  // после входа и регистрации подтягиваем сохранённую валюту аккаунта
  const f0 = window.fetch;
  window.fetch = function (u, o) {
    const p = f0.apply(this, arguments);
    try { if (typeof u === "string" && /^\/api\/auth\/(login|google|register)/.test(u)) p.then(r => { if (r.ok) setTimeout(refresh, 400) }).catch(() => { }) } catch { }
    return p;
  };

  window.curSet = async c => {
    if (c === CUR.c) return;
    if (c !== "RUB" && !CUR.r) { toast("Курс валют пока недоступен"); return }
    const old = CUR.c; CUR.c = c; save();
    try { await api("/currency", { method: "POST", body: { c } }) } catch (e) { CUR.c = old; save(); toast(e.message || "Не получилось сменить валюту"); }
    route();
  };
  const dt = s => { try { return new Date(s + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) } catch { return s } };
  const sw = () => {
    const r = CUR.r, ok = !!r;
    const note = ok ? (CUR.c === "RUB" ? "" : `<p class="xf-rate">Курс ЦБ на ${dt(r.at)}: 1 ${SYM[CUR.c]} = ${(CUR.c === "USD" ? r.usd : r.eur).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽. Суммы показаны для удобства, оплата и вывод идут в рублях.</p>`) : `<p class="xf-rate">Курс валют пока недоступен, суммы показаны в рублях.</p>`;
    return `<div class="xp-seg xf-cur" role="group" aria-label="Валюта">${["RUB", "USD", "EUR"].map(c => `<button type="button" class="${CUR.c === c ? "on" : ""}"${c !== "RUB" && !ok ? " disabled" : ""} onclick="curSet('${c}')">${SYM[c]}</button>`).join("")}</div>${note}`;
  };
  window.curSw = sw;
  const _fp = window.financePage;
  if (typeof _fp === "function") window.financePage = async function () {
    const h = await _fp.apply(this, arguments);
    return h.replace('<div class="xf-bal">', sw() + '<div class="xf-bal">');
  };
})();
