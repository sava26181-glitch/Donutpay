// Персонал: жалобы на отзывы, иерархия, личная статистика (ответы на репорты, арбитражи, время на сайте).
// Иерархия: owner (главный) > admin со званием «старший админ» > admin > moderator (звания «модератор отзывов» / «модератор турниров»).
export default function routesStaff(app, { q, tx, E, wrap, need, notifyStaff }) {
  const STAFF = ["moderator", "admin", "owner"];
  const TITLES = { senior_admin: "Старший админ", review_mod: "Модератор отзывов", tournament_mod: "Модератор турниров" };
  q("create table if not exists review_reports(id bigserial primary key, order_id uuid not null, reporter_id uuid not null, reason text not null, status text not null default 'open', handled_by uuid, handled_at timestamptz, verdict text, note text, created_at timestamptz not null default now())")
    .then(() => q("create unique index if not exists i_rr_open on review_reports(order_id) where status='open'"))
    .then(() => q("create table if not exists staff_actions(id bigserial primary key, user_id uuid not null, kind text not null, ref text, at timestamptz not null default now())"))
    .then(() => q("create index if not exists i_sa_u on staff_actions(user_id, at)"))
    .then(() => q("create table if not exists staff_presence(user_id uuid not null, day date not null, seconds int not null default 0, primary key(user_id, day))"))
    .then(() => q("alter table users add column if not exists staff_title text"))
    .catch(e => console.warn("[staff]", e.message));

  const meOf = async req => { const [u] = await q("select id,role,staff_title,username from users where id=$1", [req.user.id]); return u };
  const staffGate = wrap(async (req, _res, next) => { const u = await meOf(req); if (!u || !STAFF.includes(u.role)) throw E(403, "forbidden"); req.me = u; next() });
  const rank = u => u.role === "owner" ? 4 : u.role === "admin" ? (u.staff_title === "senior_admin" ? 3 : 2) : 1;
  const canSee = (me, t) => me.id === t.id || rank(me) > rank(t);
  const uuid = s => /^[0-9a-f-]{36}$/i.test(String(s));

  // ---- журнал действий персонала (по успешным запросам)
  const roleCache = new Map();
  const infoOf = async id => { const c = roleCache.get(id); if (c && Date.now() - c.t < 20000) return c; const [u] = await q("select role,staff_title from users where id=$1", [id]).catch(() => []); const n = { r: u?.role || null, title: u?.staff_title || null, t: Date.now() }; roleCache.set(id, n); return n };
  const roleOf = async id => (await infoOf(id)).r;
  // звания ограничивают доступ модераторов: «модератор отзывов» и «модератор турниров» не заходят в остальные разделы админки
  const ALLOW = { review_mod: [/^\/api\/admin\/counts$/, /^\/api\/admin\/orders\//], tournament_mod: [/^\/api\/admin\/counts$/] };
  app.use("/api/admin", async (req, res, next) => {
    try {
      if (!req.user?.id) return next();
      const i = await infoOf(req.user.id);
      if (i.r === "moderator" && ALLOW[i.title] && !ALLOW[i.title].some(re => re.test(req.originalUrl.split("?")[0]))) return res.status(403).json({ error: "Ваше звание не даёт доступ к этому разделу" });
    } catch { }
    next();
  });
  const KINDS = [[/^\/api\/admin\/report-close\/[^/]+$/, "report"], [/^\/api\/admin\/tickets\/[^/]+\/status$/, "ticket"], [/^\/api\/tickets\/[^/]+\/messages$/, "ticket"], [/^\/api\/admin\/disputes\/[^/]+\/resolve$/, "arbitration"]];
  app.use((req, res, next) => {
    if (req.method !== "POST" || !req.path.startsWith("/api/")) return next();
    const k = KINDS.find(([re]) => re.test(req.path)); if (!k) return next();
    res.on("finish", async () => {
      try {
        if (res.statusCode >= 400 || !req.user?.id) return;
        const r = await roleOf(req.user.id); if (!STAFF.includes(r)) return;
        await q("insert into staff_actions(user_id,kind,ref) values($1,$2,$3)", [req.user.id, k[1], req.path.split("/")[4] || req.path.split("/")[3] || null]);
      } catch { }
    });
    next();
  });

  // ---- время на сайте: клиент раз в минуту присылает пинг
  const last = new Map();
  app.post("/api/staff/ping", need, staffGate, wrap(async (req, res) => {
    const now = Date.now(), prev = last.get(req.me.id) || 0; last.set(req.me.id, now);
    const sec = prev && now - prev < 150000 ? Math.round((now - prev) / 1000) : 0;
    if (sec > 0) await q("insert into staff_presence(user_id,day,seconds) values($1,current_date,$2) on conflict(user_id,day) do update set seconds=staff_presence.seconds+$2", [req.me.id, sec]);
    res.json({ ok: true });
  }));

  // ---- жалобы на отзывы
  app.get("/api/orders/:id/review-state", need, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [o] = await q("select o.id,o.seller_id,o.status from orders o where o.id=$1", [req.params.id]); if (!o || o.seller_id !== req.user.id) return res.json({ can: false });
    const [r] = await q("select rating,body from reviews where order_id=$1", [o.id]); if (!r) return res.json({ can: false });
    const [rep] = await q("select status,verdict from review_reports where order_id=$1 order by id desc limit 1", [o.id]);
    res.json({ can: !rep || (rep.status !== "open" && rep.verdict !== "keep"), reported: !!rep && rep.status === "open", verdict: rep && rep.status !== "open" ? rep.verdict : null, rating: r.rating });
  }));
  app.post("/api/orders/:id/review-report", need, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const reason = String(req.body?.reason || "").trim().slice(0, 1000); if (reason.length < 5) throw E(400, "Опишите, что не так с отзывом (от 5 символов)");
    const [o] = await q("select o.id,o.seller_id,o.number from orders o where o.id=$1", [req.params.id]); if (!o || o.seller_id !== req.user.id) throw E(404, "not found");
    const [r] = await q("select 1 from reviews where order_id=$1", [o.id]); if (!r) throw E(409, "Отзыва нет");
    const [prev] = await q("select 1 from review_reports where order_id=$1 and status='open'", [o.id]); if (prev) throw E(409, "Жалоба уже отправлена");
    const [past] = await q("select 1 from review_reports where order_id=$1 and verdict='keep'", [o.id]); if (past) throw E(409, "Отзыв уже проверен и оставлен");
    await q("insert into review_reports(order_id,reporter_id,reason) values($1,$2,$3)", [o.id, req.user.id, reason]);
    try { notifyStaff?.("Жалоба на отзыв к заказу #" + o.number) } catch { }
    res.json({ ok: true });
  }));
  app.get("/api/staff/reports", need, staffGate, wrap(async (req, res) => {
    if (req.me.staff_title === "tournament_mod") throw E(403, "forbidden");
    const st = req.query.status === "done" ? "status<>'open'" : "status='open'";
    res.json(await q(`select rr.id,rr.reason,rr.status,rr.verdict,rr.note,rr.created_at,rr.handled_at,o.id order_id,o.number,r.rating,r.body review_body,r.reply,bu.username reviewer,su.username seller,hu.username handler,l.title
      from review_reports rr join orders o on o.id=rr.order_id left join reviews r on r.order_id=o.id join users bu on bu.id=o.buyer_id join users su on su.id=o.seller_id join listings l on l.id=o.listing_id left join users hu on hu.id=rr.handled_by
      where rr.${st} order by rr.created_at desc limit 100`));
  }));
  app.post("/api/staff/reports/:id", need, staffGate, wrap(async (req, res) => {
    if (req.me.staff_title === "tournament_mod") throw E(403, "forbidden");
    const act = req.body?.action; if (!["delete", "keep"].includes(act)) throw E(400, "bad action");
    const note = String(req.body?.note || "").trim().slice(0, 500);
    await tx(async c => {
      const { rows: [rr] } = await c.query("select rr.*,o.number,o.buyer_id,o.seller_id from review_reports rr join orders o on o.id=rr.order_id where rr.id=$1 for update of rr", [req.params.id]);
      if (!rr || rr.status !== "open") throw E(409, "Жалоба уже обработана");
      if (act === "delete") await c.query("delete from reviews where order_id=$1", [rr.order_id]);
      await c.query("update review_reports set status='closed',verdict=$2,note=$3,handled_by=$4,handled_at=now() where id=$1", [rr.id, act, note || null, req.me.id]);
      const type = act === "delete" ? "review_removed" : "review_ok";
      await c.query("insert into notifications(user_id,type,payload) values($1,$2,$3)", [rr.seller_id, type, { number: rr.number, note }]);
      if (act === "delete") await c.query("insert into notifications(user_id,type,payload) values($1,$2,$3)", [rr.buyer_id, "review_removed", { number: rr.number, note }]);
      await c.query("insert into staff_actions(user_id,kind,ref) values($1,'review',$2)", [req.me.id, String(rr.id)]);
    });
    res.json({ ok: true });
  }));

  // ---- команда и статистика
  const stats = async ids => {
    if (!ids.length) return {};
    const rows = await q(`select user_id,kind,
      count(*) filter (where at>=date_trunc('day',now()))::int d, count(*) filter (where at>=date_trunc('month',now()))::int m, count(*) filter (where at>=date_trunc('year',now()))::int y
      from staff_actions where user_id=any($1::uuid[]) group by user_id,kind`, [ids]);
    const pr = await q(`select user_id, coalesce(sum(seconds) filter (where day=current_date),0)::int d, coalesce(sum(seconds) filter (where day>=date_trunc('month',now())::date),0)::int m, coalesce(sum(seconds) filter (where day>=date_trunc('year',now())::date),0)::int y from staff_presence where user_id=any($1::uuid[]) group by user_id`, [ids]);
    const out = {}; for (const id of ids) out[id] = { report: { d: 0, m: 0, y: 0 }, ticket: { d: 0, m: 0, y: 0 }, arbitration: { d: 0, m: 0, y: 0 }, review: { d: 0, m: 0, y: 0 }, time: { d: 0, m: 0, y: 0 } };
    for (const r of rows) if (out[r.user_id]?.[r.kind]) out[r.user_id][r.kind] = { d: r.d, m: r.m, y: r.y };
    for (const r of pr) if (out[r.user_id]) out[r.user_id].time = { d: r.d, m: r.m, y: r.y };
    return out;
  };
  const brief = u => ({ id: u.id, username: u.username, role: u.role, title: u.staff_title || null, title_label: TITLES[u.staff_title] || null });
  app.get("/api/staff/me", need, staffGate, wrap(async (req, res) => {
    const st = await stats([req.me.id]);
    const team = (await q("select id,username,role,staff_title from users where role in ('moderator','admin') order by role desc, username")).filter(t => t.id !== req.me.id && canSee(req.me, t));
    const ts = await stats(team.map(t => t.id));
    res.json({ me: brief(req.me), stats: st[req.me.id], titles: TITLES, can_title: rank(req.me) >= 2, team: team.map(t => ({ ...brief(t), stats: ts[t.id] })) });
  }));
  app.post("/api/staff/:id/title", need, staffGate, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [t] = await q("select id,role,staff_title from users where id=$1", [req.params.id]); if (!t || !["moderator", "admin"].includes(t.role)) throw E(404, "Сотрудник не найден");
    const title = req.body?.title || null; if (title && !TITLES[title]) throw E(400, "bad title");
    if (!canSee(req.me, t) || t.id === req.me.id) throw E(403, "Менять звание можно только у подчинённых");
    if (title === "senior_admin" && (req.me.role !== "owner" || t.role !== "admin")) throw E(403, "Старшего админа назначает только главный");
    if (title && title !== "senior_admin" && t.role !== "moderator") throw E(400, "Это звание только для модераторов");
    if (!title && rank(req.me) < 3 && t.staff_title === "senior_admin") throw E(403, "forbidden");
    await q("update users set staff_title=$2 where id=$1", [t.id, title]); roleCache.clear();
    res.json({ ok: true });
  }));
}
