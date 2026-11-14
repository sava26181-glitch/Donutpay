// v65: простая админка: один экран «Что проверить» с цифрами, жалобы, цифра в меню
(() => {
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const orig = window.admin;
  const ROWS = (c, ad) => [
    ["listings", "Объявления на проверке", "/admin?tab=listings&st=pending"],
    ["disputes", "Открытые споры", "/admin?tab=disputes"],
    ["tickets", "Обращения ждут ответа", "/admin?tab=tickets"],
    ["reports", "Жалобы", "/admin?tab=reports"],
    ["tournaments", "Турниры идут: подвести итог", "/tournaments"],
    ["paused", "Продажи на паузе: споры больше 5%", "/admin?tab=paused"],
    ...(ad ? [["kyc", "Видео-верификация: проверить", "/admin?tab=kyc"], ["withdrawals", "Выводы в обработке", "/admin?tab=withdrawals"]] : [])
  ].map(r => ({ k: r[0], t: r[1], h: r[2], n: +c[r[0]] || 0 }));
  const tabsHtml = t => `<div class="tabs">${[["home", "Что проверить"], ["listings", "Объявления"], ["users", "Пользователи"], ["orders", "Заказы"], ["disputes", "Споры"], ["tickets", "Обращения"], ["reports", "Жалобы"], ...(["admin", "owner"].includes(ME.role) ? [["kyc", "Верификация"]] : []), ["more", "Ещё"]].map(x => `<a class="${t === x[0] ? "on" : ""}" onclick="go('/admin?tab=${x[0]}')">${x[1]}</a>`).join("")}</div>`;
  window.adTabs = tabsHtml;
  window.adHomeLoad = async () => {
    const c = await api("/admin/counts").catch(() => ({})), ad = ["admin", "owner"].includes(ME.role), rows = ROWS(c, ad), todo = rows.filter(r => r.n > 0), done = rows.filter(r => !r.n);
    const row = r => `<div class="card adq${r.n ? " has" : ""}" data-nofilter="1" onclick="go('${r.h}')"><b class="adn">${r.n}</b><span>${r.t}</span><i>›</i></div>`;
    return `<h2>Админ-панель</h2>${tabsHtml("home")}<div class="adtot">${c.total ? `Нужно проверить: <b>${c.total}</b>` : "Всё проверено"}</div>${todo.map(row).join("")}${done.length ? `<div class="adz m">Проверять нечего</div>${done.map(row).join("")}` : ""}<h3>Найти заказ или пользователя</h3><div class="row" style="flex-wrap:nowrap"><input id="oq" placeholder="Номер заказа, ник или ID" onkeydown="if(event.key==='Enter')adHome()" style="margin:0"><button class="btn pri" onclick="adHome()">Найти</button></div>`;
  };
  window.adRepClose = act(async id => { await api("/admin/report-close/" + id, { method: "POST" }); toast("Жалоба закрыта"); route() });
  window.adReports = async () => {
    const rs = await api("/admin/report-list"), T = { listing: "объявление", user: "пользователь", message: "сообщение" };
    const go_ = r => r.target_type === "listing" ? `go('/l/${r.target_id}')` : r.target_type === "user" ? `go('/u/${encodeURIComponent(r.target_name || "")}')` : "";
    return `<h2>Админ-панель</h2>${tabsHtml("reports")}` + (rs.map(r => `<div class="card"><div class="row bet"><b>${T[r.target_type] || r.target_type}${r.target_name ? ": " + E(r.target_name) : ""}</b><span class="m">${new Date(r.created_at).toLocaleString("ru-RU")}</span></div><p style="overflow-wrap:anywhere">${E(r.reason)}</p><div class="m">Пожаловался: ${E(r.reporter)}</div><div class="row" style="margin-top:8px">${go_(r) ? `<button class="btn sm" onclick="${go_(r)}">Открыть</button>` : ""}<button class="btn sm pri" onclick="adRepClose('${r.id}')">Закрыть жалобу</button></div></div>`).join("") || `<div class="card m">Жалоб нет.</div>`);
  };
  window.admin = async function () {
    need(); if (!isStaff()) return orig();
    const t = new URLSearchParams(location.hash.split("?")[1] || "").get("tab") || "home";
    if (t === "home") return window.adHomeLoad();
    if (t === "reports") return window.adReports();
    if (t === "kyc" && ["admin", "owner"].includes(ME.role)) return window.adKyc();
    const h = await orig();
    return typeof h === "string" ? h.replace(/>Обзор<\/a>/, ">Что проверить</a>").replace(/(onclick="go\('\/admin\?tab=tickets'\)">Обращения<\/a>)/, `$1<a onclick="go('/admin?tab=reports')">Жалобы</a>`) : h;
  };
  // цифра «сколько проверить» в меню и на значке профиля
  const mark = n => { document.querySelectorAll(".admn").forEach(e => e.remove()); if (!(n > 0)) return; document.querySelectorAll("#um a, #um button, .um a").forEach(a => { if (/Админ-панель/.test(a.textContent) && !a.querySelector(".admn")) a.insertAdjacentHTML("beforeend", `<b class="admn">${n > 99 ? "99+" : n}</b>`) }) };
  const poll = async () => { try { if (typeof ME === "undefined" || !ME || !isStaff() || document.hidden) return; const c = await api("/admin/counts"); window.ADM_N = c.total; mark(c.total); if (/^#\/admin(\?tab=home)?$/.test(location.hash) && !document.getElementById("md")) { const el = document.querySelector("#app .adtot"); if (el) route() } } catch { } };
  setInterval(poll, 20000); setTimeout(poll, 2500);
  new MutationObserver(() => { if (window.ADM_N > 0 && !document.querySelector(".admn")) mark(window.ADM_N) }).observe(document.body, { childList: true, subtree: true });
})();

// v67: вход и регистрация через Google
(() => {
  const cid = () => (typeof SITE_CFG !== "undefined" && SITE_CFG && SITE_CFG.google) || "";
  const oa = window.auth;
  window.auth = function (mode) {
    const h = oa(mode); if (!cid()) return h;
    return h.replace('<div class="au-links">', `<div class="au-or"><span>или</span></div><div id="gbtn" class="gbtn" data-notr="1"></div><div class="au-links">`);
  };
  window.gDone = act(async r => {
    const u = await api("/auth/google", { method: "POST", body: { credential: r.credential } });
    ME = u; await afterLogin(); const n = NEXT; NEXT = ""; go(n === "PROFILE" || !n ? "/u/" + ME.username : n);
  });
  const mount = () => {
    const b = document.getElementById("gbtn"); if (!b || b.dataset.m || !cid()) return; b.dataset.m = "1";
    const go_ = () => { try { google.accounts.id.initialize({ client_id: cid(), callback: gDone, ux_mode: "popup" }); google.accounts.id.renderButton(b, { theme: "filled_black", size: "large", text: "continue_with", shape: "pill", locale: (localStorage.dp_ui === "en" ? "en" : "ru"), width: Math.min(340, b.clientWidth || 300) }) } catch { } };
    if (window.google && google.accounts) go_(); else { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = go_; document.head.append(s) }
  };
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
})();

// v66: уведомления из чатов в Telegram (бот donutvolume)
(() => {
  const sp = window.settingsPage;
  window.settingsPage = function () {
    const h = sp.apply(this, arguments); if (typeof h !== "string" || !ME) return h;
    setTimeout(ntFill, 0); return h.replace('<div class="secw" id="secp">', '<div class="secw" id="ntcw"></div><div class="secw" id="secp">');
  };
  async function ntFill() {
    const box = document.getElementById("ntcw"); if (!box) return;
    let s; try { s = await api("/me/notify") } catch { return }
    if (!s.configured) { box.remove(); return }
    const body = !s.linked
      ? `<p class="ntp">Сообщения из чатов, пока вас нет на сайте.</p><button class="btn pri" onclick="ntLink()">Подключить Telegram</button>`
      : `<label class="ntsw"><input type="checkbox" ${s.on ? "checked" : ""} onchange="ntToggle(this.checked)"><span>Присылать сообщения из чатов</span></label><div class="row" style="gap:8px;margin-top:10px"><button class="btn sm" onclick="ntTest()">Отправить проверку</button><button class="btn sm" onclick="ntUnlink()">Отключить</button></div>`;
    box.innerHTML = `<div class="card sx ntc"><b>Уведомления в Telegram</b>${body}</div>`;
  }
  window.ntLink = act(async () => { const r = await api("/me/notify/link", { method: "POST" }); window.open(r.url, "_blank", "noopener"); toast("Нажмите «Старт» в боте @" + r.bot + ", затем вернитесь сюда"); const t0 = Date.now(), iv = setInterval(async () => { if (!document.getElementById("ntcw") || Date.now() - t0 > 180000) return clearInterval(iv); try { const s = await api("/me/notify"); if (s.linked) { clearInterval(iv); ntFill(); toast("Telegram подключён") } } catch { } }, 3000) });
  window.ntToggle = act(async on => { await api("/me/notify/toggle", { method: "POST", body: { on } }); toast(on ? "Уведомления включены" : "Уведомления выключены") });
  window.ntTest = act(async () => { await api("/me/notify/test", { method: "POST" }); toast("Проверка отправлена, посмотрите Telegram") });
  window.ntUnlink = act(async () => { await api("/me/notify/unlink", { method: "POST" }); toast("Telegram отключён"); ntFill() });
})();

// v66: поддержка: список и форма обращения
(() => {
  const E_ = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ST = { new: "new", in_review: "rev", awaiting_user: "await", resolved: "done", closed: "off" };
  const ago = iso => { const d = new Date(iso), m = Math.max(0, Math.floor((Date.now() - d) / 6e4)); if (m < 1) return "только что"; if (m < 60) return m + " мин назад"; if (m < 1440) return Math.floor(m / 60) + " ч назад"; return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) };
  window.tkCat = c => { window._tkc = c; document.querySelectorAll(".tkch button").forEach(b => b.classList.toggle("on", b.dataset.c === c)) };
  window.tkCount = () => { const t = document.getElementById("tb"), n = document.getElementById("tbn"); if (t && n) n.textContent = t.value.length + " / 3000" };
  window.newT2 = act(async () => {
    const subject = ($("#ts").value || "").trim(), body = ($("#tb").value || "").trim();
    if (subject.length < 3) throw new Error("Напишите тему обращения: минимум 3 символа"); if (body.length < 10) throw new Error("Опишите проблему подробнее: минимум 10 символов");
    const r = await api("/tickets", { method: "POST", body: { category: window._tkc || "other", orderId: $("#to").value || undefined, subject, body, attachmentId: ATT?.id } }); clearAtt(); document.getElementById("md")?.remove(); toast("Обращение отправлено"); go("/tickets/" + r.id);
  });
  window.tickets = async function (id) {
    need(); const p = qp(); if (id) return ticketView(id);
    const [ts, os, ds] = await Promise.all([api("/tickets"), api("/orders"), api("/my/disputes")]), isNew = !!p.get("new"); window._tkc = window._tkc || "other";
    const form = `<div class="tkf"><div class="tkh"><b>Новое обращение</b><a class="tkx" onclick="go('/tickets')">Отмена</a></div>
      <label>О чём вопрос</label><div class="tkch">${Object.entries(TCAT).map(c => `<button type="button" data-c="${c[0]}" class="${window._tkc === c[0] ? "on" : ""}" onclick="tkCat('${c[0]}')">${c[1]}</button>`).join("")}</div>
      <label>Заказ <small class="m">если вопрос по нему</small></label><select id="to"><option value="">Не связано с заказом</option>${os.map(o => `<option value="${o.id}">${E_(o.title)} · ${rub(o.total_cents)}</option>`).join("")}</select>
      <label>Тема</label><input id="ts" maxlength="120" placeholder="Коротко, в чём проблема">
      <label>Подробности</label><textarea id="tb" rows="5" maxlength="3000" oninput="tkCount()" placeholder="Что произошло, когда и что вы уже пробовали"></textarea><div class="tkn" id="tbn">0 / 3000</div>
      <div id="achip"></div><div class="tka"><button class="btn" onclick="pickAtt('ticket')">Прикрепить файл</button></div>
      <div class="abar"><button class="btn pri" onclick="newT2()">Отправить обращение</button></div></div>`;
    const row = t => `<a class="tkr" onclick="go('/tickets/${t.id}')"><i class="tks ${ST[t.status] || ""}"></i><span class="tkm"><b>${E_(t.subject)}</b><small>${TCAT[t.category] || ""} · ${ago(t.updated_at)}</small></span><em>${TST[t.status] || ""}</em></a>`;
    const drow = d => `<a class="tkr" onclick="go('/dispute/${d.id}')"><i class="tks rev"></i><span class="tkm"><b>${E_(d.reason.slice(0, 80))}</b><small>Спор по заказу</small></span><em>${E_(DSL[d.status] || d.status)}</em></a>`;
    return `<div class="tk"><div class="tkt"><h2>Поддержка</h2>${isNew ? "" : `<button class="btn pri" onclick="go('/tickets?new=1')">Написать</button>`}</div>
      <p class="tks0">Отвечаем на обращения по заказам, оплате и аккаунту. Ответ придёт в уведомления.</p>${isNew ? form : ""}
      <div class="tkl"><div class="tkg">Мои обращения</div>${ts.map(row).join("") || `<div class="tke">Обращений пока нет</div>`}</div>
      ${ds.length ? `<div class="tkl"><div class="tkg">Споры</div>${ds.map(drow).join("")}</div>` : ""}</div>`;
  };
})();

// v66: настоящие причины ошибок по-русски
try{Object.assign(ERR,{"sign seller code first": "Сначала подпишите Кодекс продавца: меню, раздел «Кодекс продавца»", "seller verification required": "Нужна верификация продавца: меню, раздел «Верификация продавца»", "become a seller first": "Сначала включите режим продавца в профиле", "unknown game or category": "Выберите игру и категорию из списка", "unknown category": "Такой категории нет", "category not available for this game": "Для этой игры нельзя выбрать такую категорию", "bad image": "Картинка не найдена на сервере: загрузите её заново", "bad upload": "Файл не удалось загрузить: выберите картинку png, jpeg, webp или gif", "bad media": "Картинка не найдена: загрузите её заново", "file too large": "Файл слишком большой: максимум 5 МБ", "only png, jpeg, webp, gif": "Допустимы только png, jpeg, webp и gif", "gif only for cover": "GIF можно использовать только для обложки", "media limit reached": "Загружено слишком много картинок. Удалите ненужные объявления", "too many uploads": "Слишком много загрузок подряд, подождите минуту", "not found": "Не найдено", "forbidden": "Недостаточно прав для этого действия", "invalid input": "Проверьте введённые данные: какое-то поле заполнено неверно", "listing unavailable": "Объявление недоступно", "listing not active": "Объявление сейчас не опубликовано", "own listing": "Нельзя купить своё объявление", "not enough stock": "Столько товара нет в наличии", "no stock": "Товар закончился", "not enough funds": "Недостаточно средств на балансе", "bad quantity": "Количество: целое число от 1 до 1000", "body 1-2000 chars": "Сообщение должно быть от 1 до 2000 символов", "too many new chats": "Слишком много новых чатов за короткое время", "account blocked": "Аккаунт заблокирован", "blocked": "Аккаунт заблокирован", "email or username taken": "Такая почта или имя пользователя уже заняты", "wrong email or password": "Неверная почта или пароль", "weak password": "Пароль слишком простой: минимум 8 символов", "bad email": "Проверьте адрес почты", "bad username": "Имя пользователя: 3–24 символа, буквы, цифры, точка, дефис, подчёркивание", "telegram taken": "Этот Telegram уже привязан к другому аккаунту", "wrong code": "Код неверный или устарел. Получите новый в боте", "bad code": "Код должен состоять из 6 символов", "verification unavailable": "Верификация временно недоступна", "telegram unavailable": "Telegram сейчас недоступен", "too many attempts": "Слишком много попыток. Подождите немного", "reason too short": "Опишите причину подробнее: минимум 5 символов", "ticket closed": "Обращение закрыто", "order cancelled": "Заказ отменён", "already processed": "Уже обработано", "transition not allowed": "Это действие сейчас недоступно для заказа", "dispute closed": "Спор уже закрыт", "dispute not available": "Спор по этому заказу открыть нельзя", "translation failed": "Не удалось перевести, попробуйте позже", "cooldown 6h": "Это действие доступно раз в 6 часов", "duel limit: one per 24h": "Дуэль можно создать раз в 24 часа"})}catch{}

// v67: элементы шапки профиля не выходят за карточку (при перетаскивании и на любой ширине экрана) + кнопки «По центру»
(() => {
  const parse = el => { const m = /translate:\s*(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(el.getAttribute("style") || ""); return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 } };
  const put = (el, p) => { el.style.translate = Math.round(p.x) + "px " + Math.round(p.y) + "px" };
  const fit = el => {
    const pf = el.closest(".pf"); if (!pf) return null; const r = el.getBoundingClientRect(), b = pf.getBoundingClientRect(); if (!r.width) return null;
    let dx = 0, dy = 0; if (r.left < b.left + 6) dx = b.left + 6 - r.left; else if (r.right > b.right - 6) dx = b.right - 6 - r.right;
    if (r.top < b.top + 6) dy = b.top + 6 - r.top; else if (r.bottom > b.bottom - 6) dy = b.bottom - 6 - r.bottom;
    if (!dx && !dy) return null; const p = parse(el); const n = { x: p.x + dx, y: p.y + dy }; put(el, n); return n;
  };
  document.addEventListener("pointermove", e => { if (!e.buttons || typeof PV === "undefined" || !PV.pos) return; document.querySelectorAll("#pvw [data-drag]").forEach(x => { const n = fit(x); if (n && PV.pos[x.dataset.drag]) PV.pos[x.dataset.drag] = { x: Math.round(n.x), y: Math.round(n.y) } }) });
  document.addEventListener("pointerup", () => { document.querySelectorAll("#pvw [data-drag]").forEach(x => { const n = fit(x); if (n && typeof PV !== "undefined" && PV.pos && PV.pos[x.dataset.drag]) PV.pos[x.dataset.drag] = { x: Math.round(n.x), y: Math.round(n.y) } }) });
  const sweep = () => document.querySelectorAll(".pf [style*='translate:']").forEach(el => { if (!el.closest("#pvw")) fit(el) });
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(() => requestAnimationFrame(sweep), 80) };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); addEventListener("resize", later); addEventListener("load", later);
  window.pvCenter = k => {
    const el = document.querySelector(`#pvw [data-drag="${k}"]`), pf = el && el.closest(".pf"); if (!el || typeof PV === "undefined") return;
    el.style.translate = "0px " + (parse(el).y) + "px"; const r = el.getBoundingClientRect(), b = pf.getBoundingClientRect(), x = Math.round((b.left + b.width / 2) - (r.left + r.width / 2));
    PV.pos = PV.pos || {}; let p = { x, y: parse(el).y }; put(el, p); const av = k !== "avatar" && document.querySelector('#pvw [data-drag="avatar"]');
    if (av) { const a = av.getBoundingClientRect(), n = el.getBoundingClientRect(); if (n.left < a.right && n.right > a.left && n.top < a.bottom && n.bottom > a.top) { p = { x, y: p.y + (a.bottom - n.top) + 6 }; put(el, p) } }
    PV.pos[k] = p; const f = fit(el); if (f) PV.pos[k] = { x: Math.round(f.x), y: Math.round(f.y) };
  };
  window.pvReset = () => { if (typeof PV === "undefined") return; PV.pos = {}; document.querySelectorAll("#pvw [data-drag]").forEach(el => { el.style.translate = "" }) };
  const oe = window.profileEdit || null;
  new MutationObserver(() => { const w = document.getElementById("pvw"); if (w && !document.getElementById("pvt") && w.querySelector("[data-drag]")) w.insertAdjacentHTML("afterend", `<div class="pvt" id="pvt"><span>Положение:</span><button class="btn sm" onclick="pvCenter('avatar')">Аватар по центру</button><button class="btn sm" onclick="pvCenter('nick')">Ник по центру</button><button class="btn sm" onclick="pvReset()">Сбросить</button></div>`) }).observe(document.body, { childList: true, subtree: true });
})();
