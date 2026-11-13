// v78: нагрузочный тест в админке (только владельцы)
(function () {
  const E2 = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const N = x => Math.round(Number(x || 0)).toLocaleString("ru-RU"), R1 = x => Number(x || 0).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  const V = { good: ["Выдержал", "ok"], ok: ["Справился, но тяжело", "mid"], bad: ["Не выдержал", "no"] };
  let timer = 0, armed = 0;
  const res = L => {
    if (!L) return "";
    if (L.failed) return `<div class="xld-res"><b class="xld-v no">Тест не удался</b><p class="m">${E2(L.failed)}</p></div>`;
    const v = V[L.verdict] || V.bad;
    return `<div class="xld-res"><b class="xld-v ${v[1]}">${v[0]}</b>${L.stopped ? `<p class="m">Остановлен: ${E2(L.stopped)}</p>` : ""}
<div class="xld-g"><div><small>Пользователей</small><b>${N(L.users)}</b></div><div><small>Запросов в секунду</small><b>${R1(L.rps)}</b></div><div><small>Ответ у 95%</small><b>${N(L.p95)} мс</b></div><div><small>Ошибок</small><b>${L.err_pct}%</b></div></div>
<p class="m xld-s">Медиана ${N(L.p50)} мс, худший ${N(L.max)} мс. Всего ${N(L.requests)} запросов за ${L.seconds} с. Память ${L.rss_mb} МБ, пауза сервера до ${L.lag_max} мс.</p>
<details><summary>По страницам</summary><div class="xld-t">${(L.endpoints || []).map(e => `<div><span>${E2(e.path)}</span><span>${N(e.p95)} мс</span><span>${e.err ? e.err + " ош." : "ок"}</span></div>`).join("")}</div></details>
${L.cleanup && L.cleanup.left ? `<p class="m" style="color:#e5484d">Тестовые пользователи удалились не полностью: осталось ${L.cleanup.left}</p>` : `<p class="m">Тестовые пользователи удалены.</p>`}</div>`;
  };
  const card = s => {
    const j = s.job;
    if (s.running) return `<div class="card xld on" id="xld"><div class="xld-t1"><b>Нагрузка идёт</b><span>${j.phase}</span></div>
<div class="xld-g"><div><small>Осталось</small><b>${j.left} с</b></div><div><small>Запросов</small><b>${N(j.requests)}</b></div><div><small>Ошибок</small><b>${N(j.errors)}</b></div><div><small>Медиана</small><b>${N(j.p50)} мс</b></div></div>
<button class="btn" onclick="loadStop()">Остановить</button></div>`;
    return `<div class="card xld" id="xld"><div class="xld-t1"><b>Нагрузка на сервер</b><span>только владельцы</span></div>
<p class="m">Виртуальные пользователи ходят по сайту: каталог, товары, профиль, финансы. После теста они удаляются. Тест идёт на боевом сайте, у настоящих посетителей в это время может тормозить, лучше ночью.</p>
<div class="xld-f"><label>Пользователей<input id="xld-u" type="number" min="10" max="${s.max_users}" value="1000"></label><label>Секунд<input id="xld-s" type="number" min="10" max="${s.max_seconds}" value="60"></label></div>
<button class="btn pri" id="xld-b" onclick="loadGo()">Запустить</button>${res(s.last)}</div>`;
  };
  const paint = async () => { const el = document.getElementById("xld"); if (!el) { clearInterval(timer); timer = 0; return } try { const s = await api("/admin/load"); const was = el.classList.contains("on"); if (!s.running && !was && !document.activeElement?.closest?.("#xld")) { } if (s.running || was) el.outerHTML = card(s); if (!s.running) { clearInterval(timer); timer = 0 } } catch { } };
  const poll = () => { if (!timer) timer = setInterval(paint, 2000) };
  window.loadGo = (typeof act === "function" ? act : f => f)(async () => {
    const b = document.getElementById("xld-b");
    if (!armed || Date.now() - armed > 6000) { armed = Date.now(); if (b) b.textContent = "Точно запустить? Нажмите ещё раз"; return }
    armed = 0;
    await api("/admin/load", { method: "POST", body: { users: +document.getElementById("xld-u").value || 1000, seconds: +document.getElementById("xld-s").value || 60 } });
    toast("Тест запущен"); const s = await api("/admin/load"); const el = document.getElementById("xld"); if (el) el.outerHTML = card(s); poll();
  });
  window.loadStop = (typeof act === "function" ? act : f => f)(async () => { await api("/admin/load/stop", { method: "POST" }); toast("Останавливаю"); poll() });
  const _ah = window.adHomeLoad;
  if (typeof _ah === "function") window.adHomeLoad = async function () {
    const h = await _ah.apply(this, arguments); if (typeof ME === "undefined" || !ME || ME.role !== "owner") return h;
    try { const s = await api("/admin/load"); if (s.running) setTimeout(poll, 300); return h + card(s) } catch { return h }
  };
})();
