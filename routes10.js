// v41/v51: турниры (с вступительным взносом). Сетка строится генератором из bracket.js.
import rateLimit from "express-rate-limit";
import { buildBracket, report as brReport, finalCode, BYE } from "./bracket.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF = ["moderator", "admin", "owner"];

export default function routes10(app, { q, tx, E, wrap, need, hooks }) {
  const rl = rateLimit({ windowMs: 60e3, limit: 40 });
  const audit = (a, act, id, d) => q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,$2,'tournament',$3,$4)", [a, act, String(id), d || {}]).catch(() => {});
  const roleOf = async req => (await q("select role from users where id=$1", [req.user.id]))[0]?.role;
  // создавать турниры могут организаторы и администрация; управлять чужими — только персонал (модератор, админ, владелец)
  const maker = async req => { if (![...STAFF.slice(1), "organizer"].includes(await roleOf(req))) throw E(403, "forbidden"); };
  const manage = async (req, tid) => {
    const role = await roleOf(req); if (STAFF.includes(role)) return;
    const [t] = await q("select created_by from tournaments where id=$1", [tid]);
    if (!(role === "organizer" && t && t.created_by === req.user.id)) throw E(403, "forbidden");
  };
  const uuid = id => { if (!UUID.test(String(id))) throw E(404, "not found"); return id; };

  // матчи из БД в формат генератора и обратно
  const loadMap = async (c, tid) => {
    const rows = (await c.query("select * from tournament_matches where tournament_id=$1", [tid])).rows;
    const M = new Map();
    for (const r of rows) M.set(r.code, {
      code: r.code, bracket: r.bracket, round: r.round, slot: r.slot, p1: r.p1, p2: r.p2, winner: r.winner, loser: r.loser, status: r.status,
      winnerTo: r.winner_to ? { match: r.winner_to, side: r.winner_side } : undefined,
      loserTo: r.loser_to ? { match: r.loser_to, side: r.loser_side } : undefined,
    });
    return M;
  };
  const saveMap = async (c, tid, M, only) => {
    for (const m of M.values()) {
      if (only && !only.has(m.code)) continue;
      await c.query("update tournament_matches set p1=$3,p2=$4,winner=$5,loser=$6,status=$7 where tournament_id=$1 and code=$2",
        [tid, m.code, m.p1, m.p2, m.winner, m.loser, m.status]);
    }
  };
  const snapshot = M => new Map([...M].map(([k, m]) => [k, JSON.stringify([m.p1, m.p2, m.winner, m.loser, m.status])]));

  // записать итог матча, продвинуть игроков, при финале закрыть турнир
  async function finish(c, t, code, winner, s1, s2) {
    const M = await loadMap(c, t.id), before = snapshot(M);
    brReport(M, code, winner);
    const changed = new Set([...M.keys()].filter(k => before.get(k) !== JSON.stringify([M.get(k).p1, M.get(k).p2, M.get(k).winner, M.get(k).loser, M.get(k).status])));
    await saveMap(c, t.id, M, changed);
    if (s1 != null) await c.query("update tournament_matches set score1=$3,score2=$4 where tournament_id=$1 and code=$2", [t.id, code, s1, s2]);
    const players = (await c.query("select count(*)::int n from tournament_players where tournament_id=$1", [t.id])).rows[0].n;
    const fin = M.get(finalCode(t.format, players));
    if (fin && fin.status === "done" && fin.winner && fin.winner !== BYE) {
      await c.query("update tournaments set status='finished',winner_user_id=$2 where id=$1", [t.id, fin.winner]);
    }
  }

  // ---- список
  app.get("/api/tournaments", wrap(async (req, res) => {
    const st = ["registration", "running", "finished", "cancelled"].includes(req.query.status) ? req.query.status : null;
    const lim = Math.min(Math.max(+req.query.limit || 30, 1), 60);
    res.json(await q(`select t.id,t.title,t.game_name,t.format,t.max_players,t.prize_text,t.entry_fee::float entry_fee,t.status,t.start_at,
        (select count(*) from tournament_players p where p.tournament_id=t.id)::int players, wu.username winner_name
      from tournaments t left join users wu on wu.id=t.winner_user_id
      where ($1::text is null or t.status=$1)
      order by case t.status when 'running' then 0 when 'registration' then 1 else 2 end,
        case when t.status in ('finished','cancelled') then -extract(epoch from t.start_at) else extract(epoch from t.start_at) end
      limit $2`, [st, lim]));
  }));

  // ---- карточка
  app.get("/api/tournaments/:id", wrap(async (req, res) => {
    const id = uuid(req.params.id);
    const [t] = await q(`select t.*,wu.username winner_name,cu.username created_name from tournaments t
      left join users wu on wu.id=t.winner_user_id left join users cu on cu.id=t.created_by where t.id=$1`, [id]);
    if (!t) throw E(404, "not found");
    const players = await q(`select p.user_id,p.nick,p.game_id,p.seed,u.username from tournament_players p join users u on u.id=p.user_id
      where p.tournament_id=$1 order by p.created_at`, [id]);
    const nick = new Map(players.map(p => [p.user_id, p.nick]));
    const rows = await q("select * from tournament_matches where tournament_id=$1 order by bracket,round,slot", [id]);
    const me = req.user?.id, myReports = me ? new Set((await q("select r.match_id from tournament_reports r join tournament_matches m on m.id=r.match_id where m.tournament_id=$1 and r.user_id=$2", [id, me])).map(r => r.match_id)) : new Set();
    const name = v => v === null ? null : v === BYE ? "—" : (nick.get(v) || "?");
    const matches = rows.map(m => ({
      id: m.id, code: m.code, bracket: m.bracket, round: m.round, slot: m.slot, status: m.status,
      p1: m.p1, p2: m.p2, p1_name: name(m.p1), p2_name: name(m.p2), winner: m.winner, score1: m.score1, score2: m.score2,
      mine: !!me && (m.p1 === me || m.p2 === me), reported: myReports.has(m.id),
    }));
    let role = null; if (me) role = (await q("select role from users where id=$1", [me]))[0]?.role;
    res.json({
      tournament: { id: t.id, title: t.title, game_name: t.game_name, format: t.format, max_players: t.max_players, prize_text: t.prize_text, prizes: t.prizes || [], entry_fee: Number(t.entry_fee), created_name: t.created_name,
        rules_text: t.rules_text, status: t.status, start_at: t.start_at, winner_user_id: t.winner_user_id, winner_name: t.winner_name },
      players: players.map(p => ({ user_id: p.user_id, nick: p.nick, game_id: p.game_id, username: p.username, seed: p.seed })),
      matches, joined: !!me && players.some(p => p.user_id === me), staff: STAFF.includes(role) || (role === "organizer" && t.created_by === me),
    });
  }));

  // ---- создание (организатор или администрация)
  app.post("/api/tournaments", need, rl, wrap(async (req, res) => {
    await maker(req);
    const b = req.body || {}, title = String(b.title || "").trim(), game = String(b.game_name || "").trim();
    const max = Math.floor(+b.max_players), fmt = b.format === "double" ? "double" : "single", start = new Date(b.start_at);
    if (title.length < 3 || title.length > 80) throw E(400, "bad title");
    if (game.length < 2 || game.length > 60) throw E(400, "bad game");
    if (!Number.isInteger(max) || max < 2 || max > 128) throw E(400, "bad size");
    // призовые места: минимум одно, у каждого свой приз
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
      const t = (await c.query("select status,max_players,start_at,entry_fee from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "registration") throw E(409, "tournament closed");
      const n = (await c.query("select count(*)::int n from tournament_players where tournament_id=$1", [id])).rows[0].n;
      if (n >= t.max_players) throw E(409, "tournament full");
      const fee = Number(t.entry_fee) || 0;
      const r = await c.query("insert into tournament_players(tournament_id,user_id,nick,game_id,paid) values($1,$2,$3,$4,$5) on conflict do nothing returning (extract(epoch from created_at)*1000)::bigint ms", [id, req.user.id, nick, gid, fee]);
      if (!r.rowCount) throw E(409, "already joined");
      // каждая запись имеет свой номер: выйти до старта (взнос вернётся) и записаться снова можно сколько угодно раз
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

  // ---- старт и отмена (персонал)
  app.post("/api/tournaments/:id/start", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    await tx(async c => {
      const t = (await c.query("select * from tournaments where id=$1 for update", [id])).rows[0];
      if (!t) throw E(404, "not found");
      if (t.status !== "registration") throw E(409, "tournament closed");
      const ps = (await c.query("select user_id from tournament_players where tournament_id=$1 order by created_at", [id])).rows.map(r => r.user_id);
      if (ps.length < 2) throw E(409, "not enough players");
      if (t.format === "double" && ps.length < 4) throw E(409, "double needs 4");
      for (let i = 0; i < ps.length; i++) await c.query("update tournament_players set seed=$3 where tournament_id=$1 and user_id=$2", [id, ps[i], i + 1]);
      const M = buildBracket(ps, t.format);
      for (const m of M.values()) await c.query(
        "insert into tournament_matches(tournament_id,code,bracket,round,slot,p1,p2,winner,loser,winner_to,winner_side,loser_to,loser_side,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        [id, m.code, m.bracket, m.round, m.slot, m.p1, m.p2, m.winner, m.loser, m.winnerTo?.match || null, m.winnerTo?.side || null, m.loserTo?.match || null, m.loserTo?.side || null, m.status]);
      await c.query("update tournaments set status='running' where id=$1", [id]);
    });
    audit(req.user.id, "tournament_start", id); res.json({ ok: true });
  }));
  app.post("/api/tournaments/:id/cancel", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id); await manage(req, id);
    await tx(async c => {
      const r = (await c.query("update tournaments set status='cancelled' where id=$1 and status in ('registration','running') returning id", [id])).rows;
      if (!r.length) throw E(409, "tournament closed");
      // турнир отменён организатором: взносы участникам возвращаются
      const ps = (await c.query("select user_id,paid from tournament_players where tournament_id=$1 and paid>0", [id])).rows;
      for (const p of ps) await hooks.move(c, p.user_id, "tournament_refund", Number(p.paid), "tournament", id, "trefund:" + id + ":" + p.user_id);
    });
    audit(req.user.id, "tournament_cancel", id); res.json({ ok: true });
  }));

  // ---- результат от игрока: оба сообщили одинаково — матч засчитан, иначе спор
  app.post("/api/tournament-matches/:id/report", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id), num = v => (v === "" || v == null ? NaN : +v), me = num(req.body?.me), opp = num(req.body?.opp);
    if (!Number.isInteger(me) || !Number.isInteger(opp) || me < 0 || opp < 0 || me > 99 || opp > 99) throw E(400, "bad score");
    if (me === opp) throw E(400, "draw not allowed");
    const out = await tx(async c => {
      const m = (await c.query("select * from tournament_matches where id=$1 for update", [id])).rows[0];
      if (!m) throw E(404, "not found");
      const t = (await c.query("select * from tournaments where id=$1 for update", [m.tournament_id])).rows[0];
      if (t.status !== "running") throw E(409, "tournament closed");
      if (!["ready", "waiting_result", "disputed"].includes(m.status)) throw E(409, "match not open");
      if (m.p1 !== req.user.id && m.p2 !== req.user.id) throw E(403, "forbidden");
      await c.query("insert into tournament_reports(match_id,user_id,s_me,s_opp) values($1,$2,$3,$4) on conflict (match_id,user_id) do update set s_me=$3,s_opp=$4,created_at=now()", [id, req.user.id, me, opp]);
      const other = m.p1 === req.user.id ? m.p2 : m.p1;
      const o = (await c.query("select s_me,s_opp from tournament_reports where match_id=$1 and user_id=$2", [id, other])).rows[0];
      if (!o) { await c.query("update tournament_matches set status='waiting_result' where id=$1", [id]); return { state: "waiting" }; }
      if (o.s_me === opp && o.s_opp === me) {
        const winner = me > opp ? req.user.id : other, s1 = m.p1 === req.user.id ? me : opp, s2 = m.p1 === req.user.id ? opp : me;
        await finish(c, t, m.code, winner, s1, s2);
        return { state: "done" };
      }
      await c.query("update tournament_matches set status='disputed' where id=$1", [id]);
      return { state: "disputed" };
    });
    res.json(out);
  }));

  // ---- решение спора или ручной результат (персонал)
  app.post("/api/tournament-matches/:id/resolve", need, rl, wrap(async (req, res) => {
    const id = uuid(req.params.id), win = String(req.body?.winner || "");
    { const [mm] = await q("select tournament_id from tournament_matches where id=$1", [id]); if (!mm) throw E(404, "not found"); await manage(req, mm.tournament_id); }
    const sc = v => (v === "" || v == null ? null : (Number.isInteger(+v) && +v >= 0 && +v <= 99 ? +v : NaN)), s1 = sc(req.body?.score1), s2 = sc(req.body?.score2);
    if (Number.isNaN(s1) || Number.isNaN(s2)) throw E(400, "bad score");
    await tx(async c => {
      const m = (await c.query("select * from tournament_matches where id=$1 for update", [id])).rows[0];
      if (!m) throw E(404, "not found");
      const t = (await c.query("select * from tournaments where id=$1 for update", [m.tournament_id])).rows[0];
      if (t.status !== "running") throw E(409, "tournament closed");
      if (!["ready", "waiting_result", "disputed"].includes(m.status)) throw E(409, "match not open");
      if (win !== m.p1 && win !== m.p2) throw E(400, "bad winner");
      await finish(c, t, m.code, win, s1, s2);
    });
    audit(req.user.id, "tournament_resolve", id, { winner: win }); res.json({ ok: true });
  }));
}
