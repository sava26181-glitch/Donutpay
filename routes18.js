// v74: переписка по заявке на вывод. Пользователь и администратор пишут друг другу прямо в заявке.
export default function routes18(app, { q, E, wrap, need, hooks, pushUser, notifyStaff }) {
  const STAFF = ["admin", "owner"], uuid = s => /^[0-9a-f-]{36}$/i.test(String(s));
  const lastMsg = new Map(); // защита от флуда: не больше 12 сообщений в минуту с аккаунта

  // доступ: владелец заявки или сотрудник
  const load = async (req) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [me] = await q("select role,username from users where id=$1", [req.user.id]);
    const [w] = await q("select w.id,w.user_id,w.amount,w.fee,w.method,w.details,w.holder,w.status,w.note,w.created_at,w.resolved_at,u.username from withdrawals w join users u on u.id=w.user_id where w.id=$1", [req.params.id]);
    const staff = STAFF.includes(me?.role); if (!w || !(staff || w.user_id === req.user.id)) throw E(404, "not found");
    return { w, staff, me };
  };
  const mask = d => { const s = String(d || ""); return s.length > 8 ? s.slice(0, 4) + " … " + s.slice(-4) : s };

  app.get("/api/withdrawals/:id", need, wrap(async (req, res) => {
    const { w, staff } = await load(req);
    const ms = await q("select m.id,m.staff,m.body,m.created_at,m.author_id,u.username from withdrawal_msgs m join users u on u.id=m.author_id where m.withdrawal_id=$1 order by m.id limit 300", [w.id]);
    const open = ["pending", "processing"].includes(w.status);
    res.set("Cache-Control", "no-store").json({
      w: { id: w.id, amount: Number(w.amount), fee: Number(w.fee || 0), method: w.method, details: staff ? w.details : mask(w.details), status: w.status, note: w.note, created_at: w.created_at, resolved_at: w.resolved_at, username: staff ? w.username : undefined },
      msgs: ms.map(m => ({ id: m.id, mine: m.author_id === req.user.id, staff: m.staff, name: m.staff ? "Поддержка" : m.username, body: m.body, created_at: m.created_at })),
      staff, can_write: staff || open
    });
  }));

  app.post("/api/withdrawals/:id/messages", need, wrap(async (req, res) => {
    const { w, staff, me } = await load(req);
    const body = String(req.body?.body || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, 1000);
    if (body.length < 1) throw E(400, "Напишите сообщение");
    if (!staff && !["pending", "processing"].includes(w.status)) throw E(409, "Заявка закрыта. Если остались вопросы, напишите в поддержку");
    const now = Date.now(), arr = (lastMsg.get(req.user.id) || []).filter(t => now - t < 60000); if (arr.length >= 12) throw E(429, "Слишком часто, подождите минуту"); arr.push(now); lastMsg.set(req.user.id, arr); if (lastMsg.size > 5000) lastMsg.clear();
    const [m] = await q("insert into withdrawal_msgs(withdrawal_id,author_id,staff,body) values($1,$2,$3,$4) returning id,created_at", [w.id, req.user.id, staff, body]);
    const short = body.length > 90 ? body.slice(0, 90) + "…" : body;
    if (staff && w.user_id !== req.user.id) { // администратор написал: уведомление человеку на сайте и в Telegram
      try { const [n] = await q("insert into notifications(user_id,type,payload) values($1,'wd_msg',$2) returning id,payload", [w.user_id, { withdrawal_id: w.id, text: short }]); pushUser?.(w.user_id, "notify", { id: n.id, type: "wd_msg", ...n.payload }); } catch (e) { console.warn("[wd_msg]", e.message); }
      try { hooks.notifyTg?.(w.user_id, `Сообщение по заявке на вывод: ${short}\nОтветьте в разделе «Финансы» на сайте.`); } catch { }
    } else { // человек написал: сообщение сотрудникам
      try { notifyStaff?.(`Сообщение по заявке на вывод от ${me?.username}: ${short}`); } catch { }
    }
    res.status(201).json({ ok: true, id: m.id });
  }));

  // счётчик в админке: сколько заявок ждут ответа от администрации (последним написал человек)
  hooks.wdAwait = async () => { const [r] = await q("select count(*)::int c from withdrawals w where w.status in ('pending','processing') and (select staff from withdrawal_msgs m where m.withdrawal_id=w.id order by m.id desc limit 1) = false"); return r?.c || 0; };
}
