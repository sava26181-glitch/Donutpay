// v69: раздел «Безопасность»: блок на главной, страница правил, обязательное прочтение перед покупкой и продажей.
// Админка: продавцы на паузе, имя получателя и флаги у заявок на вывод.
(() => {
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const C0 = (window.SITE_CFG0 && window.SITE_CFG0.safety) || {};
  const SF = window.SAFE_CFG = { ver: C0.ver || 1, hold_hours: C0.hold_hours || 72, wd_limit: C0.wd_limit || 15000, dispute_pct: C0.dispute_pct || 5, dispute_min: C0.dispute_min || 20, acked: false, acked_at: null, uid: undefined };
  const uid = () => (typeof ME !== "undefined" && ME ? ME.id : null);
  const load = async force => {
    if (!force && SF.uid === uid()) return SF;
    try { const r = await api("/safety"); Object.assign(SF, r); SF.uid = uid() } catch { }
    return SF;
  };
  window.safetyLoad = load;
  const pl = (n, a) => typeof plr2 === "function" ? plr2(n, a) : a[2];
  const hh = () => SF.hold_hours + " " + pl(SF.hold_hours, ["час", "часа", "часов"]);
  const rubS = n => Number(n).toLocaleString("ru-RU") + " ₽";
  const dt = d => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const I = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.6 12.3l3 3 5.8-6.4" fill="none" stroke="var(--pon,#fff)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    no: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 6v5.6c0 4.9-3.4 8.6-8 9.8-4.6-1.2-8-4.9-8-9.8V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.6 12.1l2.4 2.4 4.4-4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arr: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // ---------- правила: коротко; цифры берутся из настроек сервера
  const SECS = () => [
    { t: "Только сделки на сайте", l: [
      ["no", "Не переводите деньги продавцу напрямую: на карту, по СБП, по номеру телефона, в крипте или на баланс телефона."],
      ["no", "Не обсуждайте сделку в Telegram, Discord и ВКонтакте. Общение только в чате сайта."],
      ["no", "Просят «перевести без комиссии на карту» — это мошенник."],
      ["ok", "Платите только кнопкой «Купить»."],
      ["no", "Заплатили в обход сайта — защиты нет, деньги не вернуть."]] },
    { t: "Мы не просим пароли", l: [
      ["ok", "Сотрудники не спрашивают пароли от DonutPay, почты и игровых аккаунтов."],
      ["ok", "И никогда не просят коды из СМС от банка."],
      ["no", "Пишут «от администрации» и просят пароль — это мошенник. Скриншот в поддержку, автора в блок."]] },
    { t: "Сделка и холд " + hh(), l: [
      ["ok", `Деньги хранятся на DonutPay, пока вы не подтвердите заказ. Если продавец без верификации, его выплата ещё ${hh()} заморожена.`],
      ["ok", "Сначала проверьте товар: зайдите в аккаунт, проверьте донат."],
      ["ok", "Купили аккаунт — смените пароль и привяжите свою почту. Иначе претензии о возврате аккаунта не принимаются."],
      ["no", "Не нажимайте «Подтвердить выполнение заказа», пока не проверили товар. Потом вернуть деньги очень сложно."]] },
    { t: "Подмена реквизитов", l: [
      ["no", "Прислали «новую карту», телефон, ссылку или QR для оплаты — это мошенник. Напишите в поддержку."],
      ["ok", "У сделки нет реквизитов продавца: вы платите только на сайте."]] },
    { t: "Аккаунт только ваш", l: [
      ["no", "Не передавайте никому доступ к своему аккаунту DonutPay."],
      ["no", "Друг с вашим паролем обманул покупателя — отвечаете вы: аккаунт заблокируют, деньги заморозят."]] },
    { t: "Для продавцов", l: [
      ["ok", `Без верификации выплата замораживается на ${hh()}, а вывести можно до ${rubS(SF.wd_limit)} в месяц.`],
      ["ok", "Верификация — видео с лицом и паспортом. Она снимает и заморозку, и лимит."],
      ["no", "Имя на карте не совпадает с паспортом — вывод остановят до выяснения."],
      ["no", `Проиграли больше ${SF.dispute_pct}% споров (от ${SF.dispute_min} сделок) — продажи встанут на паузу до проверки.`],
      ["ok", "Донат и валюту выдавайте с видео отправки, аккаунты — со скриншотом смены пароля."]] },
    { t: "Как узнать мошенника", i: "Сразу пишите в поддержку, если продавец:", l: [
      ["no", "просит подтвердить заказ до проверки;"],
      ["no", "ставит цену сильно ниже рынка;"],
      ["no", "зовёт зайти в его аккаунт или «помочь с выводом»;"],
      ["no", "предлагает «договориться в телеге без комиссии»;"],
      ["no", "выспрашивает личные данные или данные карты."]] },
    { t: "Пароль", l: [
      ["ok", "Отдельный сложный пароль для DonutPay, не от почты и не от других сайтов."],
      ["ok", `Включите вход по коду из приложения в <a class="lk" onclick="sfGo('/settings')">настройках</a>.`]] }
  ];
  const li = r => `<li class="${r[0]}"><i>${I[r[0]]}</i><span>${r[1]}</span></li>`;
  const sec = s => `<section class="sf-s"><h3>${s.t}</h3>${s.i ? `<p class="sf-in">${s.i}</p>` : ""}<ul class="sf-l">${s.l.map(li).join("")}</ul></section>`;
  const body = () => `<p class="sf-lead">Соблюдайте их — и сделка под защитой. Мы их не нарушаем и ждём того же от вас.</p>
<div class="sf-list">${SECS().map(sec).join("")}</div>
<p class="sf-legal">Покупатель и продавец сами отвечают за передачу товара. DonutPay отвечает за безопасность сделки и сохранность денег до подтверждения заказа, но не за качество аккаунтов и не за действия третьих лиц, например блокировку аккаунта разработчиком игры.</p>`;
  window.sfGo = h => { sfClose(false); document.getElementById("md")?.remove(); go(h) };

  // ---------- страница #/safety
  window.safetyPage = async () => {
    await load(true);
    const acc = !uid() ? `<div class="sf-acc"><span>Войдите, чтобы принять правила.</span><button class="btn pri" onclick="NEXT='/safety';go('/login')">Войти</button></div>`
      : SF.acked ? `<div class="sf-acc ok">${I.ok}<span>Вы приняли правила ${SF.acked_at ? dt(SF.acked_at) : ""}</span></div>`
        : `<div class="sf-acc"><button class="btn pri big" onclick="sfAcceptPage()">Я прочитал и согласен</button></div>`;
    return `<div class="sf-pg"><div class="sf-top"><h2>Безопасность</h2>${uid() && !SF.acked ? `<span class="sfh-st no">Не прочитана</span>` : ""}</div>${body()}${acc}</div>`;
  };
  window.sfAcceptPage = act(async () => { await api("/safety/ack", { method: "POST" }); await load(true); toast("Спасибо! Правила приняты"); route() });

  // ---------- окно «дочитать до конца»: без этого кнопка согласия не нажимается
  let done = null;
  window.sfClose = ok => {
    const el = document.getElementById("bzr"); if (!el) return;
    el.remove(); document.body.classList.remove("bzr-lock");
    const d = done; done = null; if (d) d(!!ok);
  };
  const openReader = mode => new Promise(res => {
    document.getElementById("bzr")?.remove(); done = res;
    const accept = mode === "accept";
    const el = document.createElement("div"); el.id = "bzr"; el.className = "bzr"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Правила безопасности");
    el.innerHTML = `<div class="bzr-box"><div class="bzr-hd"><b>Правила безопасности</b><button class="bzr-x" aria-label="Закрыть" onclick="sfClose(false)">${I.x}</button></div>
<div class="bzr-body" id="bzrb">${body()}<div id="sfend" class="bzr-end"></div></div>
<div class="bzr-ft">${accept ? `<small class="m" id="sfhint">Дочитайте до конца</small><button class="btn pri big" id="sfok" disabled onclick="sfAccept()">Я прочитал и согласен</button>` : `<button class="btn big" onclick="sfClose(false)">Закрыть</button>`}</div></div>`;
    el.addEventListener("click", e => { if (e.target === el) sfClose(false) });
    document.body.append(el); document.body.classList.add("bzr-lock");
    if (!accept) return;
    const box = document.getElementById("bzrb"), end = document.getElementById("sfend");
    const unlock = () => { const b = document.getElementById("sfok"); if (!b || !b.disabled) return; b.disabled = false; const h = document.getElementById("sfhint"); if (h) h.textContent = "Готово" };
    const chk = () => { if (box.scrollTop + box.clientHeight >= box.scrollHeight - 30) unlock() };
    box.addEventListener("scroll", chk, { passive: true });
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { unlock(); io.disconnect() } }, { root: box, threshold: 0 }); io.observe(end) }
    setTimeout(chk, 50);
  });
  window.sfAccept = act(async () => {
    const b = document.getElementById("sfok"); if (b) b.disabled = true;
    try { await api("/safety/ack", { method: "POST" }); SF.acked = true; SF.acked_at = new Date().toISOString(); SF.uid = uid(); sfClose(true); toast("Правила приняты");
      document.querySelectorAll(".sfh .sfh-st, .sf-top .sfh-st").forEach(e => { e.className = "sfh-st ok"; e.innerHTML = I.ok + "Прочитана" }); document.querySelectorAll(".sfb").forEach(e => e.remove()) }
    catch (e) { if (b) b.disabled = false; throw e }
  });
  window.safetyOpen = () => { load(); openReader(SF.acked || !uid() ? "view" : "accept").then(ok => { if (ok) sfSync(true) }) };
  // true, если правила уже приняты или пользователь только что дочитал и согласился
  window.safetyEnsure = async () => { if (!uid()) { need(); return false } await load(); if (SF.acked) return true; return openReader("accept") };

  // ---------- галочка в оформлении заказа
  const sfSync = force => {
    const cb = document.getElementById("sfc"); if (!cb) return;
    if (force === true) cb.checked = true;
    document.querySelectorAll("[data-sfneed]").forEach(b => { b.disabled = !cb.checked });
  };
  window.sfToggle = async cb => {
    if (cb.checked) { await load(); if (!SF.acked) { cb.checked = false; sfSync(); const ok = await window.safetyEnsure(); cb.checked = ok } }
    sfSync();
  };
  window.sfCheckHtml = () => `<label class="ckok sfck"><input type="checkbox" id="sfc" onchange="sfToggle(this)"><span>Я прочитал и согласен с <a class="lk" onclick="event.preventDefault();event.stopPropagation();safetyOpen()">правилами безопасности</a> (в том числе с запретом общения вне сайта)</span></label>`;

  // ---------- блок на главной под плитками «Дуэли магазинов» и «Кодекс продавца»
  const homeBlock = () => {
    const st = !uid() ? "" : SF.acked ? `<span class="sfh-st ok">${I.ok}Прочитана</span>` : `<span class="sfh-st no">Не прочитана</span>`;
    return `<a class="sfh" onclick="go('/safety')"><span class="sfh-i">${I.shield}</span><span class="sfh-tt"><b>Безопасность</b><small>Правила сделок</small></span>${st}</a>`;
  };
  {
    const _home = window.home;
    window.home = async function () {
      const [h] = await Promise.all([_home.apply(this, arguments), load()]);
      if (typeof h !== "string") return h;
      const i = h.indexOf('<div class="qk">'); if (i < 0) return homeBlock() + h;
      const j = h.indexOf("</div>", i); if (j < 0) return h;
      return h.slice(0, j + 6) + homeBlock() + h.slice(j + 6);
    };
  }

  // ---------- продажа: перед первым объявлением правила нужно прочитать
  {
    const _sell = window.sell;
    window.sell = async function () {
      const h = await _sell.apply(this, arguments);
      if (typeof h !== "string" || !uid() || !/createL2\(/.test(h)) return h;
      await load(); if (SF.acked) return h;
      const ban = `<div class="sfb"><i>${I.no}</i><div><b>Прочитайте правила безопасности</b><small>Без этого опубликовать объявление не получится</small></div><button class="btn sm pri" onclick="safetyEnsure().then(ok=>{if(ok)route()})">Прочитать</button></div>`;
      return h.includes("</h2>") ? h.replace("</h2>", "</h2>" + ban) : ban + h;
    };
  }

  // ---------- подвал и уведомления
  try {
    const _ft = window.ftHtml;
    if (typeof _ft === "function") {
      window.ftHtml = function () { const h = _ft.apply(this, arguments); return h.includes("go('/safety')") ? h : h.replace('<nav class="ft2l">', `<nav class="ft2l"><a onclick="go('/safety')">Безопасность</a>`) };
      const f = document.querySelector("#ft"); if (f) f.innerHTML = window.ftHtml();
    }
  } catch { }
  try {
    NT6.sales_paused = n => `Продажи приостановлены: ${n.reason || "много проигранных споров"}. Администрация проверит сделки и свяжется с вами`;
    NT6.sales_resumed = () => "Продажи снова открыты: проверка администрации завершена";
  } catch { }

  // ---------- админка: продавцы на паузе
  window.adPaused = async () => {
    const rs = await api("/admin/paused-sellers"), tabs = window.adTabs ? window.adTabs("") : "";
    return `<h2>Админ-панель</h2>${tabs}<h3 style="margin:4px 0 10px">Продажи на паузе</h3><p class="m" style="margin:-4px 0 12px">Продавец проиграл больше ${SF.dispute_pct}% споров (от ${SF.dispute_min} сделок). Новые заказы у него не создаются, пока вы не снимете паузу. Если нарушение подтвердилось, заблокируйте его в разделе «Пользователи».</p>`
      + (rs.map(r => `<div class="card"><div class="row bet"><b><a class="lk" onclick="go('/u/${encodeURIComponent(r.username)}')">${E(r.username)}</a></b><span class="m">${new Date(r.sales_paused_at).toLocaleString("ru-RU")}</span></div><div class="m" style="margin:4px 0 8px">${E(r.sales_pause_reason || "")}. Сделок: ${r.deals}, незакрытых заказов: ${r.open_orders}</div><button class="btn sm pri" onclick="adResume('${r.id}')">Снять паузу</button></div>`).join("") || `<div class="card m">Продавцов на паузе нет.</div>`);
  };
  window.adResume = act(async id => { await api(`/admin/paused-sellers/${id}/resume`, { method: "POST" }); toast("Пауза снята"); route() });
  {
    const _adm = window.admin;
    window.admin = async function () {
      const t = new URLSearchParams(location.hash.split("?")[1] || "").get("tab");
      if (t === "paused" && typeof isStaff === "function" && isStaff()) return window.adPaused();
      return _adm.apply(this, arguments);
    };
  }

  // ---------- админка: заявки на вывод с именем получателя и флагами проверки
  try {
    window.wdAdmin = async function () {
      const ws = await api("/admin/withdrawals"), M = { card: "Карта", sbp: "СБП", crypto: "Крипта", other: "Другое" };
      return ws.map(w => {
        const fl = Array.isArray(w.flags) ? w.flags : [], bad = fl.filter(f => f.bad), info = fl.filter(f => !f.bad);
        const open = ["pending", "processing"].includes(w.status);
        return `<div class="card${bad.length && open ? " wdbad" : ""}"><div class="row bet"><b>${E(w.username)} · ${fm(w.amount)}</b><span class="tag">${{ pending: "Ожидает", processing: "В обработке", paid: "Выплачено", rejected: "Отклонено" }[w.status]}</span></div>
${bad.length && open ? `<div class="wdfl">${bad.map(f => `<div>${I.no}<span>${E(f.t)}</span></div>`).join("")}<small>Не выплачивайте, пока не выясните</small></div>` : ""}
<div class="m">К выплате: <b>${fm(w.amount - (w.fee || 0))}</b> (комиссия ${fm(w.fee || 0)})</div><div class="m">${M[w.method] || E(w.method)}: ${E(w.details)}</div>${w.holder ? `<div class="m">Получатель: <b>${E(w.holder)}</b></div>` : ""}<div class="m">${w.verified ? `Паспорт: <b>${E(w.id_name || "подтверждён")}</b>` : "Личность не подтверждена"}</div>
${info.filter(f => f.k !== "unverified").length ? `<div class="wdin">${info.filter(f => f.k !== "unverified").map(f => `<span>${E(f.t)}</span>`).join("")}</div>` : ""}
<small class="m">${typeof fmtD === "function" ? fmtD(w.created_at) : new Date(w.created_at).toLocaleDateString("ru-RU")}</small>${open ? `<div class="row" style="margin-top:8px">${w.status === "pending" ? `<button class="btn sm" onclick="wdAct('${w.id}','processing')">Взять в работу</button>` : ""}<button class="btn sm pri" onclick="wdAct('${w.id}','paid')">Выплачено</button><button class="btn sm dng" onclick="wdAct('${w.id}','reject')">Отклонить и вернуть</button></div>` : ""}</div>`;
      }).join("") || empty("Заявок на вывод нет.");
    };
  } catch { }
})();
