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
    "bad email": "Введите корректный email, например name@example.com",
    "bad username": "Имя пользователя: только английские буквы, цифры и символы . _ - (от 3 до 24 символов), без пробелов и русских букв",
    "weak password": "Пароль слишком короткий: минимум 8 символов",
  });
  // v51: верификация продавца через Telegram-бота по короткому коду (без номера телефона и без SMS)
  const SHI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
  window.verifyBox = v => {
    const wr = x => `<h2>Верификация продавца</h2><div class="vstack">${x}</div>`;
    if (v.verified) return wr(`<div class="card"><b>Верификация пройдена</b><p class="m" style="margin:6px 0 0">Вы можете создавать объявления.</p><button class="btn pri wr" style="margin-top:10px" onclick="go('/sell')">Создать объявление</button></div>`);
    return wr(`<div class="card"><b>Нужна верификация продавца</b><p class="m" style="margin:6px 0 10px">Чтобы публиковать объявления, подтвердите себя через Telegram. Это займёт минуту.</p><button class="btn pri wr" style="width:100%" onclick="go('/verify')">Пройти верификацию</button></div>`);
  };
  let vfT = null;
  window.vfEnter = act(async () => {
    const el = $("#vfin"), c = (el ? el.value : "").trim(); if (!c) return toast("Введите код из бота");
    try { await api("/verify/enter", { method: "POST", body: { code: c } }); ME = await api("/me"); toast("Верификация пройдена"); route() }
    catch (e) { const m = String(e && e.message || e); toast(/taken/.test(m) ? "Этот Telegram уже привязан к другому аккаунту" : /bad|wrong/.test(m) ? "Код неверный или устарел. Получите новый в боте" : m) }
  });
  window.verify = async function () {
    need(); const v = await vstat();
    const head = `<div class="vfh"><span class="vfi">${SHI}</span><div><h2>Верификация продавца</h2><p>Нужна один раз, чтобы публиковать объявления.</p></div></div>`;
    if (v.verified) return `<div class="vf">${head}<div class="card vfok"><span class="vfi ok">${SHI}</span><div><b>Верификация пройдена</b><p class="m">Ваш Telegram подтверждён. Можно создавать объявления.</p></div></div></div>`;
    if (!v.configured) return `<div class="vf">${head}<div class="card"><b>Верификация временно недоступна</b><p class="m">Бот пока не настроен на сервере. Не хватает переменных окружения: ${(v.missing || []).map(x => `<code>${esc(x)}</code>`).join(", ") || "TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET"}.</p></div></div>`;
    return `<div class="vf">${head}<div class="card vfc" id="vfb"><ol class="vfs">
      <li class="cur"><span class="vfn">1</span><div><b>Получите код в боте</b><p>Откройте бота и нажмите «Старт». Бот пришлёт код.</p><div class="vfa"><a class="btn pri" href="https://t.me/${esc(v.bot)}?start=code" target="_blank" rel="noopener">Открыть бота</a></div></div></li>
      <li class="cur"><span class="vfn">2</span><div><b>Введите код здесь</b><input id="vfin" class="in vfinp" maxlength="12" autocomplete="one-time-code" autocapitalize="characters" placeholder="Код из бота" onkeydown="if(event.key==='Enter')vfEnter()"><div class="vfa"><button class="btn pri" onclick="vfEnter()">Подтвердить</button></div><p>Код действует 15 минут.</p></div></li>
    </ol></div><p class="vfn2">Мы сохраняем только ваш Telegram ID, чтобы один Telegram нельзя было использовать для нескольких аккаунтов. Номер телефона и переписка нам недоступны.</p></div>`;
  };
  // v44: уведомление модератору «лот на проверке» и переход в очередь проверки
  NT6.listing_review = n => `На проверку: ${n.title}${n.reason ? " (" + n.reason + ")" : ""}`;
  window.notifPage = async function () {
    need(); const ns = await api("/notifications");
    api("/notifications/read", { method: "POST" }).then(() => { NOTIF = 0; nav(location.hash.slice(1) || "/") }).catch(() => { });
    const to = n => n.type === "listing_review" ? "/admin?tab=listings&st=pending" : ["price_drop", "flash"].includes(n.type) ? "/l/" + n.payload.listing_id : n.payload.order_id ? "/order/" + n.payload.order_id : "/orders";
    return `<h2>Уведомления</h2>${ns.map(n => `<div class="card" style="cursor:pointer;${n.read_at ? "opacity:.7" : ""}" onclick="go('${to(n)}')"><div>${ordLink(esc(notifText({ type: n.type, ...n.payload })), n.payload.order_id)}</div><small class="m">${new Date(n.created_at).toLocaleString("ru-RU")}</small></div>`).join("") || empty("Уведомлений пока нет.")}`;
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
    scroll: '<path d="M8 4h10a2 2 0 012 2v12a2 2 0 01-2 2H8"/><path d="M8 4a2 2 0 00-2 2v12a2 2 0 002 2"/><path d="M10 9h6M10 13h6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 115 0c0 1.500-2.500 2-2.500 3.500M12 17h.01"/>',
    admin: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>',
    exit: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>',
    login: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l4 4-4 4M14 12H3"/>',
    userplus: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0114 0M19 8v6M16 11h6"/>',
  };
  window.menu = function (kind, ev) {
    ev.stopPropagation(); const old = $("#um"); if (old) { old.remove(); return }
    const u = ME, svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MI[n]}</svg>`;
    const item = ([t, h, ic, bd, cls]) => `<a class="umi${cls ? " " + cls : ""}" onclick="${h ? `go('${h}')` : "logout()"}"><span class="umic">${svg(ic)}</span><span class="umt">${t}</span>${bd ? (String(bd).startsWith("<") ? bd : `<b class="bd2">${bd}</b>`) : ""}</a>`;
    let groups;
    if (!u) groups = [[["Войти", "/login", "login"], ["Регистрация", "/register", "userplus"]], [["Турниры", "/tournaments", "trophy"], ["Кодекс продавца", "/code", "scroll"], ["Безопасность", "/safety", "admin"], ["Настройки", "/settings", "gear"], ["Поддержка", "/tickets", "help"]]];
    else {
      const a = [["Мой профиль", "/u/" + u.username, "user"]]; if (u.is_seller) a.push(["Мои объявления", "/my", "list"]);
      a.push(["Мои покупки", "/orders?t=buy", "bag"]); if (u.is_seller) a.push(["Мои продажи", "/orders?t=sell", "coin"]); a.push(["Финансы", "/finance", "wallet", '<span class="umbal" id="umbal"></span>']);
      const b = [["Уведомления", "/notifications", "bell", NOTIF > 0 ? (NOTIF > 99 ? "99+" : NOTIF) : ""], ["Турниры", "/tournaments", "trophy"], ["Верификация продавца", "/verify", "check"], ["Кодекс продавца", "/code", "scroll"], ["Безопасность", "/safety", "admin"], ["Настройки", "/settings", "gear"], ["Поддержка", "/tickets", "help"]];
      if (isStaff()) b.push(["Админ-панель", "/admin", "admin"]);
      groups = [a, b, [["Выход", null, "exit", "", "out"]]];
    }
    const m = document.createElement("div"); m.id = "um"; m.className = "um2";
    m.innerHTML = groups.map(g => `<div class="umg">${g.map(item).join("")}</div>`).join("") + (window.uiLangRow ? window.uiLangRow() : ""); document.body.append(m);
    if (u) api("/me/balance").then(r => { const e = $("#umbal"); if (e) e.textContent = Number(r.balance).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽" }).catch(() => { });
  };

  // v52: метка страницы на body, чтобы настраивать вид для ПК
  const pgMark = () => { try { document.body.dataset.pg = location.hash.split("?")[0] || "#/" } catch { } };
  window.addEventListener("hashchange", pgMark); pgMark();
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
