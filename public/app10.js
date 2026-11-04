// v41: турниры. Блок на главной под «Дуэли магазинов» и «Кодекс продавца» + страницы #/tournaments
(() => {
IC4.trophy = "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z";
Object.assign(ERR, {
  "tournament closed": "Регистрация закрыта или турнир уже идёт",
  "tournament full": "В турнире нет свободных мест",
  "already joined": "Вы уже записаны на этот турнир",
  "not enough players": "Для старта нужно минимум 2 участника",
  "double needs 4": "Для double elimination нужно минимум 4 участника",
  "bad nick": "Ник в игре: от 2 до 40 символов",
  "bad title": "Название: от 3 до 80 символов",
  "bad game": "Укажите игру",
  "bad size": "Выберите число мест",
  "bad date": "Укажите дату и время начала",
  "bad score": "Очки: целые числа от 0 до 99",
  "draw not allowed": "Ничья невозможна, укажите победителя",
  "match not open": "Этот матч сейчас закрыт для ввода результата",
  "bad winner": "Победитель должен быть участником матча",
  "bad game id": "Укажите ID или тег игрока в игре (от 2 до 40 символов)",
  "not running": "Турнир сейчас не идёт",
  "bad places": "Выберите разных игроков на все призовые места",
  "chat closed": "Чат закрыт",
  "bad message": "Сообщение: от 1 до 500 символов",
  "bad url": "Нужна ссылка, начинающаяся с https://",
  "not finished": "Действие доступно только для завершённых турниров",
  "user not found": "Пользователь не найден",
  "too many media": "Слишком много файлов в турнире",
  "bad prizes": "Призовых мест не может быть больше, чем игроков",
  "bad fee": "Взнос: число от 0 до 100000 ₽",
  "not enough funds": "Недостаточно средств на балансе. Пополните баланс в разделе «Финансы»",
});
const tStaff = () => !!ME && ["moderator", "admin", "owner"].includes(ME.role);
const tMaker = () => !!ME && ["admin", "owner", "organizer"].includes(ME.role);
const tGame = n => TGAMES.find(g => g[0].toLowerCase() === String(n || "").trim().toLowerCase());
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
  return `<a class="tcd st-${t.status}" onclick="go('/tournaments/${t.id}')"><div class="tch"><span class="tgm">${esc(t.game_name)}</span>${t.pinned ? '<span class="tpil fin">Закреплён</span>' : ""}${tPill(t.status)}</div><b class="tti">${esc(t.title)}</b><div class="tfm"><span class="tchip">${tFmt(t.format)}</span><span class="tchip">${tDate(t.start_at)}</span>${t.entry_fee > 0 ? `<span class="tchip fee">Взнос ${tRub(t.entry_fee)}</span>` : ""}</div>${open ? `<div class="tbar"><i style="width:${pc}%"></i></div><div class="tcf"><span>${t.players} из ${t.max_players} игроков</span><span>${t.status === "registration" ? (left > 0 ? "свободно " + left : "мест нет") : ""}</span></div>` : `<div class="tcf"><span>${t.players} игроков</span></div>`}${(t.prizes || []).some(x => x.prize) ? `<div class="tprz">${t.prizes.filter(x => x.prize).map(x => `<div><i>${x.place}</i><span>${esc(x.prize)}</span></div>`).join("")}</div>` : t.prize_text ? `<div class="tpz">${ic4("trophy", 14)}<span>${esc(t.prize_text)}</span></div>` : ""}${t.status === "finished" && t.winner_name ? `<div class="tw">Победитель <b>${esc(t.winner_name)}</b></div>` : ""}</a>`;
};

// ---- главная: блок под плитками «Дуэли магазинов» и «Кодекс продавца»
{
  const _home = home;
  window.home = async function () {
    const h = await _home();
    const games = `<div class="tgames"><div class="tgl">${TGAMES.map(tgTile).join("")}</div><div class="tgnone m" id="tgnone" hidden>Такой игры нет в списке турниров.</div></div>`;
    const ctl = `<div class="tqs"><label class="tqf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="Найти игру" oninput="tgSearch(this.value)" autocomplete="off"></label></div><div class="tqc m">Всего игр для турниров: ${TGAMES.length}</div>`;
    let act = ""; try {
      const ts = (await api("/tournaments?limit=100")).filter(t => t.status === "registration" || t.status === "running"), by = {};
      ts.forEach(t => { by[t.game_name] = (by[t.game_name] || 0) + 1 });
      const ks = Object.keys(by); if (ks.length) act = `<div class="tact"><span>Идут турниры:</span>${ks.map(k => `<a onclick="go('/tournaments?game=${encodeURIComponent(k)}')">${esc(k)}<i>${by[k]}</i></a>`).join("")}</div>`;
    } catch { }
    const block = `<div class="tqh"><h2 class="h2i">${ic4("trophy", 20)}Турниры</h2>${ctl}${act}${games}</div>`;
    const key = '<div class="row bet" style="margin-top:var(--gap)">';
    return h.includes(key) ? h.replace(key, block + key) : h + block;
  };
}

const TRULES = `<details class="card trl"><summary><b>Правила турниров</b></summary><ol class="m" style="margin:10px 0 0;padding-left:20px;line-height:1.6"><li>Участие может быть платным: взнос списывается с баланса при записи. Пока идёт набор и турнир не начался, можно выйти, и взнос полностью вернётся. Когда турнир начался и состав укомплектован, взнос не возвращается. Если турнир отменяет организатор, взносы возвращаются.</li><li>Укажите ник и ID в игре точно: по ним организатор и соперники найдут вас. Эти данные видны участникам турнира.</li><li>Играют в самой игре. Результаты на сайте игроки не вводят: итог выбирает организатор.</li><li>В чате турнира общаются участники и организатор. После завершения чат закрывается.</li><li>Организатор выбирает победителей и закрывает турнир. Собранные взносы распределяются между призовыми местами (1 место получает больше всех) и зачисляются на баланс DonutPay.</li><li>Читы, договорные матчи и игра с чужого аккаунта приводят к снятию с турнира.</li></ol></details>`;

window.tournamentsPage = async function (id) { return id ? tView(id) : tList() };

async function tList() {
  const game = new URLSearchParams(location.hash.split("?")[1] || "").get("game") || "";
  if (!game) return `<div class="thero"><span class="thi">${ic4("trophy", 26)}</span><div class="thb"><h2>Турниры</h2><p>Выберите игру: внутри каждой свои актуальные турниры, участники и создание нового турнира.</p></div></div><div class="tgames"><div class="tgl tgl-all">${TGAMES.map(tgTile).join("")}</div></div>${TRULES}`;
  const ts = (await api("/tournaments?limit=60")).filter(t => t.game_name.trim().toLowerCase() === game.trim().toLowerCase()), by = (...s) => ts.filter(t => s.includes(t.status));
  const g = tGame(game), cur = by("registration", "running"), old = by("finished");
  const sec = (h, a, e) => `<div class="tsh"><h3>${h}</h3><span class="tcnt">${a.length}</span></div>${a.length ? `<div class="tgrid">${a.map(tCard).join("")}</div>` : `<div class="tempty">${e}</div>`}`;
  const pic = g ? `<span class="tga tgh" style="--h:${g[2]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TG_GL[g[3]]}</svg><img src="/img/games/${g[1]}.webp" alt="" onerror="this.remove()"></span>` : `<span class="thi">${ic4("trophy", 26)}</span>`;
  return `<div class="thero">${pic}<div class="thb"><h2>${esc(g ? g[0] : game)}</h2><p><a class="lk" onclick="go('/tournaments')">← Все игры</a></p></div>${tMaker() ? `<button class="btn sm pri" onclick="tForm('${esc(g ? g[0] : game).replace(/'/g, "")}')">Создать турнир</button>` : ""}</div>${sec("Актуальные", cur, "Сейчас нет актуальных турниров по этой игре.")}${old.length ? sec("Завершённые", old, "") : ""}${TRULES}`;
}

const tUp = async file => {
  let blob = file;
  if (/^image\/(png|jpeg|webp)$/.test(file.type) && file.size > 1.5e6) {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file) }), k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    blob = await new Promise(r => c.toBlob(r, "image/jpeg", .85));
  }
  const r = await fetch("/api/media?kind=tour", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: blob }), j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(ERR[j.error] || j.error || "Не удалось загрузить файл");
  return j.id;
};
const tSplit = (pool, n) => { const w = Array.from({ length: n }, (_, i) => 1 / (i + 1)), s = w.reduce((a, b) => a + b, 0), c = Math.round(pool * 100), a = w.map(x => Math.floor(c * x / s)); a[0] += c - a.reduce((x, y) => x + y, 0); return a.map(x => x / 100) };
const tMedia = (d, kind, title) => {
  const t = d.tournament, list = d.media.filter(m => m.kind === kind);
  if (!list.length && !(d.staff && t.status === "finished")) return "";
  const add = d.staff && t.status === "finished" ? `<button class="btn sm" onclick="tMediaAdd('${t.id}','${kind}')">${kind === "result" ? "Добавить картинку итогов" : "Добавить фото или видео"}</button>` : "";
  return `<div class="tsh"><h3>${title}</h3><span class="tcnt">${list.length}</span></div><div class="tmg">${list.map(m => `<figure>${m.media_id ? `<a href="/api/media/${m.media_id}" target="_blank" rel="noopener"><img src="/api/media/${m.media_id}" alt="" loading="lazy"></a>` : `<a class="tvl" href="${esc(m.url)}" target="_blank" rel="noopener nofollow">${ic4("trophy", 16)}<span>Смотреть видео</span></a>`}${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ""}${d.staff ? `<button class="tmx" onclick="tMediaDel('${t.id}','${m.id}')" aria-label="Удалить">×</button>` : ""}</figure>`).join("")}</div>${add}`;
};
async function tView(id) {
  const d = await api("/tournaments/" + id), t = d.tournament; window._tv = d;
  let ctl = "";
  if (t.status === "registration") {
    if (!ME) ctl = `<button class="btn pri" onclick="NEXT='/tournaments/${id}';go('/login')">Войдите, чтобы участвовать</button>`;
    else if (d.joined) ctl = `<button class="btn" onclick="tLeave('${id}',${t.entry_fee || 0})">Выйти из турнира</button>`;
    else if (d.players.length >= t.max_players) ctl = `<span class="m">Мест нет</span>`;
    else ctl = `<button class="btn pri" onclick="tJoin('${id}',${t.entry_fee || 0})">${t.entry_fee > 0 ? "Участвовать за " + tRub(t.entry_fee) : "Участвовать"}</button>`;
  }
  const open = ["registration", "running"].includes(t.status);
  const adm = !d.staff ? "" : `<div class="tadm"><div class="row" style="gap:8px;flex-wrap:wrap">${t.status === "registration" ? `<button class="btn sm pri" onclick="tStart('${id}')">Начать турнир</button>` : ""}${t.status === "running" ? `<button class="btn sm pri" onclick="tFinish('${id}')">Завершить и выбрать победителя</button>` : ""}${open ? `<button class="btn sm" onclick="tCancel('${id}')">Отменить турнир</button>` : ""}${open ? `<button class="btn sm" onclick="tHelper('${id}')">Добавить помощника</button>` : ""}</div>${d.helpers.length ? `<div class="thl"><small>Помощники:</small>${d.helpers.map(h => `<span class="tpc">${esc(h.username)}<a onclick="tHelperDel('${id}','${h.user_id}')" aria-label="Убрать">×</a></span>`).join("")}</div>` : ""}${t.status === "registration" && d.players.length < 2 ? '<div class="m"><small>Для старта нужно минимум 2 участника.</small></div>' : ""}</div>`;
  const adm2 = !d.admin || open ? "" : `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" onclick="tPin('${id}',${!t.pinned})">${t.pinned ? "Открепить" : "Закрепить"}</button><button class="btn sm danger" onclick="tDel('${id}')">Удалить турнир</button></div>`;
  const podium = t.status === "finished" ? `<div class="card twin">${ic4("trophy", 20)}<div style="flex:1;min-width:0"><b>Турнир завершён</b>${d.players.filter(p => p.place).map(p => `<div class="tpd"><i>${p.place}</i><span><b>${esc(p.nick)}</b> <small class="m">${esc(p.username)}</small></span>${p.prize > 0 ? `<em>+${tRub(p.prize)}</em>` : ""}</div>`).join("")}${t.result_text ? `<p class="m" style="margin:8px 0 0">${esc(t.result_text)}</p>` : ""}</div></div>` : t.status === "cancelled" ? `<div class="card"><b>Турнир отменён</b><div class="m">Взносы возвращены участникам.</div></div>` : "";
  const pc = Math.min(100, Math.round(d.players.length / t.max_players * 100));
  const pl = d.players.length ? `<div class="tpt">${d.players.map((p, i) => `<div class="tpr${ME && p.user_id === ME.id ? " me" : ""}"><i>${p.place || i + 1}</i><div class="tpn"><b>${esc(p.nick)}</b><small>ID в игре: ${esc(p.game_id || "не указан")}</small></div><a class="tpa" onclick="go('/u/${encodeURIComponent(p.username)}')">${esc(p.username)}</a></div>`).join("")}</div>` : `<div class="tempty">Пока никто не записался.</div>`;
  const chat = d.chat ? `<div class="tsh"><h3>Чат турнира</h3></div><div class="card tcw"><div class="tcm2" id="tcm"><span class="m">Загрузка...</span></div><div class="tcin"><input id="tci" maxlength="500" placeholder="Сообщение участникам и организатору" enterkeyhint="send" onkeydown="if(event.key==='Enter')tChatSend('${id}')"><button class="btn pri sm" onclick="tChatSend('${id}')">Отправить</button></div></div>` : open ? `<div class="tsh"><h3>Чат турнира</h3></div><div class="card"><span class="m">Чат открыт для участников и организатора. Запишитесь на турнир, чтобы писать.</span></div>` : "";
  window._tcid = d.chat ? id : null; if (d.chat) setTimeout(() => tChatLoad(id), 0);
  return `<a class="lk" onclick="go('/tournaments?game=${encodeURIComponent(t.game_name)}')">← ${esc(t.game_name)}</a><div class="card tin"><div class="tch"><span class="tgm">${esc(t.game_name)}</span>${t.pinned ? '<span class="tpil fin">Закреплён</span>' : ""}${tPill(t.status)}</div><h2>${esc(t.title)}</h2><div class="tmeta"><div><small>Начало</small><b>${tDate(t.start_at)}</b></div><div><small>Взнос</small><b>${t.entry_fee > 0 ? tRub(t.entry_fee) : "Бесплатно"}</b></div><div><small>Игроки</small><b>${d.players.length} из ${t.max_players}</b></div><div><small>Организатор</small><b>${esc(t.created_name || "")}</b></div></div>${open ? `<div class="tbar"><i style="width:${pc}%"></i></div>` : ""}${(t.prizes || []).some(x => x.prize) ? `<div class="tprz">${t.prizes.filter(x => x.prize).map(x => `<div><i>${x.place}</i><span>${esc(x.prize)}</span></div>`).join("")}</div>` : t.prize_text ? `<div class="tpz">${ic4("trophy", 14)}<span>${esc(t.prize_text)}</span></div>` : ""}${t.entry_fee > 0 && open ? `<div class="m" style="margin-top:6px"><small>Собрано взносов: ${tRub(d.pool)}. После завершения они распределяются между призовыми местами.</small></div>` : ""}${t.rules_text ? `<p class="trt">${esc(t.rules_text)}</p>` : ""}${ctl ? `<div class="tctl">${ctl}</div>` : ""}${adm}${adm2}</div>${podium}${tMedia(d, "result", "Итоги турнира")}${tMedia(d, "highlight", "Лучшие моменты")}${chat}<div class="tsh"><h3>Участники</h3><span class="tcnt">${d.players.length}</span></div>${pl}${TRULES}`;
}

