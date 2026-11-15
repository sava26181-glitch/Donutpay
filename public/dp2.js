/* DonutPay: кабинет сотрудника (жалобы на отзывы, команда, личная статистика) и кнопка жалобы на отзыв в заказе */
(function () {
  const $$ = (s, r) => (r || document).querySelector(s);
  const E = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const staff = () => typeof ME !== "undefined" && ME && ["moderator", "admin", "owner"].includes(ME.role);
  const dur = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} ч ${String(m).padStart(2, "0")} мин` : `${m} мин` };
  const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
  const dt = d => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // тексты уведомлений
  try { if (typeof NT6 === "object") { NT6.review_ok = n => `Модераторы проверили отзыв к заказу #${n.number}: он выставлен честно и остаётся.${n.note ? " " + n.note : ""}`; NT6.review_removed = n => `Отзыв к заказу #${n.number} удалён модератором.${n.note ? " " + n.note : ""}` } } catch { }

  // ---------- жалоба продавца на отзыв (кнопка рядом со спором)
  const cache = new Map();
  const orderBtn = async () => {
    const m = /^#\/order\/([0-9a-f-]{36})/i.exec(location.hash); if (!m) return;
    const root = $$(".ord"); if (!root || root.querySelector(".dp-rr")) return;
    let c = cache.get(m[1]); if (c && c.p) return;
    if (!c || Date.now() - c.t > 15000) { c = { t: Date.now(), p: 1 }; cache.set(m[1], c); try { c.st = await api(`/orders/${m[1]}/review-state`) } catch { c.st = null } c.p = 0; if (!$$(".ord") || $$(".ord .dp-rr")) return }
    const st = c.st;
    if (!st || (!st.can && !st.reported && !st.verdict)) return;
    const ref = root.querySelector('button[onclick^="disp("]') || root.querySelector(".orv"); if (!ref) return;
    const b = document.createElement("button"); b.className = "btn dp-rr" + (st.can ? " dng" : ""); b.disabled = !st.can;
    b.textContent = st.reported ? "Жалоба на отзыв на рассмотрении" : st.verdict === "keep" ? "Отзыв проверен модераторами" : "Пожаловаться на отзыв";
    b.onclick = () => formM("Жалоба на отзыв", [{ k: "r", l: "Что не так с отзывом", t: "area", max: 1000, v: "" }], "Отправить", async v => {
      await api(`/orders/${m[1]}/review-report`, { method: "POST", body: { reason: v.r } }); toast("Жалоба отправлена модераторам"); route();
    });
    ref.insertAdjacentElement(ref.matches(".orv") ? "beforebegin" : "afterend", b);
  };
  new MutationObserver(() => { try { orderBtn() } catch { } }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- кабинет сотрудника: #/admin?tab=staff
  const ROWS = [["report", "Ответы на репорты"], ["ticket", "Обращения в поддержку"], ["arbitration", "Решённые арбитражи"], ["review", "Жалобы на отзывы"]];
  const statTable = s => `<table class="dp-st"><thead><tr><th></th><th>Сегодня</th><th>Месяц</th><th>Год</th></tr></thead><tbody>${ROWS.map(([k, l]) => `<tr><td>${l}</td><td>${s[k].d}</td><td>${s[k].m}</td><td>${s[k].y}</td></tr>`).join("")}<tr><td>Время на сайте</td><td>${dur(s.time.d)}</td><td>${dur(s.time.m)}</td><td>${dur(s.time.y)}</td></tr></tbody></table>`;
  const roleName = u => u.title_label || (u.role === "owner" ? "Главный" : u.role === "admin" ? "Админ" : "Модератор");

  window.dpRepAct = async (id, act) => {
    const note = (document.getElementById("dpn" + id) || {}).value || "";
    try { await api(`/staff/reports/${id}`, { method: "POST", body: { action: act, note } }); toast(act === "delete" ? "Отзыв удалён" : "Отзыв подтверждён"); route() } catch (e) { toast(e.message) }
  };
  window.dpSetTitle = async (id, sel) => { try { await api(`/staff/${id}/title`, { method: "POST", body: { title: sel.value || null } }); toast("Звание изменено") } catch (e) { toast(e.message); route() } };

  const staffPage = async () => {
    need(); if (!staff()) return empty("Доступ только для сотрудников.");
    const d = await api("/staff/me");
    let reps = []; if (d.me.title !== "tournament_mod") reps = await api("/staff/reports").catch(() => []);
    const rc = r => `<div class="dp-rc"><div class="row bet"><b>Заказ #${E(r.number)}</b><small class="m">${dt(r.created_at)}</small></div>
<div class="m" style="margin:2px 0 8px">${E(r.title)}. Покупатель ${E(r.reviewer)}, продавец ${E(r.seller)}</div>
<div class="dp-rv"><div style="color:#FBBF24;letter-spacing:2px">${r.rating ? stars(r.rating) : ""}</div><div>${r.review_body ? E(r.review_body) : "<i class=m>Без текста</i>"}</div>${r.reply ? `<div class="m" style="margin-top:6px">Ответ продавца: ${E(r.reply)}</div>` : ""}</div>
<div class="m" style="margin:10px 0 4px">Жалоба продавца</div><div class="dp-rv">${E(r.reason)}</div>
<div class="row" style="gap:8px;margin:10px 0"><button class="btn" onclick="go('/admin?tab=order&id=${r.order_id}')">Открыть чат заказа</button></div>
<input id="dpn${r.id}" maxlength="300" placeholder="Комментарий продавцу и покупателю (необязательно)" style="width:100%;margin-bottom:8px">
<div class="row" style="gap:8px"><button class="btn pri" onclick="dpRepAct(${r.id},'keep')">Отзыв честный, оставить</button><button class="btn dng" onclick="dpRepAct(${r.id},'delete')">Удалить отзыв</button></div></div>`;
    const tm = u => {
      const t = u.stats.report.d + u.stats.ticket.d + u.stats.arbitration.d + u.stats.review.d;
      const sel = d.can_title && u.role !== "owner" ? `<select onchange="dpSetTitle('${u.id}',this)"><option value="">Без звания</option>${Object.entries(d.titles).filter(([k]) => u.role === "admin" ? k === "senior_admin" : k !== "senior_admin").map(([k, l]) => `<option value="${k}" ${u.title === k ? "selected" : ""}>${l}</option>`).join("")}</select>` : "";
      return `<details class="dp-tm"><summary><b>${E(u.username)}</b><span class="m">${E(roleName(u))}</span><span class="m">сегодня: ${t}</span></summary>${sel ? `<div style="margin:8px 0">${sel}</div>` : ""}${statTable(u.stats)}</details>`;
    };
    return `<div class="dp-sf"><h2>Кабинет сотрудника</h2><p class="m">${E(d.me.username)} · ${E(roleName(d.me))}</p>
<h3>Моя статистика</h3>${statTable(d.stats)}
${d.me.title === "tournament_mod" ? "" : `<h3>Жалобы на отзывы${reps.length ? ` (${reps.length})` : ""}</h3>${reps.length ? reps.map(rc).join("") : `<div class="card"><span class="m">Новых жалоб нет.</span></div>`}`}
${d.team.length ? `<h3>Команда</h3><p class="m">Видны сотрудники ниже вас по должности.</p>${d.team.map(tm).join("")}` : ""}</div>`;
  };

  const wrapAdmin = () => {
    const orig = window.admin; if (typeof orig !== "function" || orig.__dp2) return;
    const f = async function () { try { if (new URLSearchParams((location.hash.split("?")[1]) || "").get("tab") === "staff") return await staffPage() } catch (e) { return `<div class="card"><b>${E(e.message)}</b></div>` } const h = await orig.apply(this, arguments); return h };
    f.__dp2 = 1; window.admin = f;
  };
  wrapAdmin(); setTimeout(wrapAdmin, 0); addEventListener("load", wrapAdmin);

  // ссылка на кабинет: в меню профиля и над админ-панелью
  const link = () => {
    if (!staff()) return;
    const um = $$("#um"); if (um && !um.querySelector(".dp-sl")) {
      const out = [...um.querySelectorAll("a,button,div")].find(x => /Выход/.test(x.textContent) && x.children.length < 4);
      const a = document.createElement("a"); a.className = "dp-sl"; a.textContent = "Кабинет сотрудника"; a.style.cssText = "display:block;padding:12px 16px;cursor:pointer"; a.onclick = () => { go("/admin?tab=staff") };
      (out || um).insertAdjacentElement(out ? "beforebegin" : "beforeend", a);
    }
    const app = $$("#app");
    if (app && /^#\/admin(\?|$)/.test(location.hash) && !/tab=staff/.test(location.hash) && !app.querySelector(".dp-sb")) {
      const h = app.querySelector("h2"); if (h) h.insertAdjacentHTML("afterend", `<a class="dp-sb" onclick="go('/admin?tab=staff')">Мой кабинет: статистика, жалобы на отзывы, команда</a>`);
    }
  };
  new MutationObserver(() => { try { link() } catch { } }).observe(document.documentElement, { childList: true, subtree: true });

  // время на сайте: пинг раз в минуту, пока вкладка открыта
  setInterval(() => { try { if (staff() && !document.hidden) api("/staff/ping", { method: "POST", body: {} }).catch(() => { }) } catch { } }, 60000);
})();
