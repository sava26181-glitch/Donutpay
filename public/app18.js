// v74: навигация на компьютере, финансы, вывод, переписка по заявке на вывод, поддержка
(() => {
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tm = d => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const when = d => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ago = d => { const s = Math.max(0, (Date.now() - new Date(d)) / 1000); return s < 60 ? "только что" : s < 3600 ? Math.floor(s / 60) + " мин назад" : s < 86400 ? Math.floor(s / 3600) + " ч назад" : new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) };
  const IC = {
    in: "M12 5v14m0 0-5-5m5 5 5-5", out: "M12 19V5m0 0-5 5m5-5 5 5", wd: "M4 7h16v10H4zM4 11h16",
    chat: "M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1H10l-4 3.5V16H5a1 1 0 01-1-1V6a1 1 0 011-1z", send: "M5 12l14-7-5 14-3-6z", chev: "M9 6l6 6-6 6"
  };
  const svg = (p, c = "") => `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  const WS = { pending: ["На проверке", "p"], processing: ["В обработке", "r"], paid: ["Выплачено", "ok"], rejected: ["Отклонено", "no"] };

  // ---------- навигация на компьютере: в шапке те же разделы, что внизу на телефоне
  const NAV = [["home", "/", "Главная"], ["games", "/games", "Игры"], ["fav", "/fav", "Избранное"], ["msgs", "/m", "Сообщения"], ["me", "/me", "Профиль"]];
  const addNav = () => {
    const hd = document.getElementById("hd"); if (!hd) return; hd.querySelector(".dn")?.remove(); const logo = hd.querySelector(".logo"); if (!logo) return;
    const p = (location.hash.slice(1) || "/").split("?")[0], on = k => k === "home" ? p === "/" || p === "" : k === "games" ? /^\/(games|catalog|g\/|game)/.test(p) : k === "fav" ? p.startsWith("/fav") : k === "msgs" ? p.startsWith("/m") && !p.startsWith("/me") : /^\/(me|u\/|orders|finance|settings|identity|tickets|safety|admin|sell|my)/.test(p);
    const un = typeof UNREAD !== "undefined" ? UNREAD : 0;
    const d = document.createElement("nav"); d.className = "dn"; d.setAttribute("aria-label", "Разделы");
    d.innerHTML = NAV.map(x => `<a class="${on(x[0]) ? "on" : ""}" onclick="go('${x[1]}')">${x[2]}${x[0] === "msgs" && un ? `<b class="dn-b">${un}</b>` : ""}</a>`).join("");
    logo.after(d);
  };
  const _nav = window.nav; if (typeof _nav === "function") window.nav = function () { const r = _nav.apply(this, arguments); try { addNav() } catch { } return r };
  addEventListener("hashchange", () => setTimeout(() => { try { addNav() } catch { } }, 80));
  setTimeout(() => { try { addNav() } catch { } }, 400);

  // ---------- финансы
  window.financePage = async function () {
    need(); const qs = new URLSearchParams(location.hash.split("?")[1] || ""), type = qs.get("type") || "all", d = await api("/finance?type=" + type), tt = d.totals || {}; window._fin = d;
    const avail = d.available ?? d.balance, tabs = [["all", "Все"], ["in", "Доходы"], ["out", "Траты"], ["withdraw", "Выводы"]];
    const days = []; let cur = null;
    for (const o of d.ops) {
      const k = (typeof FK !== "undefined" && FK[o.kind]) || null, f = typeof k === "function" ? k(o) : k || [o.kind, "", "in"], day = typeof dayLbl === "function" ? dayLbl(o.created_at) : new Date(o.created_at).toLocaleDateString("ru-RU");
      if (!cur || cur.day !== day) { cur = { day, rows: [] }; days.push(cur) }
      const wd = o.ref_type === "withdrawal", ws = wd && WS[o.w_status || "pending"], neg = o.amount < 0, open = wd && ["pending", "processing"].includes(o.w_status || "pending");
      const click = wd ? ` onclick="wdThread('${o.ref_id}')"` : o.ref_type === "order" ? ` onclick="go('/orders')"` : "";
      const sub = wd && o.kind === "withdraw" ? `<span class="fx-st ${ws[1]}">${ws[0]}</span> ${tm(o.created_at)}` : `${E(f[1])}${f[1] ? ", " : ""}${tm(o.created_at)}`;
      cur.rows.push(`<div class="fx-row${click ? " clk" : ""}"${click}><span class="fx-ic ${f[2] === "in" ? "in" : ""}">${svg(IC[f[2]] || IC.out)}</span><span class="fx-rb"><b>${E(f[0])}</b><small>${sub}</small></span>${wd ? `<span class="fx-chat${open ? " on" : ""}">${svg(IC.chat)}${o.w_msgs ? `<i>${o.w_msgs}</i>` : ""}</span>` : ""}<b class="fx-amt${neg ? "" : " pos"}">${neg ? "−" : "+"}${fm(Math.abs(o.amount))}</b></div>`);
    }
    const list = days.map(g => `<div class="fx-day">${E(g.day)}</div>${g.rows.join("")}`).join("") || `<div class="fx-empty"><b>Операций пока нет</b><span>Здесь появятся пополнения, покупки и выводы</span></div>`;
    const lim = d.id_verified ? "" : (() => { const L = d.wd_limit || 15000, left = d.wd_left ?? L, used = Math.max(0, Math.min(100, Math.round((L - left) / L * 100))); return `<div class="fx-lim"><div><span>Лимит вывода в месяц</span><b>осталось ${fm(left)} из ${fm(L)}</b></div><i><u style="width:${used}%"></u></i><a onclick="go('/identity')">Снять лимит</a></div>` })();
    const holds = (d.holds || []).length ? `<div class="fx-holds"><div class="fx-hh">Заморожено до выплаты</div>${d.holds.map(h => `<div><span>Заказ #${E(h.number)}<small>${h.release_at ? "до " + when(h.release_at) : "до решения спора"}</small></span><b>${fm(h.amount)}</b></div>`).join("")}</div>` : "";
    const rate = CUR.c !== "RUB" && CUR.r ? `<p class="fx-rate">Курс ЦБ на ${E(CUR.r.at || "")}: 1 ${CUR.c === "USD" ? "$" : "€"} = ${(CUR.c === "USD" ? CUR.r.usd : CUR.r.eur).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽. Оплата и вывод идут в рублях.</p>` : "";
    if (qs.get("wd")) setTimeout(() => { const id = qs.get("wd"); history.replaceState(null, "", "#/finance"); wdThread(id) }, 250);
    return `<div class="fx"><div class="fx-head"><h2>Финансы</h2><div class="fx-hr">${d.test_mode ? `<span class="fx-tag">Тест</span>` : ""}${typeof curSw === "function" ? curSw().replace(/<p class="xf-rate">[\s\S]*?<\/p>/, "") : ""}</div></div>
<div class="fx-grid"><aside class="fx-side">
<section class="fx-hero"><small>Доступно</small><div class="fx-num">${fm(avail)}</div><div class="fx-act"><button class="btn pri" onclick="withdrawForm(${avail})">Вывести</button><button class="btn" ${d.test_mode ? `onclick="topupForm()"` : "disabled"}>Пополнить</button></div>${rate}</section>
<section class="fx-kv"><div><small>На выводе</small><b>${fm(tt.pending || 0)}</b></div><div><small>Заморожено</small><b>${fm(d.frozen || 0)}</b></div><div><small>Поступило</small><b>${fm(tt.in || 0)}</b></div><div><small>Потрачено</small><b>${fm(tt.out || 0)}</b></div></section>
${lim}${holds}</aside>
<section class="fx-main"><div class="xp-seg fx-tabs">${tabs.map(t => `<button type="button" class="${type === t[0] ? "on" : ""}" onclick="go('/finance?type=${t[0]}')">${t[1]}</button>`).join("")}</div><div class="fx-list">${list}</div></section></div></div>`;
  };

  // ---------- вывод (id полей прежние: их читает withdrawDo)
  window.withdrawForm = async function (bal) {
    const fin = window._fin || {};
    if (fin.wd_paused) { mdl(`<div class="wx"><div class="wx-h"><h3>Вывод</h3></div><p class="wx-pause">Вывод временно приостановлен из соображений безопасности. Деньги в сохранности, попробуйте позже.</p><button class="btn big" style="width:100%" onclick="$('#md').remove()">Понятно</button></div>`); return }
    const cap = fin.wd_limit ? Math.min(bal, fin.wd_left || 0) : bal;
    let pct = 3; try { pct = (await feesGet()).withdraw_pct } catch { }
    const a0 = Math.floor(cap) >= 10 ? Math.floor(cap) : 10;
    window._wdp = pct; window._wdm = "card"; window._wdb = cap;
    const M = [["card", "Карта"], ["sbp", "СБП"], ["crypto", "Крипта"], ["other", "Другое"]];
    mdl(`<div class="wx"><div class="wx-h"><h3>Вывод</h3><small>Доступно ${$m(bal, "RUB")}${CUR.c !== "RUB" ? " · " + fm(bal) : ""}</small></div>
<div class="wx-amt"><input id="wda" type="number" inputmode="decimal" min="10" value="${a0}" oninput="xwCalc()" aria-label="Сумма вывода"><span>₽</span></div>
<div class="wx-q">${[["25%", .25], ["50%", .5], ["Всё", 1]].map(x => `<button type="button" onclick="xwQ(${x[1]})">${x[0]}</button>`).join("")}</div>
<div class="wdm wx-m">${M.map((x, i) => `<button type="button" class="${i ? "" : "on"}" data-m="${x[0]}" onclick="wdM('${x[0]}')">${x[1]}</button>`).join("")}</div>
<input id="wdd" maxlength="200" placeholder="Номер карты, телефон или кошелёк" autocomplete="off">
<div id="wdhb"><input id="wdh" maxlength="80" autocomplete="name" placeholder="Имя получателя, как в банке"></div>
<div class="wx-sum" id="xwc"></div>
${fin.wd_limit ? `<p class="wx-lim">Осталось на месяц ${$m(fin.wd_left || 0, "RUB")} · <a onclick="$('#md').remove();go('/identity')">Снять лимит</a></p>` : ""}
<button class="btn pri big" onclick="withdrawDo()">Вывести</button>
${fin.test_mode ? `<p class="wx-note">Тест: деньги не переводятся</p>` : ""}</div>`);
    xwCalc();
  };
  window.xwCalc = () => {
    const a = +document.getElementById("wda")?.value || 0, fee = Math.round(a * (window._wdp || 0)) / 100, e = document.getElementById("xwc"), net = Math.max(0, a - fee);
    if (e) e.innerHTML = `<span>Получите<small>комиссия ${window._wdp || 0}% · ${$m(fee, "RUB")}</small></span><span class="wx-r"><b>${$m(net, "RUB")}</b>${CUR.c !== "RUB" ? `<small>≈ ${fm(net)}</small>` : ""}</span>`;
  };
  window.xwQ = k => { const e = document.getElementById("wda"); if (!e) return; e.value = Math.max(10, Math.floor((window._wdb || 0) * k)); xwCalc() };

  // ---------- переписка по заявке на вывод (человек и администратор)
  let wtTimer = 0;
  const bubbles = ms => ms.length ? ms.map(m => `<div class="wt-b ${m.mine ? "me" : "he"}"><small>${m.mine ? "Вы" : E(m.name)} · ${tm(m.created_at)}</small><p>${E(m.body)}</p></div>`).join("") : `<div class="wt-empty">Сообщений пока нет</div>`;
  const wtDraw = (r, keep) => {
    const w = r.w, ws = WS[w.status] || ["", ""], box = document.getElementById("wtm"); if (!box) return;
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    box.innerHTML = bubbles(r.msgs); if (atEnd || !keep) box.scrollTop = box.scrollHeight;
    const st = document.getElementById("wts"); if (st) { st.className = "fx-st " + ws[1]; st.textContent = ws[0] }
    const nt = document.getElementById("wtn"); if (nt) nt.innerHTML = w.note ? `<div class="wt-note">${E(w.note)}</div>` : "";
  };
  window.wdThread = async id => {
    try {
      const r = await api("/withdrawals/" + id), w = r.w, ws = WS[w.status] || ["", ""], M = { card: "Карта", sbp: "СБП", crypto: "Крипта", other: "Другое" };
      mdl(`<div class="wt" data-id="${E(id)}"><div class="wt-h"><div><b>${r.staff ? E(w.username) + " · " : ""}${fm(w.amount)}</b><small>${when(w.created_at)} · ${M[w.method] || E(w.method)} ${E(w.details)}</small></div><span class="fx-st ${ws[1]}" id="wts">${ws[0]}</span></div>
<div id="wtn">${w.note ? `<div class="wt-note">${E(w.note)}</div>` : ""}</div>
<div class="wt-msgs" id="wtm">${bubbles(r.msgs)}</div>
${r.can_write ? `<div class="wt-in"><textarea id="wtt" rows="1" maxlength="1000" placeholder="${r.staff ? "Написать человеку" : "Написать администратору"}" oninput="this.style.height='auto';this.style.height=Math.min(120,this.scrollHeight)+'px'" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter')wtSend('${E(id)}')"></textarea><button type="button" class="wt-s" aria-label="Отправить" onclick="wtSend('${E(id)}')">${svg(IC.send)}</button></div>` : `<p class="wt-closed">Заявка закрыта. Остались вопросы? Напишите в поддержку.</p>`}</div>`);
      const box = document.getElementById("wtm"); if (box) box.scrollTop = box.scrollHeight;
      clearInterval(wtTimer); wtTimer = setInterval(async () => { if (!document.getElementById("wtm")) { clearInterval(wtTimer); return } try { wtDraw(await api("/withdrawals/" + id), true) } catch { } }, 8000);
    } catch (e) { toast(e.message || "Не получилось открыть заявку") }
  };
  window.wtSend = async id => {
    const t = document.getElementById("wtt"), body = (t?.value || "").trim(); if (!body) return;
    t.disabled = true;
    try { await api(`/withdrawals/${id}/messages`, { method: "POST", body: { body } }); t.value = ""; t.style.height = "auto"; wtDraw(await api("/withdrawals/" + id)) } catch (e) { toast(e.message || "Не отправилось") }
    t.disabled = false; t.focus();
  };
  try { NT6.wd_msg = n => `Сообщение по заявке на вывод: ${n.text || ""}` } catch { }

  // администратор: заявки на вывод с кнопкой «Написать»
  window.wdAdmin = async function () {
    const ws = await api("/admin/withdrawals"), M = { card: "Карта", sbp: "СБП", crypto: "Крипта", other: "Другое" }, no = typeof I !== "undefined" && I.no || "";
    return ws.map(w => {
      const fl = Array.isArray(w.flags) ? w.flags : [], bad = fl.filter(f => f.bad), info = fl.filter(f => !f.bad), open = ["pending", "processing"].includes(w.status), s = WS[w.status] || ["", ""], wait = open && w.msgs > 0 && w.last_staff === false;
      return `<div class="card${bad.length && open ? " wdbad" : ""}"><div class="row bet"><b>${E(w.username)} · ${fm(w.amount)}</b><span class="fx-st ${s[1]}">${s[0]}</span></div>
${bad.length && open ? `<div class="wdfl">${bad.map(f => `<div>${no}<span>${E(f.t)}</span></div>`).join("")}<small>Не выплачивайте, пока не выясните</small></div>` : ""}
<div class="m">К выплате: <b>${fm(w.amount - (w.fee || 0))}</b> (комиссия ${fm(w.fee || 0)})</div><div class="m">${M[w.method] || E(w.method)}: ${E(w.details)}</div>${w.holder ? `<div class="m">Получатель: <b>${E(w.holder)}</b></div>` : ""}<div class="m">${w.verified ? `Паспорт: <b>${E(w.id_name || "подтверждён")}</b>` : "Личность не подтверждена"}</div>
${info.filter(f => f.k !== "unverified").length ? `<div class="wdin">${info.filter(f => f.k !== "unverified").map(f => `<span>${E(f.t)}</span>`).join("")}</div>` : ""}
<small class="m">${typeof fmtD === "function" ? fmtD(w.created_at) : new Date(w.created_at).toLocaleDateString("ru-RU")}</small>
<div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn sm${wait ? " pri" : ""}" onclick="wdThread('${w.id}')">${svg(IC.chat, "wd-ci")} Чат${w.msgs ? " · " + w.msgs : ""}${wait ? " · ждёт ответа" : ""}</button>${open ? `${w.status === "pending" ? `<button class="btn sm" onclick="wdAct('${w.id}','processing')">Взять в работу</button>` : ""}<button class="btn sm pri" onclick="wdAct('${w.id}','paid')">Выплачено</button><button class="btn sm dng" onclick="wdAct('${w.id}','reject')">Отклонить и вернуть</button>` : ""}</div></div>`;
    }).join("") || (typeof empty === "function" ? empty("Заявок на вывод нет.") : "<p class=\"m\">Заявок на вывод нет.</p>");
  };

  // ---------- поддержка
  const SST = { new: ["Новое", "p"], in_review: ["Рассматривается", "r"], awaiting_user: ["Ждёт вашего ответа", "ok"], resolved: ["Решено", "ok"], closed: ["Закрыто", "off"] };
  const CATS = typeof TCAT !== "undefined" ? TCAT : { order: "Заказ", payment: "Оплата", account: "Аккаунт", listing: "Объявление", other: "Другое" };
  window.spCat = c => { window._tkc = c; document.querySelectorAll(".sp-cats button").forEach(b => b.classList.toggle("on", b.dataset.c === c)); const o = document.getElementById("spo"); if (o) { o.hidden = !["order", "payment"].includes(c); if (o.hidden) { const s = document.getElementById("to"); if (s) s.value = "" } } };
  window.spNew = async () => {
    window._tkc = window._tkc || "other"; let os = []; try { os = await api("/orders") } catch { }
    mdl(`<div class="spf"><div class="spf-h"><h3>Новое обращение</h3><a onclick="$('#md').remove()" aria-label="Закрыть">${svg("M6 6l12 12M18 6L6 18")}</a></div>
<div class="sp-cats">${Object.entries(CATS).map(c => `<button type="button" data-c="${c[0]}" class="${window._tkc === c[0] ? "on" : ""}" onclick="spCat('${c[0]}')">${c[1]}</button>`).join("")}</div>
<div id="spo" ${["order", "payment"].includes(window._tkc) ? "" : "hidden"}><select id="to"><option value="">Не по заказу</option>${os.map(o => `<option value="${o.id}">${E(o.title)} · ${typeof rub === "function" ? rub(o.total_cents) : ""}</option>`).join("")}</select></div>
<input id="ts" maxlength="120" placeholder="Тема" autocomplete="off">
<textarea id="tb" rows="5" maxlength="3000" oninput="tkCount()" placeholder="Что случилось"></textarea><div class="spf-n" id="tbn">0 / 3000</div>
<div id="achip"></div>
<div class="spf-a"><button type="button" class="btn" onclick="pickAtt('ticket')">Прикрепить файл</button><button class="btn pri" onclick="newT2()">Отправить</button></div></div>`);
  };
  window.tickets = async function (id) {
    need(); const p = new URLSearchParams(location.hash.split("?")[1] || ""); if (id) return ticketView(id);
    const [ts, ds] = await Promise.all([api("/tickets"), api("/my/disputes")]); window._tkc = window._tkc || "other";
    if (p.get("new")) setTimeout(() => { history.replaceState(null, "", "#/tickets"); spNew() }, 150);
    const dsl = typeof DSL !== "undefined" ? DSL : {};
    const row = t => { const s = SST[t.status] || ["", "off"]; return `<a class="sp-r" onclick="go('/tickets/${t.id}')"><span class="sp-rb"><b>${E(t.subject)}</b><small>${E(CATS[t.category] || "")} · ${ago(t.updated_at)}</small></span><span class="fx-st ${s[1]}">${s[0]}</span>${svg(IC.chev, "sp-ch")}</a>` };
    const drow = d => `<a class="sp-r" onclick="go('/dispute/${d.id}')"><span class="sp-rb"><b>${E(String(d.reason || "").slice(0, 80))}</b><small>Спор по заказу</small></span><span class="fx-st r">${E(dsl[d.status] || d.status)}</span>${svg(IC.chev, "sp-ch")}</a>`;
    return `<div class="sp"><div class="sp-head"><div><h2>Поддержка</h2><p>Ответ придёт в уведомления</p></div><button class="btn pri" onclick="spNew()">Написать</button></div>
${ts.length ? `<div class="sp-list">${ts.map(row).join("")}</div>` : `<div class="sp-empty">${svg(IC.chat)}<b>Обращений пока нет</b><span>Вопросы по заказам, оплате и аккаунту</span><button class="btn pri" onclick="spNew()">Написать в поддержку</button></div>`}
${ds.length ? `<div class="sp-sec">Споры</div><div class="sp-list">${ds.map(drow).join("")}</div>` : ""}</div>`;
  };
})();