// ---- чат турнира (обновляется сам)
const tTime = d => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
async function tChatLoad(id) {
  const box = document.getElementById("tcm"); if (!box || window._tcid !== id) return;
  let r; try { r = await api(`/tournaments/${id}/chat`) } catch { return }
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 80, first = !box.dataset.n;
  box.dataset.n = "1";
  box.innerHTML = r.messages.length ? r.messages.map(m => `<div class="tcb${ME && m.user_id === ME.id ? " me" : ""}"><b>${esc(m.username)}${m.host ? " · организатор" : m.helper ? " · помощник" : ""}</b><span>${esc(m.body)}</span><small>${tTime(m.created_at)}</small></div>`).join("") : '<span class="m">Сообщений пока нет. Напишите первым.</span>';
  if (near || first) box.scrollTop = box.scrollHeight;
}
window.tChatLive = ev => { if (ev && ev.id && ev.id === window._tcid) tChatLoad(ev.id) };
setInterval(() => { if (window._tcid && !document.hidden) tChatLoad(window._tcid) }, 20000);
const tChatSend = act(async id => { const i = $("#tci"), v = (i.value || "").trim(); if (!v) return; i.value = ""; await api(`/tournaments/${id}/chat`, { method: "POST", body: { body: v } }); tChatLoad(id) });

