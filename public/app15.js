// v70: минималистичные экраны: финансы, вывод, проверка личности, настройки, расположение в профиле
(() => {
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tm = d => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const when = d => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ARR = { in: "M12 5v14m0 0-5-5m5 5 5-5", out: "M12 19V5m0 0-5 5m5-5 5 5", wd: "M4 7h16v10H4zM4 11h16" };
  const ico = k => `<span class="xf-ic ${k === "in" ? "in" : ""}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ARR[k] || ARR.out}"/></svg></span>`;

  // ---------- финансы
  window.financePage = async function () {
    need(); const type = new URLSearchParams(location.hash.split("?")[1] || "").get("type") || "all", d = await api("/finance?type=" + type), tt = d.totals || {}; window._fin = d;
    const avail = d.available ?? d.balance, tabs = [["all", "Все"], ["in", "Доходы"], ["out", "Траты"], ["withdraw", "Выводы"]];
    const days = []; let cur = null;
    for (const o of d.ops) {
      const k = (typeof FK !== "undefined" && FK[o.kind]) || null, f = typeof k === "function" ? k(o) : k || [o.kind, "", "in"], day = typeof dayLbl === "function" ? dayLbl(o.created_at) : new Date(o.created_at).toLocaleDateString("ru-RU");
      if (!cur || cur.day !== day) { cur = { day, rows: [] }; days.push(cur) }
      const wait = o.kind === "withdraw" && (!o.w_status || o.w_status === "pending"), neg = o.amount < 0;
      cur.rows.push(`<div class="xf-row${wait ? " wait" : ""}"${o.ref_type === "order" ? ` onclick="go('/orders')"` : ""}>${ico(f[2])}<span class="xf-rb"><b>${E(f[0])}</b><small>${E(f[1])}${f[1] ? ", " : ""}${tm(o.created_at)}</small></span><b class="xf-amt${neg ? "" : " pos"}">${neg ? "−" : "+"}${fm(Math.abs(o.amount))}</b></div>`);
    }
    const ops = days.map(g => `<div class="xf-day">${E(g.day)}</div><div class="xf-g">${g.rows.join("")}</div>`).join("") || `<div class="xe" style="margin-top:12px"><b>Операций пока нет</b><span>Здесь появятся пополнения, покупки, продажи и выводы.</span></div>`;
    const holds = (d.holds || []).length ? `<div class="xf-holds">${d.holds.map(h => `<div class="xf-hold"><span>Заказ #${E(h.number)}<small>${h.release_at ? "освободится " + when(h.release_at) : "до решения спора"}</small></span><b>${fm(h.amount)}</b></div>`).join("")}</div>` : "";
    const note = d.id_verified ? "" : `<div class="xf-note"><span>Вывод до ${fm(d.wd_limit || 15000)} в месяц, осталось ${fm(d.wd_left ?? d.wd_limit ?? 15000)}. Выплаты за продажи ждут ${d.hold_hours || 72} ч.</span><a onclick="go('/identity')">Убрать лимит</a></div>`;
    return `<div class="xf"><div class="xf-top"><h2>Финансы</h2>${d.test_mode ? `<span class="xf-tag">Тестовый баланс</span>` : ""}</div>
<div class="xf-bal"><span class="xf-num">${fm(avail)}</span><small>Доступно</small></div>
<div class="xf-act"><button class="btn pri" onclick="withdrawForm(${avail})">Вывести</button><button class="btn" ${d.test_mode ? `onclick="topupForm()"` : "disabled"}>Пополнить</button></div>
<dl class="xf-kv"><div><dt>Заморожено</dt><dd>${fm(d.frozen || 0)}</dd></div><div><dt>На выводе</dt><dd>${fm(tt.pending || 0)}</dd></div><div><dt>Поступило</dt><dd>${fm(tt.in || 0)}</dd></div><div><dt>Потрачено</dt><dd>${fm(tt.out || 0)}</dd></div></dl>
${holds}${note}
<div class="tabs xf-tabs">${tabs.map(t => `<a class="${type === t[0] ? "on" : ""}" onclick="go('/finance?type=${t[0]}')">${t[1]}</a>`).join("")}</div>${ops}</div>`;
  };

  // ---------- вывод (id полей прежние: их читает withdrawDo)
  window.withdrawForm = async function (bal) {
    const fin = window._fin || {}, cap = fin.wd_limit ? Math.min(bal, fin.wd_left || 0) : bal;
    let pct = 3; try { pct = (await feesGet()).withdraw_pct } catch { }
    const a0 = Math.floor(cap) >= 10 ? Math.floor(cap) : 10;
    window._wdp = pct; window._wdm = "card"; window._wdb = cap;
    const M = [["card", "Карта"], ["sbp", "СБП"], ["crypto", "Крипта"], ["other", "Другое"]];
    mdl(`<div class="xw"><div class="xw-h"><h3>Вывод</h3><small>Доступно ${fm(bal)}</small></div>
<div class="xw-amt"><input id="wda" type="number" inputmode="decimal" min="10" value="${a0}" oninput="xwCalc()" aria-label="Сумма вывода"><span>₽</span></div>
<div class="xw-q">${[["25%", .25], ["50%", .5], ["Всё", 1]].map(x => `<button type="button" onclick="xwQ(${x[1]})">${x[0]}</button>`).join("")}</div>
<label>Куда</label><div class="wdm">${M.map((x, i) => `<button type="button" class="${i ? "" : "on"}" data-m="${x[0]}" onclick="wdM('${x[0]}')">${x[1]}</button>`).join("")}</div>
<input id="wdd" maxlength="200" placeholder="Номер карты, телефон или кошелёк" autocomplete="off">
<div id="wdhb"><input id="wdh" maxlength="80" autocomplete="name" placeholder="Имя и фамилия получателя, как в банке"></div>
<div class="xw-sum" id="xwc"></div>
${fin.wd_limit ? `<p class="xw-lim">Без проверки личности в этом месяце можно вывести ещё ${fm(fin.wd_left || 0)}. <a onclick="$('#md').remove();go('/identity')">Снять лимит</a></p>` : ""}
<button class="btn pri big" onclick="withdrawDo()">Отправить заявку</button>
${fin.test_mode ? `<p class="xw-note">Тестовый режим: деньги не переводятся.</p>` : ""}</div>`);
    xwCalc();
  };
  window.xwCalc = () => {
    const a = +document.getElementById("wda")?.value || 0, fee = Math.round(a * (window._wdp || 0)) / 100, e = document.getElementById("xwc");
    if (e) e.innerHTML = `<span>Вы получите<small>комиссия ${window._wdp || 0}%, ${fm(fee)}</small></span><b>${fm(Math.max(0, a - fee))}</b>`;
  };
  window.xwQ = k => { const e = document.getElementById("wda"); if (!e) return; e.value = Math.max(10, Math.floor((window._wdb || 0) * k)); xwCalc() };

  // ---------- проверка личности
  const STEPS = `<ol class="xi-steps"><li>Снимите видео на 10–40 секунд.</li><li>Покажите лицо и назовите вслух ник и сегодняшнюю дату.</li><li>Покажите паспорт на странице с фото. Серию и номер можно закрыть пальцем.</li></ol>`;
  window.kycBox = id => `<div class="kyc-box" id="kb-${id}">${STEPS}<input type="file" id="kf-${id}" accept="video/*" capture="user" hidden onchange="kycSend('${id}',this.files[0])"><button class="btn pri big" style="width:100%" onclick="document.getElementById('kf-${id}').click()">Снять видео</button><p class="xi-note">Видео видит только администратор.</p></div>`;
  window.identityPage = async () => {
    need(); const d = await api("/kyc/mine"), open = d.requests.find(r => r.status === "need" || r.status === "submitted"), last = d.requests[0];
    const dt = x => new Date(x).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    let body;
    if (d.verified) body = `<div class="xi-state ok"><b>Личность подтверждена</b><span>${dt(d.verified_at)}. Вывод без лимита, выплаты без заморозки.</span></div>`;
    else if (open && open.status === "submitted") body = `<div class="xi-state"><b>Видео на проверке</b><span>Отправлено ${dt(open.submitted_at)}. Обычно отвечаем в течение суток.</span></div>`;
    else if (open) body = `${open.kind === "order" ? `<div class="xi-state"><b>Заказ #${E(open.order_number)} ждёт проверки</b><span>${E(open.reason || "")}</span></div>` : ""}${window.kycBox(open.id)}`;
    else body = `${last && last.status === "rejected" ? `<div class="xi-state"><b>Прошлое видео отклонено</b><span>${E(last.note || "Причина не указана")}</span></div>` : ""}${STEPS}<button class="btn pri big" onclick="kycBegin()">Начать</button>`;
    return `<div class="xi"><h2>Проверка личности</h2><p class="xi-lead">Видео с лицом и паспортом, один раз. После проверки нет лимита на вывод и заморозки выплат.</p>${body}</div>`;
  };

  // ---------- настройки: обёртка задаёт порядок блоков (оформление первым)
  {
    const sp = window.settingsPage;
    window.settingsPage = function () { const h = sp.apply(this, arguments); return typeof h === "string" && ME ? `<div class="xs">${h}</div>` : h };
  }

  // ---------- редактор профиля: расположение без перетаскивания (Слева / По центру)
  window.xpLay = l => {
    if (typeof PV === "undefined") return; PV.layout = l === "center" ? "center" : "left"; PV.pos = {};
    document.querySelectorAll("#xplay button").forEach(b => b.classList.toggle("on", b.dataset.l === PV.layout)); pvr();
  };
})();

