// v41: турниры. Блок на главной под «Дуэли магазинов» и «Кодекс продавца» + страницы #/tournaments
(() => {
IC4.trophy = "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z";
Object.assign(ERR, {
  "tournament closed": "Регистрация закрыта или турнир уже идёт",
  "tournament full": "В турнире нет свободных мест",
  "already joined": "Вы уже записаны на этот турнир",
  "not enough players": "Для старта нужно минимум 4 участника",
  "bad nick": "Ник в игре: от 2 до 40 символов",
  "bad title": "Название: от 3 до 80 символов",
  "bad game": "Укажите игру",
  "bad size": "Выберите число мест",
  "bad date": "Укажите дату и время начала",
  "bad score": "Очки: целые числа от 0 до 99",
  "draw not allowed": "Ничья невозможна, укажите победителя",
  "match not open": "Этот матч сейчас закрыт для ввода результата",
  "bad winner": "Победитель должен быть участником матча",
  "bad fee": "Взнос: число от 0 до 100000 ₽",
  "not enough funds": "Недостаточно средств на балансе. Пополните баланс в разделе «Финансы»",
});
const tStaff = () => !!ME && ["moderator", "admin", "owner"].includes(ME.role);
const tDate = d => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const TST = { registration: ["Набор открыт", "reg"], running: ["Идёт", "run"], finished: ["Завершён", "fin"], cancelled: ["Отменён", "can"] };
const tPill = s => `<span class="tpil ${TST[s][1]}">${TST[s][0]}</span>`;
const TG_GL = {
  cross: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', crown: '<path d="M4 18h16M5 18L3 7l5 4 4-7 4 7 5-4-2 11"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  hex: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 8v8M8.5 10l7 4"/>', gem: '<path d="M6 4h12l4 5-10 12L2 9z"/><path d="M2 9h20M9 4l3 5 3-5M12 9v12"/>', ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/>',
  helm: '<path d="M4 14a8 8 0 0116 0v4H4z"/><path d="M4 14h16M9 18v-4"/>', sword: '<path d="M14 4l6-1-1 6-9 9-4-4z"/><path d="M5 15l-2 2 4 4 2-2M8 12l4 4"/>', tri: '<path d="M12 3l9 17H3z"/><path d="M12 10v5"/>', cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12L3 7M12 12v10"/>', pawn: '<circle cx="12" cy="7" r="3"/><path d="M9 21h6M10 12h4l1 5H9zM8 21l1-4M16 21l-1-4"/>'
};
const TGAMES = [["Brawl Stars", "brawl-stars", 48, "star"], ["Standoff 2", "standoff-2", 20, "cross"], ["CS2", "cs2", 36, "cross"], ["Fortnite", "fortnite", 265, "cube"], ["Dota 2", "dota-2", 2, "hex"], ["Clash Royale", "clash-royale", 215, "crown"], ["Valorant", "valorant", 350, "cross"], ["League of Legends", "league-of-legends", 195, "gem"], ["Rocket League", "rocket-league", 205, "ball"], ["PUBG Mobile", "pubg-mobile", 40, "helm"], ["Mobile Legends", "mobile-legends", 280, "sword"], ["Apex Legends", "apex-legends", 8, "tri"], ["Minecraft (PvP)", "minecraft-pvp", 130, "cube"], ["Chess.com/Lichess", "chess", 95, "pawn"], ["EA FC", "ea-fc", 150, "ball"]];
const tgTile = g => `<a class="tgt" data-n="${esc(g[0].toLowerCase())}" onclick="go('/tournaments?game=${encodeURIComponent(g[0])}')"><span class="tga" style="--h:${g[2]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TG_GL[g[3]]}</svg><img src="/img/games/${g[1]}.webp" alt="" loading="lazy" onerror="this.remove()"></span><b>${esc(g[0])}</b></a>`;
window.tgSearch = v => { const q = String(v || "").trim().toLowerCase(); let n = 0; document.querySelectorAll(".tgl .tgt").forEach(a => { const on = !q || a.dataset.n.includes(q); a.style.display = on ? "" : "none"; if (on) n++ }); const e = document.getElementById("tgnone"); if (e) e.hidden = n > 0 };
const tRub = n => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
const tFmt = f => f === "double" ? "Double elimination" : "Single elimination";
const tCard = t => {
  const open = t.status === "registration" || t.status === "running", left = t.max_players - t.players, pc = Math.min(100, Math.round(t.players / t.max_players * 100));
  return `<a class="tcd st-${t.status}" onclick="go('/tournaments/${t.id}')"><div class="tch"><span class="tgm">${esc(t.game_name)}</span>${tPill(t.status)}</div><b class="tti">${esc(t.title)}</b><div class="tfm"><span class="tchip">${tFmt(t.format)}</span><span class="tchip">${tDate(t.start_at)}</span>${t.entry_fee > 0 ? `<span class="tchip fee">Взнос ${tRub(t.entry_fee)}</span>` : ""}</div>${open ? `<div class="tbar"><i style="width:${pc}%"></i></div><div class="tcf"><span>${t.players} из ${t.max_players} игроков</span><span>${t.status === "registration" ? (left > 0 ? "свободно " + left : "мест нет") : ""}</span></div>` : `<div class="tcf"><span>${t.players} игроков</span></div>`}${t.prize_text ? `<div class="tpz">${ic4("trophy", 14)}<span>${esc(t.prize_text)}</span></div>` : ""}${t.status === "finished" && t.winner_name ? `<div class="tw">Победитель <b>${esc(t.winner_name)}</b></div>` : ""}</a>`;
};

// ---- главная: блок под плитками «Дуэли магазинов» и «Кодекс продавца»
{
  const _home = home;
  window.home = async function () {
    const h = await _home();
    let ts = []; try { ts = await api("/tournaments?limit=8") } catch { }
    const live = ts.filter(t => t.status === "running" || t.status === "registration").slice(0, 3);
    const games = `<div class="tgames"><div class="tgl">${TGAMES.map(tgTile).join("")}</div><div class="tgnone m" id="tgnone" hidden>Такой игры нет в списке турниров.</div></div>`;
    const ctl = `<div class="tqs"><label class="tqf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="Найти игру" oninput="tgSearch(this.value)" autocomplete="off"></label>${tStaff() ? '<button class="btn pri" onclick="tForm()">Создать турнир</button>' : ""}</div><div class="tqc m">Всего игр для турниров: ${TGAMES.length}</div>`;
    const block = `<div class="tqh"><h2 class="h2i">${ic4("trophy", 20)}Турниры</h2>${ctl}${live.length ? `<div class="tgrid">${live.map(tCard).join("")}</div>` : ""}${games}</div>`;
    const key = '<div class="row bet" style="margin-top:var(--gap)">';
    return h.includes(key) ? h.replace(key, block + key) : h + block;
  };
}

const TRULES = `<details class="card trl"><summary><b>Правила турниров</b></summary><ol class="m" style="margin:10px 0 0;padding-left:20px;line-height:1.6"><li>Участие может быть платным: вступительный взнос (если он указан) списывается с баланса при записи. Если вы внесли взнос и не явились на турнир, взнос не возвращается, в том числе при выходе из турнира. Если турнир отменяет организатор, взносы возвращаются на баланс. Приз (если он есть) выдаёт организатор вручную.</li><li>Участвовать могут зарегистрированные пользователи, один человек играет с одного аккаунта.</li><li>Укажите свой ник в игре точно: по нему соперник найдёт вас.</li><li>Сетка строится при старте турнира. Места определяются порядком записи, лишние места в первом раунде получают первые записавшиеся.</li><li>После матча оба игрока вводят счёт. Если счёт совпал, матч засчитан, победитель идёт дальше. Если нет, матч уходит в спор, и результат определяет администратор.</li><li>Ничьих нет: счёт должен определять победителя.</li><li>Читы, договорные матчи и игра с чужого аккаунта приводят к снятию с турнира.</li></ol></details>`;

window.tournamentsPage = async function (id) { return id ? tView(id) : tList() };

async function tList() {
  const game = new URLSearchParams(location.hash.split("?")[1] || "").get("game") || "";
  const ts = (await api("/tournaments?limit=60")).filter(t => !game || t.game_name.trim().toLowerCase() === game.trim().toLowerCase()), by = s => ts.filter(t => t.status === s);
  const sec = (h, a, e) => `<div class="tsh"><h3>${h}</h3><span class="tcnt">${a.length}</span></div>${a.length ? `<div class="tgrid">${a.map(tCard).join("")}</div>` : `<div class="tempty">${e}</div>`}`;
  return `<div class="thero"><span class="thi">${ic4("trophy", 26)}</span><div class="thb"><h2>${game ? "Турниры: " + esc(game) : "Турниры"}</h2><p>${game ? `<a class="lk" onclick="go('/tournaments')">Показать все игры</a>` : "Сетка на выбывание: записывайтесь, играйте матчи и вводите результат. Победитель проходит дальше."}</p></div>${tStaff() ? '<button class="btn sm pri" onclick="tForm()">Создать турнир</button>' : ""}</div><div class="tst"><div><b>${by("running").length}</b><span>идут сейчас</span></div><div><b>${by("registration").length}</b><span>набор открыт</span></div><div><b>${by("finished").length}</b><span>завершено</span></div></div>${TRULES}${sec("Идут сейчас", by("running"), "Сейчас нет идущих турниров.")}${sec("Набор открыт", by("registration"), "Открытых турниров пока нет.")}${sec("Завершённые", by("finished"), "Завершённых турниров пока нет.")}`;
}

const T_OPEN = ["ready", "waiting_result", "disputed"];
function tRoundName(br, r, max) {
  if (br === "GF") return "Финал";
  if (br === "L") return "Раунд " + r;
  const left = max - r; return left === 0 ? "Финал" : left === 1 ? "Полуфинал" : left === 2 ? "Четвертьфинал" : "Раунд " + r;
}
function tMatch(m, t) {
  window._tm = window._tm || {}; window._tm[m.id] = m;
  const row = (n, uid, sc) => `<div class="tmr${m.winner && m.winner === uid ? " win" : ""}${ME && uid === ME.id ? " me" : ""}"><span>${n == null ? "ожидает" : esc(n)}</span><b>${sc == null ? "" : sc}</b></div>`;
  let foot = "";
  if (t.status === "running" && T_OPEN.includes(m.status) && m.p1 && m.p2) {
    if (m.mine) foot = m.status === "disputed" ? `<div class="tmf m">Результаты не совпали, решает администратор</div>${m.reported ? "" : `<button class="btn sm" onclick="tReport('${m.id}')">Изменить результат</button>`}`
      : m.reported ? `<div class="tmf m">Результат отправлен, ждём соперника</div>` : `<button class="btn sm pri" onclick="tReport('${m.id}')">Ввести результат</button>`;
    else if (m.status === "disputed") foot = `<div class="tmf m">Спор, решает администратор</div>`;
    if (tStaff()) foot += `<button class="btn sm" style="margin-top:6px" onclick="tResolve('${m.id}')">Решить как админ</button>`;
  }
  return `<div class="tm${m.mine ? " mine" : ""}">${row(m.p1_name, m.p1, m.score1)}${row(m.p2_name, m.p2, m.score2)}${foot}</div>`;
}
function tBracket(d) {
  const t = d.tournament; if (!d.matches.length) return "";
  const groups = ["W", "L", "GF"].map(br => {
    const ms = d.matches.filter(m => m.bracket === br); if (!ms.length) return "";
    const maxR = Math.max(...ms.map(m => m.round)), cols = [];
    for (let r = 1; r <= maxR; r++) {
      const rm = ms.filter(m => m.round === r).sort((a, b) => a.slot - b.slot);
      cols.push(`<div class="tcol"><div class="tcn">${tRoundName(br, r, maxR)}</div><div class="tcm">${rm.map(m => tMatch(m, t)).join("")}</div></div>`);
    }
    const title = br === "W" ? (t.format === "double" ? "Верхняя сетка" : "Сетка") : br === "L" ? "Нижняя сетка" : "Финал турнира";
    return `<h3>${title}</h3><div class="tbr">${cols.join("")}</div>`;
  }).join("");
  return groups;
}
async function tView(id) {
  const d = await api("/tournaments/" + id), t = d.tournament;
  let ctl = "";
  if (t.status === "registration") {
    if (!ME) ctl = `<button class="btn pri" onclick="NEXT='/tournaments/${id}';go('/login')">Войдите, чтобы участвовать</button>`;
    else if (d.joined) ctl = `<button class="btn" onclick="tLeave('${id}',${t.entry_fee || 0})">Выйти из турнира</button>`;
    else if (d.players.length >= t.max_players) ctl = `<span class="m">Мест нет</span>`;
    else ctl = `<button class="btn pri" onclick="tJoin('${id}',${t.entry_fee || 0})">${t.entry_fee > 0 ? "Участвовать за " + tRub(t.entry_fee) : "Участвовать"}</button>`;
  }
  const adm = !d.staff ? "" : `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">${t.status === "registration" ? `<button class="btn sm pri" onclick="tStart('${id}')">Начать турнир</button>` : ""}${["registration", "running"].includes(t.status) ? `<button class="btn sm" onclick="tCancel('${id}')">Отменить турнир</button>` : ""}</div>${t.status === "registration" && d.players.length < 4 ? '<div class="m"><small>Для старта нужно минимум 4 участника.</small></div>' : ""}`;
  const win = t.status === "finished" && t.winner_name ? `<div class="card twin">${ic4("trophy", 20)}<div><b>Победитель: ${esc((d.players.find(p => p.user_id === t.winner_user_id) || {}).nick || t.winner_name)}</b><div class="m">Аккаунт: ${esc(t.winner_name)}</div></div></div>` : "";
  const pc = Math.min(100, Math.round(d.players.length / t.max_players * 100));
  const pl = d.players.length ? `<div class="tpls">${d.players.map((p, i) => `<span class="tpc${ME && p.user_id === ME.id ? " me" : ""}" title="${esc(p.username)}"><i>${p.seed || i + 1}</i>${esc(p.nick)}</span>`).join("")}</div>` : `<div class="tempty">Пока никто не записался.</div>`;
  return `<a class="lk" onclick="go('/tournaments')">← Все турниры</a><div class="card tin"><div class="tch"><span class="tgm">${esc(t.game_name)}</span>${tPill(t.status)}</div><h2>${esc(t.title)}</h2><div class="tmeta"><div><small>Формат</small><b>${tFmt(t.format)}</b></div><div><small>Начало</small><b>${tDate(t.start_at)}</b></div><div><small>Взнос</small><b>${t.entry_fee > 0 ? tRub(t.entry_fee) : "Бесплатно"}</b></div><div><small>Игроки</small><b>${d.players.length} из ${t.max_players}</b></div></div>${["registration", "running"].includes(t.status) ? `<div class="tbar"><i style="width:${pc}%"></i></div>` : ""}${t.prize_text ? `<div class="tpz">${ic4("trophy", 14)}<span>${esc(t.prize_text)}</span></div>` : ""}${t.rules_text ? `<p class="trt">${esc(t.rules_text)}</p>` : ""}${ctl ? `<div class="tctl">${ctl}</div>` : ""}${adm}</div>${win}<div class="tsh"><h3>Участники</h3><span class="tcnt">${d.players.length}</span></div>${pl}${tBracket(d)}${TRULES}`;
}

const tJoin = (id, fee) => mdl(`<h3 style="margin-top:0">Участие в турнире</h3><label>Ваш ник в игре</label><input id="tnk" maxlength="40" autocomplete="off"><div class="hint">Соперник будет искать вас по этому нику.</div>${fee > 0 ? `<div class="tfeebox"><b>Взнос ${tRub(fee)}</b><span>Списывается с вашего баланса при записи. Если вы не явитесь на турнир, взнос не возвращается. При отмене турнира организатором он вернётся на баланс.</span></div>` : ""}<button class="btn pri" style="margin-top:12px;width:100%" onclick="tJoinGo('${id}')">${fee > 0 ? "Оплатить и записаться" : "Записаться"}</button>`);
const tJoinGo = act(async id => { await api(`/tournaments/${id}/join`, { method: "POST", body: { nick: $("#tnk").value } }); $("#md")?.remove(); toast("Вы записаны"); route() });
const tLeave = act(async (id, fee) => { if (fee > 0 && !confirm("Взнос не вернётся. Выйти из турнира?")) return; await api(`/tournaments/${id}/join`, { method: "DELETE" }); toast("Вы вышли из турнира"); route() });
const tStart = act(async id => { await api(`/tournaments/${id}/start`, { method: "POST" }); toast("Турнир начался, сетка построена"); route() });
const tCancel = act(async id => { if (!confirm("Отменить турнир?")) return; await api(`/tournaments/${id}/cancel`, { method: "POST" }); toast("Турнир отменён"); route() });
function tReport(mid) {
  const m = window._tm[mid], me = m.p1 === ME.id ? m.p1_name : m.p2_name, op = m.p1 === ME.id ? m.p2_name : m.p1_name;
  mdl(`<h3 style="margin-top:0">Результат матча</h3><p class="m" style="margin-top:0">${esc(me)} против ${esc(op)}. Введите счёт так, как он был в игре. Результат засчитается, когда его подтвердит соперник.</p><label>Ваши очки</label><input id="tsm" type="number" min="0" max="99" inputmode="numeric"><label>Очки соперника (${esc(op)})</label><input id="tso" type="number" min="0" max="99" inputmode="numeric"><button class="btn pri" style="margin-top:10px;width:100%" onclick="tReportGo('${mid}')">Отправить</button>`);
}
const tReportGo = act(async mid => {
  const r = await api(`/tournament-matches/${mid}/report`, { method: "POST", body: { me: $("#tsm").value, opp: $("#tso").value } });
  $("#md")?.remove(); toast(r.state === "done" ? "Матч засчитан" : r.state === "disputed" ? "Счёт не совпал, решит администратор" : "Результат отправлен, ждём соперника"); route();
});
function tResolve(mid) {
  const m = window._tm[mid];
  mdl(`<h3 style="margin-top:0">Решение по матчу</h3><p class="m" style="margin-top:0">Выберите победителя. Решение записывается в журнал действий.</p><div style="display:grid;gap:8px"><button class="btn pri" onclick="tResolveGo('${mid}','${m.p1}')">Победил ${esc(m.p1_name)}</button><button class="btn pri" onclick="tResolveGo('${mid}','${m.p2}')">Победил ${esc(m.p2_name)}</button></div>`);
}
const tResolveGo = act(async (mid, w) => { await api(`/tournament-matches/${mid}/resolve`, { method: "POST", body: { winner: w } }); $("#md")?.remove(); toast("Результат записан"); route() });
async function tForm() {
  const gs = await api("/games").catch(() => []), d = new Date(Date.now() + 864e5); d.setMinutes(0, 0, 0);
  const loc = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  mdl(`<div class="tfm2"><h3>Новый турнир</h3><p class="m">Заполните основное. Сетка строится при старте, когда записалось не меньше четырёх игроков.</p>
<div class="tfs"><span class="tfn">Основное</span><label>Название</label><input id="tt" maxlength="80" placeholder="Например, Кубок выходного дня"><label>Игра</label><input id="tg" list="tgl" maxlength="60" placeholder="Начните вводить название"><datalist id="tgl">${gs.map(g => `<option value="${esc(g.name)}">`).join("")}</datalist></div>
<div class="tfs"><span class="tfn">Формат</span><label>Тип сетки</label><select id="tf"><option value="single">Single elimination (проиграл — выбыл)</option><option value="double">Double elimination (два поражения)</option></select><div class="tf2"><div><label>Число мест</label><select id="ts">${[4, 8, 16, 32, 64].map(n => `<option ${n === 8 ? "selected" : ""}>${n}</option>`).join("")}</select></div><div><label>Взнос, ₽</label><input id="tfee" type="number" inputmode="decimal" min="0" max="100000" step="1" value="0" placeholder="0"></div></div><div class="hint">Взнос списывается с баланса участника при записи. Не явился на турнир: взнос не возвращается. 0 означает бесплатное участие.</div><label>Начало</label><input id="td" type="datetime-local" value="${loc}"></div>
<div class="tfs"><span class="tfn">Дополнительно</span><label>Приз</label><input id="tp" maxlength="200" placeholder="Например, значок или подарок от организатора"><label>Условия</label><textarea id="tr" rows="3" maxlength="4000" placeholder="Правила матчей, регламент, ограничения"></textarea></div>
<button class="btn pri" style="width:100%" onclick="tFormGo(this)">Создать турнир</button></div>`);
}
const tFormGo = act(async btn => {
  btn.disabled = true;
  try {
    const r = await api("/tournaments", { method: "POST", body: { title: $("#tt").value, game_name: $("#tg").value, format: $("#tf").value, max_players: +$("#ts").value, start_at: new Date($("#td").value).toISOString(), prize_text: $("#tp").value, entry_fee: $("#tfee").value, rules_text: $("#tr").value } });
    $("#md")?.remove(); toast("Турнир создан"); go("/tournaments/" + r.id);
  } catch (e) { btn.disabled = false; throw e }
});
  Object.assign(window, { tJoin, tJoinGo, tLeave, tStart, tCancel, tReport, tReportGo, tResolve, tResolveGo, tForm, tFormGo });
})();