// ---- действия организатора
const tFinish = id => {
  const d = window._tv, t = d.tournament, n = Math.min((t.prizes || []).length || 1, d.players.length), amt = tSplit(d.pool, n);
  mdl(`<h3 style="margin-top:0">Завершить турнир</h3><p class="m" style="margin-top:0">Выберите, кто занял призовые места. Собранные взносы (${tRub(d.pool)}) сразу зачислятся победителям на баланс DonutPay. Действие нельзя отменить.</p>${Array.from({ length: n }, (_, i) => `<label>${i + 1} место${(t.prizes[i] || {}).prize ? ": " + esc(t.prizes[i].prize) : ""}${amt[i] > 0 ? ` (+${tRub(amt[i])})` : ""}</label><select class="tfp"><option value="">Выберите игрока</option>${d.players.map(p => `<option value="${p.user_id}">${esc(p.nick)} (${esc(p.username)})</option>`).join("")}</select>`).join("")}<label>Что произошло в финале (по желанию)</label><textarea id="tfr" rows="3" maxlength="1000" placeholder="Коротко: кто победил и как прошла игра"></textarea><label>Картинка итога (по желанию)</label><input id="tff" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><button class="btn pri" style="margin-top:12px;width:100%" onclick="tFinishGo('${id}',${n})">Подтвердить и закрыть турнир</button>`);
};
const tFinishGo = act(async (id, n) => {
  const places = [...document.querySelectorAll(".tfp")].map(s => s.value);
  if (places.some(x => !x)) throw new Error("Выберите игроков на все призовые места");
  if (new Set(places).size !== places.length) throw new Error("Один игрок не может занять два места");
  if (!confirm("Закрыть турнир и выплатить призы? Это нельзя отменить.")) return;
  const f = $("#tff")?.files[0]; let mid = null; if (f) mid = await tUp(f);
  await api(`/tournaments/${id}/finish`, { method: "POST", body: { places, result_text: $("#tfr").value } });
  if (mid) await api(`/tournaments/${id}/media`, { method: "POST", body: { kind: "result", media_id: mid } }).catch(() => { });
  $("#md")?.remove(); toast("Турнир завершён"); route();
});
const tHelper = id => mdl(`<h3 style="margin-top:0">Помощник организатора</h3><p class="m" style="margin-top:0">Помощник сможет писать в чате турнира, начинать и завершать его. Укажите имя пользователя.</p><input id="thn" maxlength="24" placeholder="Имя пользователя" autocapitalize="off"><button class="btn pri" style="margin-top:12px;width:100%" onclick="tHelperGo('${id}')">Добавить</button>`);
const tHelperGo = act(async id => { await api(`/tournaments/${id}/helpers`, { method: "POST", body: { username: $("#thn").value } }); $("#md")?.remove(); toast("Помощник добавлен"); route() });
const tHelperDel = act(async (id, uid) => { await api(`/tournaments/${id}/helpers/${uid}`, { method: "DELETE" }); route() });
const tMediaAdd = (id, kind) => mdl(`<h3 style="margin-top:0">${kind === "result" ? "Картинка итогов" : "Лучший момент"}</h3><label>Фото (png, jpeg, webp, gif)</label><input id="tmf" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><label>Или ссылка на видео (https)</label><input id="tmu" maxlength="300" placeholder="https://..."><label>Подпись (по желанию)</label><input id="tmc" maxlength="200"><button class="btn pri" style="margin-top:12px;width:100%" onclick="tMediaGo('${id}','${kind}')">Добавить</button>`);
const tMediaGo = act(async (id, kind) => {
  const f = $("#tmf")?.files[0], u = $("#tmu").value.trim(); if (!f && !u) throw new Error("Выберите фото или вставьте ссылку на видео");
  const body = { kind, caption: $("#tmc").value }; if (f) body.media_id = await tUp(f); else body.url = u;
  await api(`/tournaments/${id}/media`, { method: "POST", body }); $("#md")?.remove(); toast("Добавлено"); route();
});
const tMediaDel = act(async (id, mid) => { if (!confirm("Удалить?")) return; await api(`/tournaments/${id}/media/${mid}`, { method: "DELETE" }); route() });
const tPin = act(async (id, on) => { await api(`/tournaments/${id}/pin`, { method: "POST", body: { pinned: on } }); toast(on ? "Закреплён" : "Откреплён"); route() });
const tDel = act(async id => { if (!confirm("Удалить турнир навсегда?")) return; const g = window._tv.tournament.game_name; await api(`/tournaments/${id}`, { method: "DELETE" }); toast("Турнир удалён"); go("/tournaments?game=" + encodeURIComponent(g)) });

