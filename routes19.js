// v78: нагрузочный тест из админки (только владельцы): N виртуальных пользователей ходят по сайту, потом всё удаляется
import jwt from "jsonwebtoken"; import crypto from "crypto";
export default function routes19(app, { q, E, wrap, JWT_SECRET, notifyStaff, port, pool }) {
  const MAXU = 1500, MAXS = 120;
  const base = () => `http://127.0.0.1:${port}`;
  let job = null, last = null;
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  const ownerGate = wrap(async (req, _res, next) => { if (!req.user) throw E(401, "auth required"); const [u] = await q("select role from users where id=$1", [req.user.id]); if (u?.role !== "owner") throw E(403, "forbidden"); next(); });
  const snap = () => !job ? null : { users: job.users, seconds: job.seconds, left: Math.max(0, Math.ceil((job.endAt - Date.now()) / 1000)), phase: job.phase, requests: job.n, errors: job.err, p50: pct(job.lat.slice(-3000).sort((a, b) => a - b), .5), stopped: !!job.stop };

  async function clean() {
    const tryDel = async sql => { try { await q(sql) } catch (e) { return e.message } };
    let err = await tryDel("delete from users where email like '%@loadtest.invalid'");
    if (err) { // на случай связей без каскада: чистим известные таблицы и повторяем
      for (const t of ["user_fp", "notifications", "wallets"]) await tryDel(`delete from ${t} where user_id in (select id from users where email like '%@loadtest.invalid')`);
      err = await tryDel("delete from users where email like '%@loadtest.invalid'");
    }
    const [n] = await q("select count(*)::int n from users where email like '%@loadtest.invalid'");
    return { left: n.n, err: err || null };
  }

  async function run(j) {
    const key = crypto.randomBytes(24).toString("hex"); globalThis.__dpLoadKey = key;
    try {
      j.phase = "создаю пользователей";
      const tag = crypto.randomBytes(3).toString("hex");
      const ids = await q("insert into users(email,username,password_hash,safety_ack_ver) select 'lt'||i||'-'||$1||'@loadtest.invalid','lt_'||$1||'_'||i,'!',1000 from generate_series(1,$2::int) i returning id", [tag, j.users]);
      const toks = ids.map(r => jwt.sign({ id: r.id, v: 0 }, JWT_SECRET, { expiresIn: "1h" }));
      let games = [], lids = [];
      try { const r = await fetch(base() + "/api/listings", { headers: { "X-Load-Key": key } }); const d = await r.json(); lids = (Array.isArray(d) ? d : d.items || d.rows || []).map(x => x.id).filter(Boolean).slice(0, 30); } catch { }
      try { const r = await fetch(base() + "/api/games", { headers: { "X-Load-Key": key } }); games = (await r.json()).map(g => g.slug).filter(Boolean); } catch { }
      const mix = [["/api/me", 3, 1], ["/api/games", 2], ["/api/listings", 4], ["/api/listings?game=", 2, 0, 1], ["/api/notifications", 2, 1], ["/api/conversations", 1, 1], ["/api/finance", 1, 1], ["/", 2], ["/api/listings/", 3, 0, 2]];
      const bag = []; for (const m of mix) for (let i = 0; i < m[1]; i++) bag.push(m);
      const per = {}; const lagMax = { v: 0, sum: 0, n: 0 }; let peakRss = 0;
      const lt = setInterval(() => { const t = performance.now(); setImmediate(() => { const d = performance.now() - t; lagMax.v = Math.max(lagMax.v, d); lagMax.sum += d; lagMax.n++ }); peakRss = Math.max(peakRss, process.memoryUsage().rss) }, 200);
      j.phase = "идёт нагрузка"; j.startAt = Date.now(); j.endAt = j.startAt + j.seconds * 1e3;
      const ramp = Math.min(15e3, j.seconds * 1e3 * .25), sleep = ms => new Promise(r => setTimeout(r, ms));
      const vu = async i => {
        await sleep(Math.random() * ramp);
        while (Date.now() < j.endAt && !j.stop) {
          const m = bag[Math.floor(Math.random() * bag.length)]; let path = m[0];
          if (m[3] === 1) path += encodeURIComponent(games[Math.floor(Math.random() * games.length)] || "x");
          if (m[3] === 2) { if (!lids.length) path = "/api/listings"; else path += lids[Math.floor(Math.random() * lids.length)]; }
          const t = performance.now(); let st = 0;
          try {
            const r = await fetch(base() + path, { headers: { Cookie: "t=" + toks[i], "X-Load-Key": key, "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1", "Accept": path === "/" ? "text/html" : "application/json" }, signal: AbortSignal.timeout(20000) });
            st = r.status; await r.arrayBuffer();
          } catch (e) { st = e.name === "TimeoutError" ? -2 : -1 }
          const ms = performance.now() - t; j.n++; j.lat.push(ms); if (j.lat.length > 400000) j.lat.splice(0, 100000);
          const p = per[m[0]] ||= { n: 0, err: 0, lat: [] }; p.n++; p.lat.push(ms);
          j.codes[st] = (j.codes[st] || 0) + 1; if (st < 200 || st >= 400) { j.err++; p.err++ }
          if (j.n >= 300 && j.err / j.n > .6 && Date.now() - j.startAt > 6000) { j.stop = "сервер не справляется: больше 60% запросов с ошибками"; }
          await sleep(300 + Math.random() * 2200);
        }
      };
      await Promise.all(toks.map((_, i) => vu(i)));
      clearInterval(lt);
      const secs = Math.max(1, (Date.now() - j.startAt) / 1e3), all = j.lat.slice().sort((a, b) => a - b);
      const eps = Object.entries(per).map(([p, v]) => { const l = v.lat.sort((a, b) => a - b); return { path: p, n: v.n, err: v.err, p50: Math.round(pct(l, .5)), p95: Math.round(pct(l, .95)) } }).sort((a, b) => b.p95 - a.p95);
      const errPct = j.n ? j.err / j.n * 100 : 0, p95 = pct(all, .95);
      const verdict = j.n < 50 ? "bad" : errPct < 1 && p95 < 800 ? "good" : errPct < 5 && p95 < 2500 ? "ok" : "bad";
      j.result = { users: j.users, seconds: Math.round(secs), requests: j.n, rps: +(j.n / secs).toFixed(1), errors: j.err, err_pct: +errPct.toFixed(2), p50: Math.round(pct(all, .5)), p95: Math.round(p95), p99: Math.round(pct(all, .99)), max: Math.round(all[all.length - 1] || 0), codes: j.codes, endpoints: eps, lag_max: Math.round(lagMax.v), lag_avg: Math.round(lagMax.n ? lagMax.sum / lagMax.n : 0), rss_mb: Math.round(peakRss / 1048576), verdict, stopped: j.stop || null, at: new Date().toISOString() };
    } catch (e) { console.warn("[load]", e); j.result = { failed: String(e.message || e), at: new Date().toISOString() } }
    finally {
      globalThis.__dpLoadKey = null; j.phase = "удаляю тестовых пользователей";
      const c = await clean().catch(e => ({ left: -1, err: e.message })); j.result.cleanup = c;
      last = j.result; job = null;
      await q("insert into site_flags(key,value,updated_at) values('loadtest',$1,now()) on conflict(key) do update set value=excluded.value,updated_at=now()", [last]).catch(() => { });
      try { notifyStaff?.(`Нагрузочный тест завершён: ${last.users} польз., ${last.requests ?? 0} запросов, ошибок ${last.err_pct ?? "?"}%, p95 ${last.p95 ?? "?"} мс`) } catch { }
    }
  }

  app.get("/api/admin/load", ownerGate, wrap(async (_req, res) => {
    if (!last) { try { const [r] = await q("select value from site_flags where key='loadtest'"); if (r?.value?.at) last = r.value } catch { } }
    res.set("Cache-Control", "no-store").json({ running: !!job, job: snap(), last, max_users: MAXU, max_seconds: MAXS });
  }));
  app.post("/api/admin/load", ownerGate, wrap(async (req, res) => {
    if (job) throw E(409, "тест уже идёт");
    const users = Math.max(10, Math.min(MAXU, Math.floor(+req.body?.users || 1000))), seconds = Math.max(10, Math.min(MAXS, Math.floor(+req.body?.seconds || 60)));
    job = { users, seconds, phase: "старт", n: 0, err: 0, lat: [], codes: {}, endAt: Date.now() + seconds * 1e3 + 5000, stop: null };
    await q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'load_test','site',null,$2)", [req.user.id, { users, seconds }]).catch(() => { });
    run(job); res.status(202).json({ ok: true, users, seconds });
  }));
  app.post("/api/admin/load/stop", ownerGate, wrap(async (_req, res) => { if (job) job.stop = "остановлено владельцем"; res.json({ ok: true }) }));
}
