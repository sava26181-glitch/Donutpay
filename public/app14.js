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
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".16"/><path d="M7.5 12.4l3.1 3.1 6-6.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    no: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.3 21.8 20.4H2.2z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.6v4.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.25" fill="currentColor"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 6v5.6c0 4.9-3.4 8.6-8 9.8-4.6-1.2-8-4.9-8-9.8V6z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7.8v5.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1.25" fill="currentColor"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arr: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // ---------- текст правил (цифры берутся из настроек сервера)
  const SECS = () => [
    { t: "Только внутренние сделки, никаких обходов", l: [
      ["no", "Запрещено переводить деньги продавцу напрямую: на карту, через СБП, по номеру телефона, в криптовалюте или на баланс мобильного телефона."],
      ["no", "Запрещено обсуждать детали сделки в Telegram, Discord, ВКонтакте или других мессенджерах. Все переговоры ведутся только в чате на сайте."],
      ["no", "Если продавец просит «перевести без комиссии на карту», это 100% мошенник."],
      ["ok", "Сделка проходит только через кнопку «Купить»."],
      ["no", "<b>Последствия:</b> при обходе сайта вы теряете право на защиту средств. Деньги не будут возвращены."]] },
    { t: "Мы никогда не просим ваши пароли", l: [
      ["ok", "Сотрудники DonutPay никогда не просят пароли от вашего личного кабинета, почты (Gmail, Yandex, Mail.ru) или игровых аккаунтов."],
      ["ok", "Мы никогда не просим коды из СМС для входа в ваш банк."],
      ["no", "Если вам пишет человек с логотипом администрации и просит пароль, это мошенник. Сразу отправьте скриншот в поддержку и заблокируйте его."]] },
    { t: "Безопасная сделка и холд " + hh(), l: [
      ["ok", `<b>Как это работает:</b> после оплаты деньги хранятся на DonutPay. Продавец получит их, только когда вы подтвердите выполнение заказа. Если продавец не прошёл верификацию, его выплата ещё ${hh()} остаётся замороженной.`],
      ["ok", "<b>Ваша задача:</b> проверьте товар до подтверждения: зайдите в аккаунт, проверьте донат."],
      ["ok", "Купили аккаунт: сразу смените пароль и привяжите свою почту. Если этого не сделать, претензии о том, что аккаунт вернул себе прежний владелец, не принимаются."],
      ["no", "<b>Запрещено:</b> нажимать «Подтвердить выполнение заказа», если вы не проверили товар. Если вы подтвердили, а аккаунт угнали через час, деньги уже у продавца, и вернуть их будет очень сложно."]] },
    { t: "Осторожно, подмена реквизитов", l: [
      ["no", "Если во время заказа продавец присылает «новую карту», номер телефона, ссылку или QR-код для оплаты, отказывайтесь и сообщите в поддержку."],
      ["no", "Мошенники часто «меняют карту» в последний момент. На DonutPay у сделки нет реквизитов продавца: вы платите только на самом сайте."]] },
    { t: "Запрет на передачу аккаунтов", l: [
      ["no", "Запрещено передавать третьим лицам доступ к вашему аккаунту на DonutPay. Все действия должны совершаться только вами."],
      ["no", "Если вы дали логин и пароль другу и он обманул покупателя, отвечать будете вы: аккаунт заблокируют, а средства заморозят."]] },
    { t: "Требования к продавцам и верификация", l: [
      ["ok", `Пока продавец не прошёл верификацию, деньги за каждую продажу замораживаются на ${hh()}.`],
      ["ok", `Без верификации можно вывести до ${rubS(SF.wd_limit)} в месяц. Чтобы выводить больше и без заморозки, подтвердите личность: короткое видео с лицом и паспортом.`],
      ["no", "Если имя владельца карты не совпадает с именем в паспорте, вывод останавливается до выяснения."],
      ["no", `Если продавец проиграл больше ${SF.dispute_pct}% споров от числа сделок (при ${SF.dispute_min} сделках и больше), продажи автоматически приостанавливаются, а его сделки проверяет администрация.`],
      ["ok", "Донат и валюту выдавайте с видео отправки (кнопка «Видео выдачи» в заказе). Для аккаунтов достаточно скриншота успешной смены пароля."]] },
    { t: "Как распознать мошенника", i: "Немедленно жалуйтесь в поддержку, если продавец:", l: [
      ["no", "Требует подтвердить сделку до проверки товара."],
      ["no", "Предлагает цену сильно ниже рыночной: это приманка."],
      ["no", "Просит зайти под его аккаунт или «помочь с выводом»."],
      ["no", "Говорит: «Давай в телеге договоримся, там без комиссии»."],
      ["no", "Пытается выманить ваши личные данные или данные вашей карты."]] },
    { t: "Ваша защита — это ваш пароль", l: [
      ["ok", "Используйте сложный пароль для входа на DonutPay. Не используйте пароль от почты или других сайтов."],
      ["ok", `Включите двухфакторную аутентификацию (2FA) в <a class="lk" onclick="sfGo('/settings')">настройках</a>: вход по коду из приложения.`]] }
  ];
  const li = r => `<li class="${r[0]}"><i>${I[r[0]]}</i><span>${r[1]}</span></li>`;
  const sec = (s, n) => `<section class="sf-s"><div class="sf-h"><span class="sf-n">${n}</span><h3>${s.t}</h3></div>${s.i ? `<p class="sf-in">${s.i}</p>` : ""}<ul class="sf-l">${s.l.map(li).join("")}</ul></section>`;
  const body = () => `<div class="sf-alert"><b>Внимание! Соблюдение этих правил — гарантия вашей безопасности.</b><span>Администрация DonutPay никогда не нарушает эти правила и требует того же от вас.</span></div>
${SECS().map((s, i) => sec(s, i + 1)).join("")}
<div class="sf-legal"><b>Юридическая оговорка</b>Покупатель и Продавец действуют на свой страх и риск в части передачи товара. Администрация DonutPay обеспечивает техническую безопасность сделки и сохранность денежных средств до момента подтверждения, но не несёт ответственности за качество игровых аккаунтов или за действия третьих лиц (например, разработчиков игры, которые могут заблокировать аккаунт).</div>`;
  window.sfGo = h => { sfClose(false); document.getElementById("md")?.remove(); go(h) };

  // ---------- страница #/safety
  window.safetyPage = async () => {
    await load(true);
    const acc = !uid() ? `<div class="sf-acc"><span>Чтобы покупать и продавать, войдите и подтвердите, что прочитали правила.</span><button class="btn pri" onclick="NEXT='/safety';go('/login')">Войти</button></div>`
      : SF.acked ? `<div class="sf-acc ok">${I.ok}<span>Вы приняли правила ${SF.acked_at ? dt(SF.acked_at) : ""}</span></div>`
        : `<div class="sf-acc"><span>Покупать и продавать можно после того, как вы прочитаете правила и согласитесь с ними.</span><button class="btn pri big" onclick="sfAcceptPage()">Я прочитал и согласен с правилами</button></div>`;
    return `<div class="sf-pg"><div class="sf-top"><span class="sf-badge">${I.shield}</span><div><h2>Безопасность DonutPay</h2><p class="m">Золотые правила сделок</p></div></div>${body()}${acc}</div>`;
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
    el.innerHTML = `<div class="bzr-box"><div class="bzr-hd"><span class="sf-badge sm">${I.shield}</span><b>Правила безопасности</b><button class="bzr-x" aria-label="Закрыть" onclick="sfClose(false)">${I.x}</button></div>
<div class="bzr-body" id="bzrb">${body()}<div id="sfend" class="bzr-end"></div></div>
<div class="bzr-ft">${accept ? `<small class="m" id="sfhint">Пролистайте правила до конца, чтобы согласиться</small><button class="btn pri big" id="sfok" disabled onclick="sfAccept()">Я прочитал и согласен</button>` : `<button class="btn big" onclick="sfClose(false)">Закрыть</button>`}</div></div>`;
    el.addEventListener("click", e => { if (e.target === el) sfClose(false) });
    document.body.append(el); document.body.classList.add("bzr-lock");
    if (!accept) return;
    const box = document.getElementById("bzrb"), end = document.getElementById("sfend");
    const unlock = () => { const b = document.getElementById("sfok"); if (!b || !b.disabled) return; b.disabled = false; const h = document.getElementById("sfhint"); if (h) h.textContent = "Спасибо, что дочитали" };
    const chk = () => { if (box.scrollTop + box.clientHeight >= box.scrollHeight - 30) unlock() };
    box.addEventListener("scroll", chk, { passive: true });
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { unlock(); io.disconnect() } }, { root: box, threshold: 0 }); io.observe(end) }
    setTimeout(chk, 50);
  });
  window.sfAccept = act(async () => {
    const b = document.getElementById("sfok"); if (b) b.disabled = true;
    try { await api("/safety/ack", { method: "POST" }); SF.acked = true; SF.acked_at = new Date().toISOString(); SF.uid = uid(); sfClose(true); toast("Правила приняты");
      document.querySelectorAll(".sfh-st").forEach(e => { e.className = "sfh-st ok"; e.innerHTML = I.ok + "Прочитано" }); document.querySelectorAll(".sfb").forEach(e => e.remove()) }
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
    const st = !uid() ? "" : SF.acked ? `<span class="sfh-st ok">${I.ok}Прочитано</span>` : `<span class="sfh-st no">Не прочитано</span>`;
    return `<div class="sfh" role="link" tabindex="0" onclick="go('/safety')" onkeydown="if(event.key==='Enter')go('/safety')"><div class="sfh-t"><span class="sfh-i">${I.shield}</span><span class="sfh-tt"><b>Безопасность</b><small>Золотые правила сделок</small></span>${st}</div>
<ul class="sf-l">${[["no", "Платите только кнопкой «Купить». Просят перевод на карту, значит мошенник"], ["no", "Общайтесь только в чате сайта, не в Telegram и Discord"], ["ok", "Мы никогда не просим пароли и коды из СМС"], ["no", "Не подтверждайте заказ, пока не проверили товар"]].map(li).join("")}</ul>
<span class="sfh-more">Прочитать все правила${I.arr}</span></div>`;
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