// v70: защита: тексты ошибок, уведомление о новом входе, проверка браузера, карточка «Защита от атак» в админке
(() => {
  try {
    Object.assign(ERR, { "bad origin": "Запрос отклонён: откройте DonutPay заново", "browser check required": "Проверка браузера: страница обновится", "server busy": "Сервер перегружен, попробуйте через пару секунд", "too many parallel requests": "Слишком много запросов сразу, подождите секунду" });
    NT6.new_login = n => `Вход с нового устройства: ${n.device || "неизвестное устройство"}. Если это не вы, смените пароль и выйдите на других устройствах в настройках`;
  } catch { }
  // если сайт включил проверку браузера, страница сама пройдёт её после перезагрузки
  try { const _a = api; let once = false; api = async function () { try { return await _a.apply(this, arguments) } catch (e) { if (!once && /Проверка браузера/.test(e && e.message || "")) { once = true; setTimeout(() => location.reload(), 600) } throw e } } } catch { }
  const card = s => `<div class="card xsh"><div class="xsh-h"><b>Защита от атак</b><span class="${s.active ? "on" : ""}">${s.active ? "Проверка браузера включена" : "Обычный режим"}</span></div>
<p class="m">${s.active ? E2(s.reason || "") + ". " : ""}Сейчас ${s.rps} запр./с, в работе ${s.inflight}, заблокировано IP: ${s.bans}.</p>
<div class="xp-seg">${[["auto", "Авто"], ["on", "Включить"], ["off", "Выключить"]].map(x => `<button type="button" class="${s.mode === x[0] ? "on" : ""}" onclick="shieldMode('${x[0]}')">${x[1]}</button>`).join("")}</div></div>`;
  const E2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.shieldMode = act(async m => { await api("/admin/shield", { method: "POST", body: { mode: m } }); toast(m === "on" ? "Проверка браузера включена" : m === "off" ? "Защита выключена" : "Защита в автоматическом режиме"); route() });
  const _ah = window.adHomeLoad;
  if (typeof _ah === "function") window.adHomeLoad = async function () {
    const h = await _ah.apply(this, arguments); if (typeof ME === "undefined" || !ME || !["admin", "owner"].includes(ME.role)) return h;
    try { const s = await api("/admin/shield"); return h.replace("<h3>Найти заказ или пользователя</h3>", card(s) + "<h3>Найти заказ или пользователя</h3>") } catch { return h }
  };
})();