const tJoin = (id, fee) => mdl(`<h3 style="margin-top:0">Участие в турнире</h3><label>Ваш ник в игре</label><input id="tnk" maxlength="40" autocomplete="off" placeholder="Например, DonutKing"><label>ID или тег игрока</label><input id="tgid" maxlength="40" autocomplete="off" placeholder="Например, #2PP8QL или 123456789"><div class="hint">Соперник найдёт вас по нику и ID. Оба поля видны другим участникам турнира.</div>${fee > 0 ? `<div class="tfeebox"><b>Взнос ${tRub(fee)}</b><span>Списывается с вашего баланса при записи. До начала турнира, пока идёт набор, можно выйти и получить взнос обратно. Когда турнир начался и состав укомплектован, взнос не возвращается.</span></div>` : ""}<button class="btn pri" style="margin-top:12px;width:100%" onclick="tJoinGo('${id}')">${fee > 0 ? "Оплатить и записаться" : "Записаться"}</button>`);
const tJoinGo = act(async id => { await api(`/tournaments/${id}/join`, { method: "POST", body: { nick: $("#tnk").value, game_id: $("#tgid").value } }); $("#md")?.remove(); toast("Вы записаны"); route() });
const tLeave = act(async (id, fee) => { if (fee > 0 && !confirm("Выйти из турнира? Взнос вернётся на баланс.")) return; await api(`/tournaments/${id}/join`, { method: "DELETE" }); toast("Вы вышли из турнира"); route() });
const tStart = act(async id => { await api(`/tournaments/${id}/start`, { method: "POST" }); toast("Турнир начался, сетка построена"); route() });
const tCancel = act(async id => { if (!confirm("Отменить турнир?")) return; await api(`/tournaments/${id}/cancel`, { method: "POST" }); toast("Турнир отменён"); route() });
function tPrz() {
  const n = Math.max(1, Math.min(10, Math.floor(+$("#tw").value) || 1)), box = $("#tpz"), keep = [...box.querySelectorAll("input")].map(i => i.value);
  box.innerHTML = Array.from({ length: n }, (_, i) => `<label>${i + 1} место, приз</label><input maxlength="100" placeholder="${i === 0 ? "Например, 500 ₽ или значок" : "Что получит игрок на этом месте"}" value="${esc(keep[i] || "")}">`).join("");
}
async function tForm(game) {
  const g = tGame(game), gname = g ? g[0] : String(game || ""), d = new Date(Date.now() + 864e5); d.setMinutes(0, 0, 0);
  const loc = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  window._tfg = gname;
  mdl(`<div class="tfm2"><h3>Новый турнир</h3><p class="m">Играют в самой игре. Организатор сам выбирает победителей и закрывает турнир, взносы делятся между призовыми местами.</p>
<div class="tfs"><span class="tfn">Основное</span><div class="tgfix">${g ? `<span class="tga" style="--h:${g[2]}"><img src="/img/games/${g[1]}.webp" alt="" onerror="this.remove()"></span>` : ""}<div><small>Игра</small><b>${esc(gname)}</b></div></div><label>Название</label><input id="tt" maxlength="80" placeholder="Например, Кубок выходного дня"></div>
<div class="tfs"><span class="tfn">Формат</span><div class="tf2"><div><label>Число мест</label><input id="ts" type="number" inputmode="numeric" min="2" max="128" step="1" value="8"></div><div><label>Взнос, ₽</label><input id="tfee" type="number" inputmode="decimal" min="0" max="100000" step="1" value="0" placeholder="0"></div></div><div class="hint">Мест может быть любое число от 2 до 128. Взнос списывается при записи. Пока идёт набор, участник может выйти и вернуть взнос; после старта взнос не возвращается. 0 означает бесплатное участие.</div><label>Начало</label><input id="td" type="datetime-local" value="${loc}"></div>
<div class="tfs"><span class="tfn">Призы</span><label>Сколько призовых мест</label><input id="tw" type="number" inputmode="numeric" min="1" max="10" step="1" value="1" oninput="tPrz()"><div class="hint">Минимум одно место. Для каждого места укажите свой приз.</div><div id="tpz"></div></div>
<div class="tfs"><span class="tfn">Дополнительно</span><label>Условия</label><textarea id="tr" rows="3" maxlength="4000" placeholder="Правила матчей, регламент, ограничения"></textarea></div>
<button class="btn pri" style="width:100%" onclick="tFormGo(this)">Создать турнир</button></div>`);
  tPrz();
}
const tFormGo = act(async btn => {
  btn.disabled = true;
  try {
    const r = await api("/tournaments", { method: "POST", body: { title: $("#tt").value, game_name: window._tfg, max_players: +$("#ts").value, start_at: new Date($("#td").value).toISOString(), prizes: [...document.querySelectorAll("#tpz input")].map(i => ({ prize: i.value })), entry_fee: $("#tfee").value, rules_text: $("#tr").value } });
    $("#md")?.remove(); toast("Турнир создан"); go("/tournaments/" + r.id);
  } catch (e) { btn.disabled = false; throw e }
});
  Object.assign(window, { tJoin, tJoinGo, tLeave, tStart, tCancel, tForm, tFormGo, tPrz, tFinish, tFinishGo, tHelper, tHelperGo, tHelperDel, tMediaAdd, tMediaGo, tMediaDel, tPin, tDel, tChatSend, tChatLoad });
})();
