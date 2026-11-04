// v42: верификация продавца по SMS (Supabase Auth) вместо Telegram
(() => {
  Object.assign(ERR, {
    "sms not configured": "SMS-подтверждение пока не настроено на сервере",
    "bad phone": "Введите номер в формате +79991234567",
    "wrong code": "Неверный или просроченный код",
    "phone taken": "Этот номер уже используется",
    "already verified": "Вы уже прошли верификацию",
    "sms too often": "SMS можно запрашивать не чаще раза в минуту. Подождите и повторите",
    "too many sms attempts": "Слишком много запросов SMS. Попробуйте позже",
    "too many code attempts": "Слишком много попыток ввода кода. Подождите несколько минут",
    "sms service error": "Не удалось отправить SMS. Попробуйте позже",
  });
  const unavail = s => `<div class="card"><b>Верификация временно недоступна</b><p class="m">Способ подтверждения не настроен на сервере. Не хватает переменных окружения:</p><ul>${(s.missing || []).map(x => `<li><code>${esc(x)}</code></li>`).join("")}</ul></div>`;
  const smsForm = s => `<div class="card"><b>${s.tg_ok ? "Или подтвердите номер телефона" : "Подтвердите номер телефона"}</b><p class="m" style="margin:6px 0">Мы отправим SMS с кодом. Номер не показывается другим пользователям, сохраняются только последние 4 цифры. Один номер можно привязать только к одному аккаунту.</p>
<div id="sv1"><label for="svp">Номер телефона</label><input id="svp" type="tel" inputmode="tel" placeholder="+79991234567" autocomplete="tel" onkeydown="if(event.key==='Enter')svSend()"><button class="btn pri" style="width:100%;margin-top:10px" onclick="svSend()">Получить код</button></div>
<div id="sv2" hidden><label for="svc">Код из SMS</label><input id="svc" type="text" inputmode="numeric" maxlength="8" placeholder="123456" autocomplete="one-time-code" onkeydown="if(event.key==='Enter')svCheck()"><button class="btn pri" style="width:100%;margin-top:10px" onclick="svCheck()">Подтвердить</button><button id="svr" class="btn" style="width:100%;margin-top:8px" onclick="svSend()">Отправить код ещё раз</button><button class="btn" style="width:100%;margin-top:8px" onclick="svBack()">Изменить номер</button></div></div>`;
  const tgBlock = s => `<div class="card"><b>Подтвердите аккаунт через Telegram</b><p class="m" style="margin:6px 0">Нажмите кнопку и разрешите вход. Мы получаем только ваш Telegram ID: переписка и номер телефона нам недоступны. Один Telegram-аккаунт можно привязать только к одному продавцу.</p><div id="tgw" data-bot="${esc(s.tg_bot)}" style="min-height:48px;margin-top:10px"></div><p id="tgh" class="m" style="margin:8px 0 0" hidden>Кнопка не появилась: Telegram не открывается в вашей сети. Включите VPN или обновите страницу.</p></div>`;
  const botCard = () => `<div class="card"><b>Подтвердите Telegram</b><p class="m" style="margin:6px 0">Номер телефона не показывается другим пользователям, сохраняются только последние 4 цифры.</p><ol class="m"><li>Нажмите кнопку ниже: откроется Telegram-бот.</li><li>Нажмите «Старт» и поделитесь своим контактом кнопкой.</li><li>Вернитесь на сайт: статус обновится.</li></ol><button class="btn pri wr" style="width:100%" onclick="startV()">Перейти к Telegram-боту</button><button class="btn wr" style="width:100%;margin-top:8px" onclick="checkV()">Я подтвердил, проверить</button></div>`;
  window.verifyBox = v => {
    const h = window._vs, wr = x => `<h2>Верификация продавца</h2><div class="vstack">${x}</div>`;
    if (v.verified) return wr(`<div class="card"><b>Верификация пройдена</b><p class="m" style="margin:6px 0 0">Вы можете создавать объявления.</p><button class="btn pri wr" style="margin-top:10px" onclick="go('/sell')">Создать объявление</button></div>`);
    if (!h) return wr(`<div class="card"><b>Нужна верификация продавца</b><p class="m" style="margin:6px 0 10px">Чтобы публиковать объявления, подтвердите себя.</p><button class="btn pri wr" style="width:100%" onclick="go('/verify')">Пройти верификацию</button></div>`);
    const s = h.sms, b = h.bot, other = !!(b.configured || s.tg_ok);
    return wr((b.configured ? botCard() : "") + (s.tg_ok ? tgBlock(s) : "") + (s.configured ? smsForm({ ...s, tg_ok: other }) : "") + (!b.configured && !s.tg_ok && !s.configured ? unavail({ missing: b.missing || [] }) : ""));
  };
  const TGMSG = { ok: "Telegram подтверждён, верификация пройдена", taken: "Этот Telegram-аккаунт уже привязан к другому продавцу", bad: "Не удалось проверить данные Telegram. Попробуйте ещё раз", old: "Ссылка устарела. Нажмите кнопку Telegram ещё раз", off: "Вход через Telegram не настроен на сервере", already: "Вы уже прошли верификацию" };
  function mountTg() {
    const box = $("#tgw"); if (!box || box.dataset.m) return; box.dataset.m = 1;
    const sc = document.createElement("script"); sc.async = true; sc.src = "https://telegram.org/js/telegram-widget.js?22";
    sc.setAttribute("data-telegram-login", box.dataset.bot); sc.setAttribute("data-size", "large"); sc.setAttribute("data-radius", "10");
    sc.setAttribute("data-auth-url", location.origin + "/api/verify/tg/callback"); sc.setAttribute("data-request-access", "write");
    box.append(sc);
    setTimeout(() => { if (box.isConnected && !box.querySelector("iframe")) { const h = $("#tgh"); if (h) h.hidden = false } }, 7000);
  }
  window.verify = async function () {
    need();
    const [sms, bot] = await Promise.all([api("/verify/sms/status"), vstat()]);
    window._sms = sms; window._vs = { sms, bot };
    const m = /[?&]tg=(\w+)/.exec(location.hash);
    setTimeout(() => { mountTg(); if (m && TGMSG[m[1]]) toast(TGMSG[m[1]]) }, 60);
    return verifyBox({ verified: sms.verified || bot.verified }) + `<div class="card" style="margin-top:12px"><b>Кодекс продавца</b><p class="m" style="margin:6px 0 10px">Правила, которые продавец публично обязуется соблюдать. Подписанный кодекс обязателен для публикации лотов.</p><button class="btn wr" style="width:100%" onclick="go('/code')">Открыть Кодекс продавца</button></div>`;
  };
  // v44: уведомление модератору «лот на проверке» и переход в очередь проверки
  NT6.listing_review = n => `На проверку: ${n.title}${n.reason ? " (" + n.reason + ")" : ""}`;
  window.notifPage = async function () {
    need(); const ns = await api("/notifications");
    api("/notifications/read", { method: "POST" }).then(() => { NOTIF = 0; nav(location.hash.slice(1) || "/") }).catch(() => { });
    const to = n => n.type === "listing_review" ? "/admin?tab=listings&st=pending" : ["price_drop", "flash"].includes(n.type) ? "/l/" + n.payload.listing_id : n.payload.order_id ? "/order/" + n.payload.order_id : "/orders";
    return `<h2>Уведомления</h2>${ns.map(n => `<div class="card" style="cursor:pointer;${n.read_at ? "opacity:.7" : ""}" onclick="go('${to(n)}')"><div>${esc(notifText({ type: n.type, ...n.payload }))}</div><small class="m">${new Date(n.created_at).toLocaleString("ru-RU")}</small></div>`).join("") || empty("Уведомлений пока нет.")}`;
  };

  // v46: аккуратное главное меню (кнопка с тремя точками)
  const MI = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 016 0"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.500-1.500-2.500-1.500-1.400 0-2.500.8-2.500 2s1 1.800 2.500 2 2.500.8 2.500 2-1.100 2-2.500 2c-1 0-2-.5-2.500-1.500M12 6.500V8M12 16v1.500"/>',
    wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><path d="M3 7v10a2 2 0 002 2h15V9H5a2 2 0 01-2-2z"/><circle cx="16.500" cy="14" r="1"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.300 20a2 2 0 003.400 0"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M12 13v4M9 20h6M10 17h4"/>',
    check: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 00.3 1.800l.1.1a2 2 0 11-2.800 2.800l-.1-.1a1.700 1.700 0 00-1.800-.3 1.700 1.700 0 00-1 1.500V21a2 2 0 11-4 0v-.1a1.700 1.700 0 00-1-1.500 1.700 1.700 0 00-1.800.3l-.1.1a2 2 0 11-2.800-2.800l.1-.1a1.700 1.700 0 00.3-1.800 1.700 1.700 0 00-1.500-1H3a2 2 0 110-4h.1a1.700 1.700 0 001.500-1 1.700 1.700 0 00-.3-1.800l-.1-.1a2 2 0 112.800-2.800l.1.1a1.700 1.700 0 001.800.3h0a1.700 1.700 0 001-1.500V3a2 2 0 114 0v.1a1.700 1.700 0 001 1.500h0a1.700 1.700 0 001.800-.3l.1-.1a2 2 0 112.800 2.800l-.1.1a1.700 1.700 0 00-.3 1.800v0a1.700 1.700 0 001.500 1H21a2 2 0 110 4h-.1a1.700 1.700 0 00-1.500 1z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 115 0c0 1.500-2.500 2-2.500 3.500M12 17h.01"/>',
    admin: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>',
    exit: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>',
    login: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l4 4-4 4M14 12H3"/>',
    userplus: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0114 0M19 8v6M16 11h6"/>',
  };
  window.menu = function (kind, ev) {
    ev.stopPropagation(); const old = $("#um"); if (old) { old.remove(); return }
    const u = ME, svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MI[n]}</svg>`;
    const item = ([t, h, ic, bd, cls]) => `<a class="umi${cls ? " " + cls : ""}" onclick="${h ? `go('${h}')` : "logout()"}"><span class="umic">${svg(ic)}</span><span class="umt">${t}</span>${bd ? `<b class="bd2">${bd}</b>` : ""}</a>`;
    let groups;
    if (!u) groups = [[["Войти", "/login", "login"], ["Регистрация", "/register", "userplus"]], [["Турниры", "/tournaments", "trophy"], ["Настройки", "/settings", "gear"], ["Поддержка", "/tickets", "help"]]];
    else {
      const a = [["Мой профиль", "/u/" + u.username, "user"]]; if (u.is_seller) a.push(["Мои объявления", "/my", "list"]);
      a.push(["Мои покупки", "/orders?t=buy", "bag"]); if (u.is_seller) a.push(["Мои продажи", "/orders?t=sell", "coin"]); a.push(["Финансы", "/finance", "wallet"]);
      const b = [["Уведомления", "/notifications", "bell", NOTIF > 0 ? (NOTIF > 99 ? "99+" : NOTIF) : ""], ["Турниры", "/tournaments", "trophy"], ["Верификация продавца", "/verify", "check"], ["Настройки", "/settings", "gear"], ["Поддержка", "/tickets", "help"]];
      if (isStaff()) b.push(["Админ-панель", "/admin", "admin"]);
      groups = [a, b, [["Выход", null, "exit", "", "out"]]];
    }
    const m = document.createElement("div"); m.id = "um"; m.className = "um2";
    m.innerHTML = groups.map(g => `<div class="umg">${g.map(item).join("")}</div>`).join(""); document.body.append(m);
  };

  // v46: «онлайн» — страница раз в 30 секунд сообщает, что человек здесь (только пока вкладка открыта и видна)
  const beat = () => { if (typeof ME !== "undefined" && ME && document.visibilityState === "visible") api("/presence/ping", { method: "POST" }).catch(() => { }) };
  setInterval(beat, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beat(); else if (ME) { try { navigator.sendBeacon("/api/presence/off") } catch { } } });
  window.addEventListener("pagehide", () => { if (ME) { try { navigator.sendBeacon("/api/presence/off") } catch { } } });
  setTimeout(beat, 2500);
  let timer = null;
  const tick = () => {
    let left = 60; const b = $("#svr"); if (!b) return; b.disabled = true; clearInterval(timer);
    timer = setInterval(() => { const x = $("#svr"); if (!x) return clearInterval(timer); left--; x.textContent = left > 0 ? `Отправить код ещё раз (${left} с)` : "Отправить код ещё раз"; if (left <= 0) { clearInterval(timer); x.disabled = false } }, 1000);
  };
  const svSend = act(async () => {
    const p = $("#svp").value;
    await api("/verify/sms/send", { method: "POST", body: { phone: p } });
    $("#sv1").hidden = true; $("#sv2").hidden = false; $("#svc").focus(); toast("Код отправлен"); tick();
  });
  const svCheck = act(async () => {
    await api("/verify/sms/check", { method: "POST", body: { phone: $("#svp").value, code: $("#svc").value } });
    clearInterval(timer); ME = await api("/me"); toast("Номер подтверждён"); route();
  });
  const svBack = () => { clearInterval(timer); $("#sv2").hidden = true; $("#sv1").hidden = false; $("#svc").value = "" };
  Object.assign(window, { svSend, svCheck, svBack });
})();
