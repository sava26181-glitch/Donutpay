// v60: турниры. Играют вне сайта; на сайте: запись (с взносом), открытый чат участников и организатора,
// организатор выбирает победителей и закрывает турнир, взносы распределяются между призовыми местами.
import rateLimit from "express-rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF = ["moderator", "admin", "owner"], ADM = ["admin", "owner"];

export default function routes10(app, { q, tx, E, wrap, need, hooks }) {
  const rl = rateLimit({ windowMs: 60e3, limit: 40 });
  const chatRl = rateLimit({ windowMs: 60e3, limit: 20 });
  const audit = (a, act, id, d) => q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,$2,'tournament',$3,$4)", [a, act, String(id), d || {}]).catch(() => {});
  const roleOf = async req => (await q("select role from users where id=$1", [req.user.id]))[0]?.role;
  const uuid = id => { if (!UUID.test(String(id))) throw E(404, "not found"); return id; };
  // создавать турниры могут организаторы и администрация
  const maker = async req => { if (![...ADM, "organizer"].includes(await roleOf(req))) throw E(403, "forbidden"); };
  // управлять: персонал, создатель турнира и подключённые им помощники
  const canManage = async (uid, role, tid) => {
    if (STAFF.includes(role)) return true;
    const [t] = await q("select created_by from tournaments where id=$1", [tid]); if (!t) return false;
    if (t.created_by === uid) return true;
    return (await q("select 1 from tournament_helpers where tournament_id=$1 and user_id=$2", [tid, uid])).length > 0;
  };
  const manage = async (req, tid) => { if (!(await canManage(req.user.id, await roleOf(req), tid))) throw E(403, "forbidden"); };
  const isMember = async (uid, tid) => (await q("select 1 from tournament_players where tournament_id=$1 and user_id=$2", [tid, uid])).length > 0;

  // ---- список
  app.get("/api/tournaments", wrap(async (req, res) => {
    const st = ["registration", "running", "finished", "cancelled"].includes(req.query.status) ? req.query.status : null;
    const lim = Math.min(Math.max(+req.query.limit || 30, 1), 100);
    res.json(await q(`select t.id,t.title,t.game_name,t.format,t.max_players,t.prize_text,t.entry_fee::float entry_fee,t.status,t.start_at,t.pinned,
        (select count(*) from tournament_players p where p.tournament_id=t.id)::int players, wu.username winner_name
      from tournaments t left join users wu on wu.id=t.winner_user_id
      where ($1::text is null or t.status=$1)
      order by t.pinned desc, case t.status when 'running' then 0 when 'registration' then 1 else 2 end,
        case when t.status in ('finished','cancelled') then -extract(epoch from coalesce(t.finished_at,t.start_at)) else extract(epoch from t.start_at) end
      limit $2`, [st, lim]));
  }));

  // ---- карточка
  app.get("/api/tournaments/:id", wrap(async (req, res) => {
    const id = uuid(req.params.id);
    const [t] = await q(`select t.*,wu.username winner_name,cu.username created_name from tournaments t
      left join users wu on wu.id=t.winner_user_id left join users cu on cu.id=t.created_by where t.id=$1`, [id]);
    if (!t) throw E(404, "not found");
    const players = await q(`select p.user_id,p.nick,p.game_id,p.place,p.prize::float prize,p.paid::float paid,u.username from tournament_players p join users u on u.id=p.user_id
      where p.tournament_id=$1 order by p.place nulls last, p.created_at`, [id]);
    const helpers = await q("select h.user_id,u.username from tournament_helpers h join users u on u.id=h.user_id where h.tournament_id=$1", [id]);
    const media = await q("select id,kind,media_id,url,caption from tournament_media where tournament_id=$1 order by created_at", [id]);
    const me = req.user?.id; let role = null; if (me) role = await roleOf(req);
    const manage = !!me && await canManage(me, role, id), member = !!me && players.some(p => p.user_id === me);
    res.json({
      tournament: { id: t.id, title: t.title, game_name: t.game_name, format: t.format, max_players: t.max_players, prize_text: t.prize_text, prizes: t.prizes || [], entry_fee: Number(t.entry_fee), created_name: t.created_name,
        rules_text: t.rules_text, result_text: t.result_text, status: t.status, start_at: t.start_at, finished_at: t.finished_at, winner_user_id: t.winner_user_id, winner_name: t.winner_name, pinned: t.pinned, created_by: t.created_by },
      players, helpers, media, joined: member, staff: manage, owner_of: !!me && t.created_by === me, admin: ADM.includes(role),
      chat: (manage || member || STAFF.includes(role)) && ["registration", "running"].includes(t.status),
      pool: Math.round(players.reduce((s, p) => s + p.paid, 0) * 100) / 100,
    });
  }));

  // ---- создание
  app.post("/api/tournaments", need, rl, wrap(async (req, res) => {
    await maker(req);
    const b = req.body || {}, title = String(b.title || "").trim(), game = String(b.game_name || "").trim();
    const max = Math.floor(+b.max_players), fmt = "single", start = new Date(b.start_at);
    if (title.length < 3 || title.length > 80) throw E(400, "bad title");
    if (game.length < 2 || game.length > 60) throw E(400, "bad game");
    if (!Number.isInteger(max) || max < 2 || max > 128) throw E(400, "bad size");
    let pr = Array.isArray(b.prizes) ? b.prizes : []; pr = pr.slice(0, 10).map((x, i) => ({ place: i + 1, prize: String(x?.prize ?? x ?? "").trim().slice(0, 100) }));
    if (!pr.length) pr = [{ place: 1, prize: String(b.prize_text || "").trim().slice(0, 100) }];
    if (pr.length > max) throw E(400, "bad prizes");
    const prizeText = pr.filter(x => x.prize).map(x => pr.length > 1 ? x.place + " место: " + x.prize : x.prize).join(" · ").slice(0, 300) || null;
    if (isNaN(+start)) throw E(400, "bad date");
    const fee = b.entry_fee === "" || b.entry_fee == null ? 0 : Math.round(+b.entry_fee * 100) / 100;
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) throw E(400, "bad fee");
    const [t] = await q("insert into tournaments(title,game_name,format,max_players,prize_text,rules_text,start_at,created_by,entry_fee,prizes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) returning id",
      [title, game, fmt, max, prizeText, String(b.rules_text || "").trim().slice(0, 4000) || null, start, req.user.id, fee, JSON.stringify(pr)]);
    audit(req.user.id, "tournament_create", t.id, { title }); res.json({ id: t.id });
  }));

  // ---- участие
  app.post("/api/tournaments/:id/join", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id), nick = String(req.body?.nick || "").trim();
    if (nick.length < 2 || nick.length > 40) throw E(400, "bad nick");
    const gid = String(req.body?.game_id || "").trim(); if (gid.length < 2 || gid.length > 40) throw E(400, "bad game id");
    await tx(async c => {
      const t = (await c.query("select status,max_players,entry_fee from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "registration") throw E(409, "tournament closed");
      const n = (await c.query("select count(*)::int n from tournament_players where tournament_id=$1", [id])).rows[0].n;
      if (n >= t.max_players) throw E(409, "tournament full");
      const fee = Number(t.entry_fee) || 0;
      const r = await c.query("insert into tournament_players(tournament_id,user_id,nick,game_id,paid) values($1,$2,$3,$4,$5) on conflict do nothing returning (extract(epoch from created_at)*1000)::bigint ms", [id, req.user.id, nick, gid, fee]);
      if (!r.rowCount) throw E(409, "already joined");
      if (fee > 0) await hooks.move(c, req.user.id, "tournament_fee", -fee, "tournament", id, "tfee:" + id + ":" + req.user.id + ":" + r.rows[0].ms);
    });
    res.json({ ok: true });
  }));
  app.delete("/api/tournaments/:id/join", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id);
    await tx(async c => {
      const t = (await c.query("select status from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "registration") throw E(409, "tournament closed");
      // пока турнир не начался, взнос возвращается полностью
      const d = (await c.query("delete from tournament_players where tournament_id=$1 and user_id=$2 returning paid,(extract(epoch from created_at)*1000)::bigint ms", [id, req.user.id])).rows[0];
      if (d && Number(d.paid) > 0) await hooks.move(c, req.user.id, "tournament_refund", Number(d.paid), "tournament", id, "tleave:" + id + ":" + req.user.id + ":" + d.ms);
    });
    res.json({ ok: true });
  }));

  // ---- старт (набор закрывается, состав фиксируется), отмена
  app.post("/api/tournaments/:id/start", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    await tx(async c => {
      const t = (await c.query("select status from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "registration") throw E(409, "tournament closed");
      const n = (await c.query("select count(*)::int n from tournament_players where tournament_id=$1", [id])).rows[0].n;
      if (n < 2) throw E(409, "not enough players");
      await c.query("update tournaments set status='running' where id=$1", [id]);
    });
    audit(req.user.id, "tournament_start", id); res.json({ ok: true });
  }));
  app.post("/api/tournaments/:id/cancel", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    await tx(async c => {
      const r = (await c.query("update tournaments set status='cancelled',finished_at=now() where id=$1 and status in ('registration','running') returning id", [id])).rows;
      if (!r.length) throw E(409, "tournament closed");
      const ps = (await c.query("select user_id,paid from tournament_players where tournament_id=$1 and paid>0", [id])).rows;
      for (const p of ps) await hooks.move(c, p.user_id, "tournament_refund", Number(p.paid), "tournament", id, "trefund:" + id + ":" + p.user_id);
    });
    audit(req.user.id, "tournament_cancel", id); res.json({ ok: true });
  }));

  // ---- завершение: организатор выбирает игроков на призовые места; собранные взносы делятся между ними (доли 1, 1/2, 1/3 ...)
  const split = (poolCents, n) => {
    const w = Array.from({ length: n }, (_, i) => 1 / (i + 1)), s = w.reduce((a, b) => a + b, 0), a = w.map(x => Math.floor(poolCents * x / s));
    a[0] += poolCents - a.reduce((x, y) => x + y, 0); return a;
  };
  app.post("/api/tournaments/:id/finish", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    const places = Array.isArray(req.body?.places) ? req.body.places.map(String) : [];
    const resultText = String(req.body?.result_text || "").trim().slice(0, 1000) || null;
    await tx(async c => {
      const t = (await c.query("select status,prizes from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "running") throw E(409, "not running");
      const ps = (await c.query("select user_id,paid from tournament_players where tournament_id=$1", [id])).rows;
      const need = Math.min((t.prizes || []).length || 1, ps.length);
      if (places.length !== need || new Set(places).size !== need || !places.every(u => ps.some(p => p.user_id === u))) throw E(400, "bad places");
      const poolC = Math.round(ps.reduce((s, p) => s + Number(p.paid), 0) * 100), amt = split(poolC, need);
      for (let i = 0; i < need; i++) {
        await c.query("update tournament_players set place=$3,prize=$4 where tournament_id=$1 and user_id=$2", [id, places[i], i + 1, amt[i] / 100]);
        if (amt[i] > 0) await hooks.move(c, places[i], "tournament_prize", amt[i] / 100, "tournament", id, "tprize:" + id + ":" + places[i]);
      }
      await c.query("update tournaments set status='finished',winner_user_id=$2,finished_at=now(),result_text=$3 where id=$1", [id, places[0], resultText]);
    });
    audit(req.user.id, "tournament_finish", id, { places }); res.json({ ok: true });
  }));

  // ---- помощники организатора
  app.post("/api/tournaments/:id/helpers", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    const [u] = await q("select id from users where username=$1", [String(req.body?.username || "").trim()]); if (!u) throw E(404, "user not found");
    await q("insert into tournament_helpers(tournament_id,user_id) values($1,$2) on conflict do nothing", [id, u.id]);
    audit(req.user.id, "tournament_helper_add", id, { user: u.id }); res.json({ ok: true });
  }));
  app.delete("/api/tournaments/:id/helpers/:uid", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id); uuid(req.params.uid);
    await q("delete from tournament_helpers where tournament_id=$1 and user_id=$2", [id, req.params.uid]); res.json({ ok: true });
  }));

  // ---- медиа итогов (картинка «что произошло», лучшие моменты); видео добавляется ссылкой
  app.post("/api/tournaments/:id/media", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    const b = req.body || {}, kind = b.kind === "highlight" ? "highlight" : "result", caption = String(b.caption || "").trim().slice(0, 200) || null;
    let mid = null, url = null;
    if (b.media_id) { mid = uuid(b.media_id); const [m] = await q("select 1 from media where id=$1 and owner_id=$2", [mid, req.user.id]); if (!m) throw E(404, "not found"); }
    else { url = String(b.url || "").trim(); if (!/^https:\/\/[^\s<>"']{4,300}$/i.test(url)) throw E(400, "bad url"); }
    const [n] = await q("select count(*)::int n from tournament_media where tournament_id=$1", [id]); if (n.n >= 30) throw E(409, "too many media");
    const [r] = await q("insert into tournament_media(tournament_id,kind,media_id,url,caption) values($1,$2,$3,$4,$5) returning id", [id, kind, mid, url, caption]);
    res.json({ id: r.id });
  }));
  app.delete("/api/tournaments/:id/media/:mid", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id); uuid(req.params.mid);
    await q("delete from tournament_media where id=$1 and tournament_id=$2", [req.params.mid, id]); res.json({ ok: true });
  }));

  // ---- закрепить / открепить / удалить завершённый турнир (админ)
  const admin = async req => { if (!ADM.includes(await roleOf(req))) throw E(403, "forbidden"); };
  app.post("/api/tournaments/:id/pin", need, rl, wrap(async (req, res) => {
    await admin(req); const id = uuid(req.params.id);
    const r = await q("update tournaments set pinned=$2 where id=$1 and status in ('finished','cancelled') returning id", [id, !!req.body?.pinned]); if (!r.length) throw E(409, "not finished");
    audit(req.user.id, "tournament_pin", id, { pinned: !!req.body?.pinned }); res.json({ ok: true });
  }));
  app.delete("/api/tournaments/:id", need, rl, wrap(async (req, res) => {
    await admin(req); const id = uuid(req.params.id);
    const r = await q("delete from tournaments where id=$1 and status in ('finished','cancelled') returning id", [id]); if (!r.length) throw E(409, "not finished");
    audit(req.user.id, "tournament_delete", id); res.json({ ok: true });
  }));

  // ---- открытый чат: участники, организатор, помощники и персонал; после завершения закрывается
  const chatAccess = async (req, id) => {
    const role = await roleOf(req); const [t] = await q("select status from tournaments where id=$1", [id]); if (!t) throw E(404, "not found");
    if (!(STAFF.includes(role) || await canManage(req.user.id, role, id) || await isMember(req.user.id, id))) throw E(403, "forbidden");
    return t;
  };
  app.get("/api/tournaments/:id/chat", need, wrap(async (req, res) => {
    const id = uuid(req.params.id), t = await chatAccess(req, id);
    if (!["registration", "running"].includes(t.status)) return res.json({ closed: true, messages: [] });
    const after = req.query.after ? new Date(req.query.after) : null;
    const msgs = await q(`select m.id,m.body,m.created_at,m.user_id,u.username,
        (m.user_id=t.created_by) host,(exists(select 1 from tournament_helpers h where h.tournament_id=t.id and h.user_id=m.user_id)) helper
      from tournament_messages m join users u on u.id=m.user_id join tournaments t on t.id=m.tournament_id
      where m.tournament_id=$1 and ($2::timestamptz is null or m.created_at>$2) order by m.created_at desc limit 100`, [id, after && !isNaN(+after) ? after : null]);
    res.json({ closed: false, messages: msgs.reverse() });
  }));
  app.post("/api/tournaments/:id/chat", need, chatRl, wrap(async (req, res) => {
    const id = uuid(req.params.id), t = await chatAccess(req, id);
    if (!["registration", "running"].includes(t.status)) throw E(409, "chat closed");
    const body = String(req.body?.body || "").trim(); if (!body || body.length > 500) throw E(400, "bad message");
    await q("insert into tournament_messages(tournament_id,user_id,body) values($1,$2,$3)", [id, req.user.id, body]);
    hooks.live?.("tchat", { id }); res.json({ ok: true });
  }));
}
