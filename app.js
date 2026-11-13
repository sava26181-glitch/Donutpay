import crypto from "node:crypto";
import express from "express"; import helmet from "helmet"; import cookieParser from "cookie-parser";
import SCHEMA from "./schema_bundle.js"; import rateLimit from "express-rate-limit"; import { shieldEarly, shieldRules, antibot, shieldGate } from "./shield.js"; import bcrypt from "bcryptjs"; import jwt from "jsonwebtoken";
import { verifyTotp, skewOf, hashBackup } from "./totp.js"; import routes9 from "./routes9.js"; import routes16 from "./routes16.js"; import routes17 from "./routes17.js"; import routes10 from "./routes10.js"; import routes11 from "./routes11.js"; import routes12 from "./routes12.js"; import routes13 from "./routes13.js"; import routes14 from "./routes14.js"; import routes15 from "./routes15.js";
import pg from "pg"; import routes2 from "./routes2.js"; import routes3 from "./routes3.js"; import routes7 from "./routes7.js";
import wf from "./wordfilter.js"; import routes8 from "./routes8.js"; import routes6 from "./routes6.js"; import sysmsg from "./sysmsg.js"; import routes4 from "./routes4.js"; import routes5 from "./routes5.js"; import { makeBadges } from "./badges.js"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const { DATABASE_URL, JWT_SECRET, NODE_ENV } = process.env;
// Ошибки запуска выбрасываются наверх: server.js (лаунчер) уже слушает порт и покажет причину вместо 502.
process.on("unhandledRejection", e => console.error("[unhandledRejection]", e)); process.on("uncaughtException", e => console.error("[uncaughtException]", e));
if (!DATABASE_URL || !JWT_SECRET) throw new Error("Не заданы переменные окружения: " + [!DATABASE_URL && "DATABASE_URL", !JWT_SECRET && "JWT_SECRET"].filter(Boolean).join(", "));
const prod = NODE_ENV === "production";
const sslOff = /localhost|127\.0\.0\.1/.test(DATABASE_URL) || process.env["DB_SSL"] === "off" || /sslmode=disable/.test(DATABASE_URL);
const mkPool = ssl => new pg.Pool({ connectionString: DATABASE_URL, ssl: ssl ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 15000, statement_timeout: 120000, query_timeout: 125000 });
let pool = mkPool(!sslOff);
const q = (t, p) => pool.query(t, p).then(r => r.rows);
const E = (s, m) => Object.assign(new Error(m), { status: s });
const tx = async f => { const c = await pool.connect(); try { await c.query("begin"); const r = await f(c); await c.query("commit"); return r; } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); } };
const step = async (name, sql) => { const t0 = Date.now(); globalThis.__boot = "миграция " + name; console.log("[db] " + name + "…"); await pool.query(sql); console.log("[db] " + name + " ok " + (Date.now() - t0) + " мс"); };
// Первый владелец без командной строки: задайте OWNER_EMAIL, зарегистрируйтесь с этим email, и аккаунт станет владельцем.
// Работает только пока в базе нет ни одного владельца (после выдачи переменную лучше удалить).
const grantOwner = async email => {
  const o = String(process.env["OWNER_EMAIL"] || "").trim().toLowerCase(); if (!o || o !== String(email || "").trim().toLowerCase()) return false;
  const r = await pool.query("update users set role='owner' where email=$1 and not exists(select 1 from users where role='owner') returning id", [o]); return r.rowCount > 0;
};
const runSchema = async () => {
  globalThis.__boot = "подключение к базе данных"; console.log("[db] подключение…"); await pool.query("select 1"); console.log("[db] подключено");
await step("schema.sql", SCHEMA["schema.sql"]);
await step("schema_v2.sql", SCHEMA["schema_v2.sql"]);
await step("schema_v3.sql", SCHEMA["schema_v3.sql"]);
await pool.query("alter table listings add column if not exists after_msg text");
await step("schema_v4.sql", SCHEMA["schema_v4.sql"]);
await step("schema_v5.sql", SCHEMA["schema_v5.sql"]);
await step("schema_v6.sql", SCHEMA["schema_v6.sql"]);
await step("schema_v7.sql", SCHEMA["schema_v7.sql"]);
await step("schema_v8.sql", SCHEMA["schema_v8.sql"]);
await step("schema_v9.sql", SCHEMA["schema_v9.sql"]);
await step("schema_v10.sql", SCHEMA["schema_v10.sql"]);
await step("schema_v11.sql", SCHEMA["schema_v11.sql"]);
await step("schema_v12.sql", SCHEMA["schema_v12.sql"]);
await step("schema_v13.sql", SCHEMA["schema_v13.sql"]);
await step("schema_v14.sql", SCHEMA["schema_v14.sql"]);
await step("schema_v15.sql", SCHEMA["schema_v15.sql"]);
await step("schema_v16.sql", SCHEMA["schema_v16.sql"]);
await step("schema_v17.sql", SCHEMA["schema_v17.sql"]);
await step("schema_v18.sql", SCHEMA["schema_v18.sql"]);
await step("schema_v19.sql", SCHEMA["schema_v19.sql"]);
await step("schema_v20.sql", SCHEMA["schema_v20.sql"]);
await step("schema_v21.sql", SCHEMA["schema_v21.sql"]);
await step("schema_v22.sql", SCHEMA["schema_v22.sql"]);
await step("schema_v23.sql", SCHEMA["schema_v23.sql"]);
await step("schema_v24.sql", SCHEMA["schema_v24.sql"]);
await step("schema_v25.sql", SCHEMA["schema_v25.sql"]);
await step("schema_v26.sql", SCHEMA["schema_v26.sql"]);
await step("schema_v27.sql", SCHEMA["schema_v27.sql"]);
await step("schema_v28.sql", SCHEMA["schema_v28.sql"]);
await step("schema_v29.sql", SCHEMA["schema_v29.sql"]);
await step("schema_v30.sql", SCHEMA["schema_v30.sql"]);
await step("schema_v31.sql", SCHEMA["schema_v31.sql"]);
await step("schema_v32.sql", SCHEMA["schema_v32.sql"]);
await step("schema_v33.sql", SCHEMA["schema_v33.sql"]);
await step("schema_v34.sql", SCHEMA["schema_v34.sql"]);
await step("schema_v35.sql", SCHEMA["schema_v35.sql"]);
await step("schema_v36.sql", SCHEMA["schema_v36.sql"]);
};
try { await runSchema(); if (await grantOwner(process.env["OWNER_EMAIL"])) console.log("[owner] роль owner выдана:", process.env["OWNER_EMAIL"]); globalThis.__boot = "запуск сервера"; }
catch (e) {
  if (!sslOff && /does not support SSL/i.test(String(e.message))) { console.warn("[db] сервер БД без SSL, подключаюсь без SSL"); pool = mkPool(false); try { await runSchema(); } catch (e2) { throw new Error("База данных: " + (e2.code || "") + " " + e2.message); } }
  else throw new Error("База данных: " + (e.code || "") + " " + e.message);
}

const app = express(); app.set("trust proxy", 1); app.use(shieldEarly()); app.use(shieldGate());
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"], fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], mediaSrc: ["'self'", "blob:", "data:", "https://*.supabase.co"], scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://accounts.google.com"], scriptSrcAttr: ["'unsafe-inline'"], imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"], connectSrc: ["'self'", "https://challenges.cloudflare.com", "https://api.mymemory.translated.net", "https://accounts.google.com"], frameSrc: ["https://challenges.cloudflare.com", "https://accounts.google.com"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'self'"] } } }));
app.use(express.json({ limit: "50kb" })); app.use(cookieParser()); app.use((req, res, next) => hooks.csrf ? hooks.csrf(req, res, next) : next());
// ---- реальное время для всех: после любого успешного изменения данных все открытые страницы получают сигнал «обновись»
const liveC = new Set(), liveT = new Map();
const live = (ev, d) => liveC.forEach(r => { try { r.write(`event: ${ev}\ndata: ${JSON.stringify(d || {})}\n\n`); } catch { } });
app.get("/api/live", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" }); res.flushHeaders(); res.write("retry: 3000\n\n");
  liveC.add(res); const ping = setInterval(() => res.write(": ping\n\n"), 25000); req.on("close", () => { clearInterval(ping); liveC.delete(res); });
});
const LIVE_SKIP = /^(presence|stream|live|translate|messages|conversations|telegram|auth|verify|media|me)$/;
app.use("/api", (req, res, next) => { if (req.method === "GET" && !/^\/(live|stream)/.test(req.path)) res.set("Cache-Control", "no-store"); next(); });
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS" && !/\/chat$/.test(req.path)) res.on("finish", () => {
    const sc = req.path.split("/")[1] || ""; if (!/^(tournaments|listings|orders|games|battles|duels)$/.test(sc) || /\/(view|views|seen|read|typing)$/.test(req.path)) return; if (res.statusCode >= 400 || LIVE_SKIP.test(sc) || liveT.has(sc)) return;
    liveT.set(sc, setTimeout(() => { liveT.delete(sc); live("refresh", { s: sc }); }, 400));
  }); next();
});
const APP_VERSION = "v72";
app.get("/api/version", (_q, r) => { const h = f => { try { return crypto.createHash("sha1").update(fs.readFileSync(new URL(f, import.meta.url))).digest("hex").slice(0, 8); } catch { return null; } }; r.json({ version: APP_VERSION, files: { routes2: h("./routes2.js"), routes10: h("./routes10.js"), app: h("./app.js") } }); });
const dbFp = async () => { const [d] = await q("select md5(current_database()||pg_postmaster_start_time()::text) f, now() n"); return { db: d.f.slice(0, 6), db_time: d.n }; };
app.get("/api/diag", async (_q, r) => { try { r.json({ version: APP_VERSION, host: _q.headers["x-forwarded-host"] || _q.headers.host, server_time: new Date().toISOString(), ...(await dbFp()) }); } catch (e) { r.status(500).json({ error: "db" }); } });
app.get("/health", (_, r) => r.send("ok"));
const wrap = f => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next);
const fpSeen = new Map();
// v46: «онлайн» = человек недавно присылал сигнал активности (страница открыта и видна) или совершал действие
const activeAt = new Map(), ONLINE_MS = 75000;
setInterval(() => { const lim = Date.now() - 10 * 60e3; for (const [k, t] of activeAt) if (t < lim) activeAt.delete(k); }, 5 * 60e3).unref?.();
app.use(async (req, _r, next) => {
  try { req.user = jwt.verify(req.cookies.t, JWT_SECRET); } catch {}
  if (req.user && hooks.tokVer) { try { if ((req.user.v || 0) !== await hooks.tokVer(req.user.id)) req.user = null; } catch { } } // сессия отозвана (смена пароля, «выйти везде»)
  if (req.user && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS" && req.path !== "/api/presence/off") activeAt.set(req.user.id, Date.now());
  // отпечатки для защиты дуэлей от накрутки: храним только хэши сети и устройства
  if (req.user && req.path.startsWith("/api/")) {
    const ip = String(req.ip || ""), dev = String(req.headers["x-device"] || "").slice(0, 64), h = v => crypto.createHash("sha256").update(JWT_SECRET + "|" + v).digest("hex").slice(0, 32);
    for (const [k, v] of [["ip", ip], ["dev", dev]]) { if (!v) continue; const key = req.user.id + k + v, t = fpSeen.get(key) || 0; if (Date.now() - t < 6 * 36e5) continue; fpSeen.set(key, Date.now()); if (fpSeen.size > 50000) fpSeen.clear(); pool.query("insert into user_fp(user_id,kind,hash) values($1,$2,$3) on conflict(user_id,kind,hash) do update set last_seen=now()", [req.user.id, k, h(v)]).catch(() => {}); }
  }
  next();
});
app.use(shieldRules());
const need = (req, res, next) => req.user ? next() : res.status(401).json({ error: "auth required" });
const admin = wrap(async (req, res, next) => { const [u] = await q("select role from users where id=$1", [req.user.id]); ["admin", "owner"].includes(u?.role) ? next() : res.status(403).json({ error: "forbidden" }); });
const setCookie = (res, id, v = 0) => res.cookie("t", jwt.sign({ id, v }, JWT_SECRET, { expiresIn: "7d" }), { httpOnly: true, sameSite: "lax", secure: prod, maxAge: 7 * 864e5 });
const lim = rateLimit({ windowMs: 15 * 60e3, limit: 30 });
const U = "id,public_id,username,email,role,is_seller,avatar_url,bio,seller_verified,avatar_media,cover_media,theme";
const hooks = {}, B = makeBadges(q); hooks.live = live; hooks.dbFp = dbFp; hooks.setCookie = setCookie;
// v44: лот ушёл на проверку: уведомление модераторам на сайте (колокольчик) и в Telegram-боте администратора
hooks.premod = () => process.env["PREMODERATE_LISTINGS"] !== "false";
hooks.modNotify = async (id, title, reason) => {
  try {
    const us = await q("select id from users where role in ('moderator','admin','owner')");
    for (const u of us) {
      const [n] = await q("insert into notifications(user_id,type,payload) values($1,'listing_review',$2) returning id,payload", [u.id, { listing_id: id, title: String(title || "").slice(0, 80), reason: reason || null }]);
      pushUser(u.id, "notify", { id: n.id, type: "listing_review", ...n.payload });
    }
  } catch (e) { console.error("[mod] notify", e.message); }
  try { r2.notifyStaff?.("Лот на проверку" + (reason ? " (" + reason + ")" : "") + ": " + String(title || "").slice(0, 80)); } catch { }
};
const r2 = routes2(app, { q, pool, tx, E, wrap, need, online, B, hooks });
const r3 = routes3(app, { q, pool, tx, E, wrap, need, pushUser, hooks });

// ---- auth / profile
app.post("/api/auth/register", lim, antibot({ strictMail: true }), wrap(async (req, res) => {
  const { email, username, password } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || "")) throw E(400, "bad email");
  if (!/^[\w.-]{3,24}$/.test(username || "")) throw E(400, "bad username");
  if ((password || "").length < 8) throw E(400, "weak password");
  hooks.weakPw?.(password, username, email);
  hooks.panicGate?.("register"); hooks.emuCheck?.(req, "register", null);
  await hooks.deviceGate?.(req);
  try { const [u] = await q(`insert into users(email,username,password_hash) values($1,$2,$3) returning ${U}`, [email.toLowerCase(), username, await bcrypt.hash(password, 10)]); if (await grantOwner(email)) u.role = "owner"; try { await hooks.syncAdminTg?.(); const [rr] = await q("select role from users where id=$1", [u.id]); if (rr) u.role = rr.role; } catch { } await hooks.deviceBind?.(req, u.id); setCookie(res, u.id); res.json(u); }
  catch (e) { if (e.code === "23505") throw E(409, "email or username taken"); throw e; }
}));
// 2FA: проверка кода приложения (с защитой от повторного использования) или резервного кода; не больше 5 ошибок за 15 минут на аккаунт
const tfFail = new Map();
const twofaCheck = async (uid, code) => {
  const f = tfFail.get(uid); if (f && f.n >= 5 && Date.now() - f.t < 15 * 60e3) throw E(429, "too many attempts");
  const [u] = await q("select totp_secret,totp_backup,totp_last_step from users where id=$1 and totp_enabled", [uid]); let ok = false;
  if (u) {
    const st = verifyTotp(u.totp_secret, code);
    if (st === null) { const sk = skewOf(u.totp_secret, code); if (sk !== null && Math.abs(sk) >= 60) { console.warn("[2fa] расхождение часов (сек, код приложения относительно сервера):", sk); throw E(401, `Часы сервера расходятся с вашим телефоном примерно на ${Math.abs(sk)} с. Код из приложения верный, но сервер видит другое время. Администратору нужно включить синхронизацию времени на сервере (NTP).`); } }
    if (st !== null && u.totp_last_step !== null && +st <= +u.totp_last_step) throw E(401, "2fa code reused");
    if (st !== null) { await q("update users set totp_last_step=$2 where id=$1", [uid, st]); ok = true; }
    else if (st === null && /^[0-9A-Fa-f]{5}-?[0-9A-Fa-f]{5}$/.test(String(code || "").trim())) {
      const hsh = hashBackup(code), list = u.totp_backup || [];
      if (list.includes(hsh)) { await q("update users set totp_backup=$2::jsonb where id=$1", [uid, JSON.stringify(list.filter(x => x !== hsh))]); ok = true; }
    }
  }
  if (ok) tfFail.delete(uid); else { const n = f && Date.now() - f.t < 15 * 60e3 ? f.n + 1 : 1; tfFail.set(uid, { n, t: Date.now() }); }
  return ok;
};
app.post("/api/auth/login", lim, wrap(async (req, res) => {
  const { email, password, code } = req.body || {};
  const [u] = await q("select * from users where email=$1", [String(email || "").toLowerCase()]);
  if (!u || !(await bcrypt.compare(String(password || ""), u.password_hash))) throw E(401, "wrong email or password");
  hooks.emuCheck?.(req, "login", u.role);
  if (u.totp_enabled) {
    if (!code) return res.json({ need_2fa: true });
    if (!(await twofaCheck(u.id, code))) throw E(401, "wrong 2fa code");
  }
  setCookie(res, u.id, u.token_ver || 0); await hooks.loginNotice?.(req, u); const { password_hash, totp_secret, totp_backup, totp_enabled, totp_last_step, token_ver, ...pub } = u; res.json(pub);
}));
// вход и регистрация через Google (Google Identity Services): токен проверяется у Google, клиентский ID в GOOGLE_CLIENT_ID
app.post("/api/auth/google", lim, wrap(async (req, res) => {
  const cid = (process.env["GOOGLE_CLIENT_ID"] || "").trim(); if (!cid) throw E(503, "Вход через Google пока не настроен на сервере (нет GOOGLE_CLIENT_ID)");
  const cred = String(req.body?.credential || ""); if (cred.length < 100 || cred.length > 4000) throw E(400, "Не удалось получить ответ от Google. Попробуйте ещё раз");
  let t; try { const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(cred), { signal: AbortSignal.timeout(8000) }); t = await r.json(); if (!r.ok) throw new Error("bad"); } catch { throw E(401, "Google не подтвердил вход. Попробуйте ещё раз"); }
  if (t.aud !== cid || !["accounts.google.com", "https://accounts.google.com"].includes(t.iss) || !(+t.exp * 1000 > Date.now())) throw E(401, "Токен Google не подходит для этого сайта");
  if (!(t.email_verified === true || t.email_verified === "true") || !t.email) throw E(403, "Почта в аккаунте Google не подтверждена");
  const email = String(t.email).toLowerCase();
  let [u] = await q("select * from users where email=$1", [email]);
  if (u?.totp_enabled) throw E(403, "У этого аккаунта включена двухфакторная защита. Войдите по email и паролю");
  if (u) hooks.emuCheck?.(req, "login", u.role);
  if (!u) {
    hooks.panicGate?.("register"); hooks.emuCheck?.(req, "register", null);
    await hooks.deviceGate?.(req);
    const base = (email.split("@")[0].replace(/[^\w.-]/g, "").slice(0, 18) || "user").padEnd(3, "0");
    for (let i = 0; i < 8 && !u; i++) {
      const name = i === 0 ? base : base + Math.floor(1000 + Math.random() * 9000);
      try { [u] = await q("insert into users(email,username,password_hash) values($1,$2,$3) returning *", [email, name, await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10)]); } catch (e) { if (e.code !== "23505") throw e; }
    }
    if (!u) throw E(409, "Не удалось подобрать имя пользователя, попробуйте ещё раз");
    if (await grantOwner(email)) u.role = "owner"; try { await hooks.syncAdminTg?.(); } catch { }
    await hooks.deviceBind?.(req, u.id);
  }
  setCookie(res, u.id, u.token_ver || 0); await hooks.loginNotice?.(req, u); const { password_hash, totp_secret, totp_backup, totp_enabled, totp_last_step, token_ver, ...pub } = u; res.json(pub);
}));
app.post("/api/auth/logout", (req, res) => { if (req.user) { subs.get(req.user.id)?.forEach(r => r.end()); subs.delete(req.user.id); lastSeen.delete(req.user.id); activeAt.delete(req.user.id); } res.setHeader("Cache-Control", "no-store"); res.cookie("t", "", { httpOnly: true, sameSite: "lax", secure: prod, path: "/", maxAge: 0, expires: new Date(0) }); res.clearCookie("t", { path: "/" }).json({ ok: true }); });
app.get("/api/me", need, wrap(async (req, res) => { const [u] = await q(`select ${U},show_badges,blocked_until,block_reason,block_hours from users where id=$1`, [req.user.id]); u ? res.json(u) : res.status(401).json({ error: "auth required" }); }));
app.patch("/api/me", need, wrap(async (req, res) => {
  const b = req.body || [];
  if (b.is_seller === true) { const [c] = await q("select 1 from seller_codes where user_id=$1 and revoked_at is null", [req.user.id]); if (!c) throw E(403, "sign seller code first"); }
  const [u] = await q(`update users set username=coalesce($2,username),avatar_url=coalesce($3,avatar_url),bio=coalesce($4,bio),is_seller=coalesce($5,is_seller) where id=$1 returning ${U}`,
    [req.user.id, b.username ?? null, b.avatar_url ?? null, b.bio ?? null, typeof b.is_seller === "boolean" ? b.is_seller : null]);
  res.json(u);
}));

// ---- catalog
app.get("/api/games", wrap(async (_, res) => res.json(await q("select g.slug,g.name,g.platform,coalesce((select json_agg(json_build_object('slug',c.slug,'label',coalesce(gc.label,c.name),'verified',gc.source='funpay') order by gc.sort) from game_categories gc join categories c on c.id=gc.category_id where gc.game_id=g.id),'[]'::json) cats from games g where g.is_active order by g.name"))));
app.get("/api/categories", wrap(async (_, res) => res.json(await q("select slug,name from categories order by name"))));
const LCOLS = "l.auto_delivery,l.id,l.status,l.seller_id,l.title,l.summary,l.price_cents,l.currency,l.stock,l.delivery_time,l.image_media,l.created_at,g.slug game,g.name game_name,c.slug category,c.name category_name,u.username seller,u.created_at seller_since,u.avatar_url,u.avatar_media,u.theme->>'avatar_preset' avatar_preset,u.seller_verified,case when u.role in ('moderator','admin','owner') then u.role end seller_role,case when u.role in ('admin','owner') then u.theme #>> '{stf,tagc}' end tag_c1,case when u.role in ('admin','owner') then u.theme #>> '{stf,tagc2}' end tag_c2,r.avg rating,coalesce(r.cnt,0)::int reviews,l.allow_group,fs.percent sale_percent,fs.ends_at sale_ends,fs.sale_cents,(select case when sc.revoked_at is null then 'ok' else coalesce(sc.mark,'violation') end from seller_codes sc where sc.user_id=u.id) code_state,l.card";
const LFROM = "from listings l join games g on g.id=l.game_id join categories c on c.id=l.category_id join users u on u.id=l.seller_id left join (select seller_id,round(avg(rating),2) avg,count(*) cnt from reviews group by seller_id) r on r.seller_id=l.seller_id left join lateral (select f.percent,f.ends_at,greatest(1,floor(f.base_cents*(100-f.percent)/100.0))::int sale_cents from flash_sales f where f.listing_id=l.id and f.ends_at>now() and f.starts_at<=now() and f.cancelled_at is null and f.base_cents=l.price_cents order by f.ends_at desc limit 1) fs on true";
const r4 = routes4(app, { q, pool, tx, E, wrap, need, pushUser, hooks, L: { LCOLS, LFROM } });
routes5(app, { q, pool, tx, E, wrap, need, hooks, pushUser });
routes6(app, { q, pool, tx, E, wrap, need, hooks, pushUser });
routes7(app, { q, pool, tx, E, wrap, need, hooks, pushUser });
routes9(app, { q, E, wrap, need, twofaCheck, hooks });
routes10(app, { q, tx, E, wrap, need, hooks });
routes11(app, { q, tx, E, wrap, need });
routes12(app, { q, E, wrap, need, hooks, online });
routes13(app, { q, tx, E, wrap, need, hooks, pushUser });
routes14(app, { q, E, wrap, need, hooks, pushUser });
routes15(app, { q, E, wrap, need, hooks, pushUser });
await routes16(app, { q, E, wrap, need, hooks, notifyStaff: t => r2.notifyStaff?.(t) });
await routes17(app, { q, E, wrap, need });
routes8(app, { q, pool, tx, E, wrap, need, hooks, pushUser, online: uid => online(uid), notifyStaff: t => r2.notifyStaff?.(t) });
app.get("/api/listings", wrap(async (req, res) => {
  const { game, category, min, max, q: s, seller, sort, offset } = req.query, w = ["l.status='active'"], p = [];
  const add = (c, v) => { p.push(v); w.push(c.replaceAll("?", "$" + p.length)); };
  w.push("l.stock>0"); // проданные до нуля лоты не показываем в каталоге (продавец видит их в «Мои объявления»)
  if (game) add("g.slug=?", game); if (category) add("c.slug=?", category); if (seller) add("u.username=?", seller);
  if (+min > 0) add("l.price_cents>=?", Math.round(+min * 100)); if (+max > 0) add("l.price_cents<=?", Math.round(+max * 100));
  if (s) add("(l.title ilike ? or l.summary ilike ?)", "%" + s + "%");
  { const qn = String(req.query.qty || "").replace(/\D/g, "").slice(0, 9); // пакет доната: точное значение в характеристиках, а у старых лотов число из названия
    if (qn) { const re = "(^|[^0-9])" + qn.replace(/(\d)(?=(\d{3})+$)/g, "$1[ .,]?") + "([^0-9]|$)"; p.push(qn); const a = p.length; p.push(re); w.push(`(l.attrs->>'qty'=$${a} or (l.attrs->>'qty' is null and l.title ~ $${p.length}))`); } }
  if (+req.query.rating > 0) add("coalesce(r.avg,0)>=?", +req.query.rating);
  const ord = { cheap: "l.price_cents asc", expensive: "l.price_cents desc", rating: "coalesce(r.avg,0) desc", new: "l.created_at desc" }[sort] || "l.created_at desc";
  const boost = (!sort || sort === "new") ? "exists(select 1 from duel_boosts db where db.user_id=l.seller_id and db.until>now()) desc, " : "";
  { const rows = await q(`select ${LCOLS} ${LFROM} where ${w.join(" and ")} order by ${boost}${ord} limit 50 offset ${Math.max(0, +offset || 0)}`, p); const bm = await B.badgesFor(rows.map(r => r.seller_id)); res.json(rows.map(r => ({ ...r, online: online(r.seller_id), badges: bm[r.seller_id] || [] }))); }
}));
app.get("/api/listings/:id", wrap(async (req, res) => {
  const [l] = await q(`select ${LCOLS},l.details,l.deactivate_on_sale,l.attrs,l.image_media,l.seller_id,l.status,case when l.seller_id=$2 then l.after_msg end after_msg,case when l.seller_id=$2 then l.auto_items end auto_items ${LFROM} where l.id=$1 and (l.status='active' or l.seller_id=$2 or exists(select 1 from users x where x.id=$2 and x.role in ('moderator','admin','owner')))`, [req.params.id, req.user?.id || null]);
  if (!l) throw E(404, "not found"); res.json({ ...l, online: online(l.seller_id), badges: (await B.badgesFor([l.seller_id]))[l.seller_id] || [] });
}));
app.get("/api/my/listings", need, wrap(async (req, res) => res.json(await q(`select ${LCOLS},l.status ${LFROM} where l.seller_id=$1 order by l.created_at desc`, [req.user.id]))));
const lchk = (b, minStock) => {
  const price = Math.round(+b.price * 100), stock = +b.stock;
  if (String(b.title || "").trim().length < 5) throw E(400, "Название слишком короткое: нужно минимум 5 символов");
  if (String(b.title).length > 120) throw E(400, "Название слишком длинное: максимум 120 символов");
  if (!Number.isFinite(price) || !(price > 0)) throw E(400, "Укажите цену больше нуля");
  if (price > 2000000000) throw E(400, "Слишком большая цена: максимум 20 000 000 ₽");
  if (!Number.isInteger(stock) || stock < minStock) throw E(400, minStock ? "Количество: целое число от 1" : "Количество: целое число от 0");
  if (stock > 1000000) throw E(400, "Слишком большое количество: максимум 1 000 000");
  return [price, stock];
};
hooks.lchk = lchk;
const lbody = b => { const [price, stock] = lchk({ ...b, stock: b.stock === undefined || b.stock === "" ? 1 : b.stock }, 1);
  return [b.title.trim(), (b.summary || "").slice(0, 300), (b.details || "").slice(0, 3000), price, stock, (b.delivery_time || "").slice(0, 40)];
};
app.post("/api/listings", need, wrap(async (req, res) => {
  const [me] = await q("select is_seller,seller_verified,role from users where id=$1", [req.user.id]); if (!me?.is_seller) throw E(403, "Сначала станьте продавцом: включите режим продавца в профиле");
  if (process.env["REQUIRE_SELLER_VERIFICATION"] !== "false" && !me.seller_verified) throw E(403, "Нужна верификация продавца: пройдите её в меню, раздел «Верификация продавца»");
  if (hooks.safetyOkQ && !(await hooks.safetyOkQ(req.user.id))) throw E(428, "Сначала прочитайте правила безопасности: раздел «Безопасность»");
  const [g] = await q("select id from games where slug=$1", [req.body.game]), [c] = await q("select id from categories where slug=$1", [req.body.category]);
  if (!g || !c) throw E(400, "Выберите игру и категорию из списка");
  const [gm] = await q("select count(*)::int n, (count(*) filter (where category_id=$2))::int ok from game_categories where game_id=$1", [g.id, c.id]); if (gm.n > 0 && gm.ok === 0) throw E(400, "Для этой игры нельзя выбрать такую категорию");
  const attrs = Object.fromEntries(Object.entries(req.body.attrs || {}).filter(([k, v]) => /^[a-z_]{1,30}$/.test(k) && !/pass|pwd|token|secret|key/i.test(k) && ["string", "number"].includes(typeof v)).slice(0, 12).map(([k, v]) => [k, String(v).slice(0, 200)]));
  let img = null; if (req.body.image) { const [m] = await q("select id from media where id=$1 and owner_id=$2 and kind='listing'", [req.body.image, req.user.id]); if (!m) throw E(400, "Картинка не найдена на сервере: загрузите её заново"); img = m.id; }
  const flag = wf(req.body.title, req.body.summary, req.body.details, Object.values(attrs));
  const hold = flag ? "Автопроверка: " + flag : (hooks.premod() && !["moderator", "admin", "owner"].includes(me.role) ? "Новый лот: ожидает проверки модератором" : null);
  const ins = () => q("insert into listings(seller_id,game_id,category_id,title,summary,details,price_cents,stock,delivery_time,status,attrs,image_media,after_msg,allow_group,deactivate_on_sale) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$15,$10,$11,$12,$13,$14) returning id,status", [req.user.id, g.id, c.id, ...lbody(req.body), attrs, img, String(req.body.after_msg || "").slice(0, 2000), req.body.allow_group === true, req.body.deactivate_on_sale === true, hold ? "pending" : "active"]);
  let l; try { [l] = await ins(); } catch (e) { if (e.code !== "42703") throw e; await pool.query("alter table listings add column if not exists after_msg text"); [l] = await ins(); }
  const ai = hooks.autoClean(req.body.auto_items); if (ai) await q("update listings set auto_items=$2,auto_delivery=true,stock=$3 where id=$1", [l.id, ai, ai.length]);
  if (hold) { await q("update listings set mod_reason=$2 where id=$1", [l.id, hold]).catch(() => {}); hooks.modNotify(l.id, req.body.title, flag ? flag : "новый"); }
  res.status(201).json(l);
}));
app.patch("/api/listings/:id", need, wrap(async (req, res) => {
  const [l] = await q("update listings set title=$3,summary=$4,details=$5,price_cents=$6,stock=$7,delivery_time=$8,status='pending',updated_at=now() where id=$1 and seller_id=$2 returning id,status", [req.params.id, req.user.id, ...lbody(req.body)]);
  if (!l) throw E(404, "not found"); res.json(l);
}));
app.delete("/api/listings/:id", need, wrap(async (req, res) => { const r = await pool.query("update listings set status='archived' where id=$1 and seller_id=$2", [req.params.id, req.user.id]); if (!r.rowCount) throw E(404, "not found"); res.json({ ok: true }); }));
app.get("/api/favorites", need, wrap(async (req, res) => res.json(await q(`select ${LCOLS},f.created_at fav_at,(select h.price_cents from price_history h where h.listing_id=l.id and h.created_at<=f.created_at order by h.created_at desc limit 1) price_at_add,exists(select 1 from price_watch w where w.user_id=f.user_id and w.listing_id=l.id) watched ${LFROM} join favorites f on f.listing_id=l.id where f.user_id=$1 and l.status='active'`, [req.user.id]))));
app.put("/api/favorites/:id", need, wrap(async (req, res) => { await q("insert into favorites(user_id,listing_id) values($1,$2) on conflict do nothing", [req.user.id, req.params.id]); res.json({ ok: true }); }));
app.delete("/api/favorites/:id", need, wrap(async (req, res) => { await q("delete from favorites where user_id=$1 and listing_id=$2", [req.user.id, req.params.id]); res.json({ ok: true }); }));

// ---- orders (цена и права только на сервере; статус "paid" ставит только платёжный webhook)
const ev = (c, id, st, actor) => c.query("insert into order_events(order_id,status,actor_id) values($1,$2,$3)", [id, st, actor]);
app.post("/api/orders", need, wrap(async (req, res) => {
  const n = +(req.body?.qty ?? 1); if (!Number.isInteger(n) || n < 1 || n > 1000) throw E(400, "bad quantity");
  res.status(201).json(await tx(async c => {
    const { rows: [l] } = await c.query("select * from listings where id=$1 and status='active' for update", [req.body?.listingId]);
    if (!l) throw E(404, "listing unavailable"); if (l.seller_id === req.user.id) throw E(400, "own listing"); if (await hooks.salesPaused?.(c, l.seller_id)) throw E(409, "Продавец временно не принимает заказы: администрация проверяет его сделки"); if (l.stock < n || (l.auto_delivery && (l.auto_items || []).length < n)) throw E(409, "not enough stock");
    const unit = l.price_cents; if (unit * n > 2000000000) throw E(400, "Слишком большая сумма заказа: уменьшите количество");
    const { rows: [o] } = await c.query("insert into orders(listing_id,buyer_id,seller_id,unit_price_cents,quantity,total_cents,currency) values($1,$2,$3,$4,$5,$6,$7) returning *", [l.id, req.user.id, l.seller_id, unit, n, unit * n, l.currency]);
    await ev(c, o.id, "pending_payment", req.user.id); return o;
  }));
}));
app.get("/api/orders", need, wrap(async (req, res) => res.json(await q("select o.*,l.title,case when o.status in ('paid','in_progress','completed') then l.after_msg end after_msg from orders o join listings l on l.id=o.listing_id where $1 in (o.buyer_id,o.seller_id,o.partner_id) order by o.created_at desc", [req.user.id]))));
app.get("/api/orders/:id", need, wrap(async (req, res) => {
  const [o] = await q("select o.*,l.title,l.auto_delivery,l.summary,l.details,l.attrs,l.image_media,g.name game_name,g.slug game,c.name category_name,c.slug category,su.username seller_name,su.avatar_media seller_avatar_media,su.theme->>'avatar_preset' seller_avatar_preset,bu.avatar_media buyer_avatar_media,bu.theme->>'avatar_preset' buyer_avatar_preset,(select cv.id from conversations cv where least(cv.buyer_id,cv.seller_id)=least(o.buyer_id,o.seller_id) and greatest(cv.buyer_id,cv.seller_id)=greatest(o.buyer_id,o.seller_id) limit 1) conversation_id,(select username from users where id=o.partner_id) partner_name,(select username from users where id=o.buyer_id) buyer_name,(select json_build_object('rating',rv.rating,'body',rv.body,'created_at',rv.created_at,'edited_at',rv.edited_at,'reply',rv.reply,'reply_at',rv.reply_at) from reviews rv where rv.order_id=o.id) review,(select json_build_object('code',pc.code,'kind',pc.kind,'value',pc.value) from promo_codes pc where pc.id=o.promo_id) promo,case when o.status in ('paid','in_progress','completed') then l.after_msg end after_msg from orders o join listings l on l.id=o.listing_id join games g on g.id=l.game_id join categories c on c.id=l.category_id join users su on su.id=o.seller_id join users bu on bu.id=o.buyer_id where o.id=$1 and $2 in (o.buyer_id,o.seller_id,o.partner_id)", [req.params.id, req.user.id]);
  if (!o) throw E(404, "not found"); o.seller_online = online(o.seller_id); o.buyer_online = online(o.buyer_id); o.events = await q("select status,created_at from order_events where order_id=$1 order by id", [o.id]); res.json(o);
}));
const T = { cancelled: ["pending_payment", o => [o.buyer_id, o.seller_id]], in_progress: ["paid", o => [o.seller_id]], completed: ["in_progress", o => [o.buyer_id]] };
app.post("/api/orders/:id/status", need, wrap(async (req, res) => {
  const t = T[req.body?.status]; if (!t) throw E(400, "status not allowed");
  res.json(await tx(async c => {
    const { rows: [o] } = await c.query("select * from orders where id=$1 for update", [req.params.id]);
    if (!o || !t[1](o).includes(req.user.id)) throw E(404, "not found"); if (o.status !== t[0]) throw E(409, "transition not allowed");
    await c.query("update orders set status=$2,updated_at=now() where id=$1", [o.id, req.body.status]); await ev(c, o.id, req.body.status, req.user.id); if (req.body.status === "completed") await hooks.settleOrder?.(c, o, "seller"); hooks.pushSys?.(await hooks.sysMsg?.(c, o.id, req.body.status, req.user.id)); return { ok: true };
  }));
}));
app.post("/api/orders/:id/dispute", need, wrap(async (req, res) => {
  const reason = String(req.body?.reason || ""); if (reason.length < 10 || reason.length > 2000) throw E(400, "reason 10-2000 chars");
  res.json(await tx(async c => {
    const { rows: [o] } = await c.query("select * from orders where id=$1 for update", [req.params.id]);
    if (!o || ![o.buyer_id, o.seller_id].includes(req.user.id)) throw E(404, "not found"); if (!["paid", "in_progress", "completed"].includes(o.status)) throw E(409, "dispute not available");
    await c.query("insert into disputes(order_id,opened_by,reason) values($1,$2,$3)", [o.id, req.user.id, reason]);
    if (o.status === "completed") await hooks.holdForDispute?.(c, o); await c.query("update orders set status='dispute',updated_at=now() where id=$1", [o.id]); await ev(c, o.id, "dispute", req.user.id); r2.notifyStaff("Новый спор по заказу " + o.id.slice(0, 8) + ". Откройте админ-панель сайта."); hooks.pushSys?.(await hooks.sysMsg?.(c, o.id, "dispute", req.user.id)); return { ok: true };
  }));
}));
app.get("/api/sellers/:username/reviews", wrap(async (req, res) => res.json(await q("select r.rating,r.body,r.created_at,r.edited_at,r.reply,r.reply_at,b.username reviewer,b.avatar_media reviewer_media,b.theme->>'avatar_preset' reviewer_preset from reviews r join users s on s.id=r.seller_id join users b on b.id=r.reviewer_id where s.username=$1 order by r.created_at desc limit 300", [req.params.username]))));
app.post("/api/payments/webhook", (_, res) => res.status(501).json({ error: "payment provider not configured" }));

// ---- chat (+ SSE для обновления без перезагрузки)
const subs = new Map(), lastSeen = new Map();
function pushUser(uid, ev, d) { subs.get(uid)?.forEach(r => r.write(`event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`)); }
function online(uid) { return (activeAt.get(uid) || 0) > Date.now() - ONLINE_MS; }
app.post("/api/presence/ping", need, (req, res) => { activeAt.set(req.user.id, Date.now()); res.json({ ok: true }); });
app.post("/api/presence/off", need, (req, res) => { activeAt.delete(req.user.id); pool.query("update users set last_seen=now() where id=$1", [req.user.id]).catch(() => { }); res.json({ ok: true }); });
app.get("/api/stream", need, (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }); res.flushHeaders();
  const s = subs.get(req.user.id) || new Set(); s.add(res); subs.set(req.user.id, s);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000); req.on("close", () => { clearInterval(ping); s.delete(res); lastSeen.set(req.user.id, Date.now()); });
});
const push = (uid, d) => subs.get(uid)?.forEach(r => r.write(`event: message\ndata: ${JSON.stringify(d)}\n\n`));
const pairConv = async (a, b) => {
  const f = () => q("select id from conversations where least(buyer_id,seller_id)=least($1::uuid,$2::uuid) and greatest(buyer_id,seller_id)=greatest($1::uuid,$2::uuid) limit 1", [a, b]);
  let [c] = await f(); if (c) return c;
  const [n] = await q("select count(*)::int n from conversations where buyer_id=$1 and created_at>now()-interval '1 hour'", [a]); if (n.n >= 20) throw E(429, "too many new chats");
  await q("insert into conversations(listing_id,buyer_id,seller_id) values(null,$1,$2) on conflict do nothing", [a, b]); [c] = await f(); return c;
};
sysmsg(hooks, push);
app.post("/api/conversations", need, wrap(async (req, res) => {
  if (!req.body?.listingId && req.body?.username) {
    const [t] = await q("select id from users where username=$1", [String(req.body.username)]); if (!t) throw E(404, "user not found"); if (t.id === req.user.id) throw E(400, "own profile");
    return res.json(await pairConv(req.user.id, t.id));
  }
  const [l] = await q("select id,seller_id from listings where id=$1 and status='active'", [req.body?.listingId]); if (!l) throw E(404, "listing unavailable"); if (l.seller_id === req.user.id) throw E(400, "own listing");
  const c = await pairConv(req.user.id, l.seller_id); res.json({ ...c, listing_id: l.id });
}));
app.get("/api/conversations", need, wrap(async (req, res) => {
  const rows = await q("select c.id,c.listing_id,u.id other_id,u.username other,u.avatar_media,u.theme->>'avatar_preset' avatar_preset,lm.body last,lm.created_at last_at,(select count(*) from messages m where m.conversation_id=c.id and m.sender_id<>$1 and m.read_at is null)::int unread from conversations c join users u on u.id=case when c.buyer_id=$1 then c.seller_id else c.buyer_id end left join lateral (select body,created_at from messages m where m.conversation_id=c.id order by created_at desc limit 1) lm on true where $1 in (c.buyer_id,c.seller_id) order by lm.created_at desc nulls last", [req.user.id]);
  res.json(rows.map(r => ({ ...r, online: online(r.other_id) })));
}));
const part = async (id, uid) => { const [c] = await q("select * from conversations where id=$1 and $2 in (buyer_id,seller_id)", [id, uid]); if (!c) throw E(404, "not found"); return c; };
app.get("/api/conversations/:id/messages", need, wrap(async (req, res) => {
  await part(req.params.id, req.user.id);
  const rd = await q("update messages set read_at=now() where conversation_id=$1 and sender_id<>$2 and read_at is null returning sender_id", [req.params.id, req.user.id]);
  for (const u of new Set(rd.map(x => x.sender_id))) pushUser(u, "read", { conversation_id: req.params.id });
  res.json(await q("select m.id,m.sender_id,m.body,m.created_at,m.read_at,m.listing_id,m.kind,m.order_id,su.username sender_name,su.role sender_role,l.title lot_title,(select json_agg(json_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size)) from attachments a where a.message_id=m.id) atts from messages m join users su on su.id=m.sender_id left join listings l on l.id=m.listing_id where m.conversation_id=$1 order by m.created_at limit 500", [req.params.id]));
}));
app.post("/api/conversations/:id/messages", need, wrap(async (req, res) => {
  const body = String(req.body?.body || "").trim() || (req.body?.attachmentId ? "[вложение]" : ""); if (!body || body.length > 2000) throw E(400, "body 1-2000 chars");
  const c = await part(req.params.id, req.user.id);
  let lid = null, lt = null; if (req.body?.listingId) { const [l] = await q("select id,title from listings where id=$1 and (seller_id=$2 or seller_id=$3)", [req.body.listingId, c.buyer_id, c.seller_id]); if (l) { lid = l.id; lt = l.title; } }
  const [m] = await q("insert into messages(conversation_id,sender_id,body,listing_id) values($1,$2,$3,$4) returning id,conversation_id,sender_id,body,created_at,listing_id", [c.id, req.user.id, body, lid]); m.lot_title = lt;
  if (req.body?.attachmentId) { try { await r2.linkAtt(req.body.attachmentId, req.user.id, "chat", "message_id", m.id, c.id); } catch (e) { await q("delete from messages where id=$1", [m.id]); throw e; } m.atts = await q("select id,name,mime,size from attachments where message_id=$1", [m.id]); }
  push(c.buyer_id, m); push(c.seller_id, m); res.status(201).json(m);
  { const to = req.user.id === c.buyer_id ? c.seller_id : c.buyer_id; q("select username from users where id=$1", [req.user.id]).then(([s]) => hooks.notifyChat?.(to, s?.username || "пользователь", body, c.id)); }
}));
app.post("/api/reports", need, wrap(async (req, res) => {
  const { targetType, targetId, reason } = req.body || {}; if (String(reason || "").length < 5) throw E(400, "reason too short");
  await q("insert into reports(reporter_id,target_type,target_id,reason) values($1,$2,$3,$4)", [req.user.id, targetType, targetId, String(reason).slice(0, 1000)]); res.status(201).json({ ok: true });
}));

// ---- admin (роль проверяется в БД на каждый запрос)
app.get("/api/admin/listings", need, admin, wrap(async (req, res) => res.json(await q(`select ${LCOLS},l.status ${LFROM} where l.status=$1 order by l.created_at`, [req.query.status || "pending"]))));
app.post("/api/admin/listings/:id/status", need, admin, wrap(async (req, res) => { if (!["active", "rejected", "archived"].includes(req.body?.status)) throw E(400, "bad status"); await q("update listings set status=$2 where id=$1", [req.params.id, req.body.status]); res.json({ ok: true }); }));
app.get("/api/admin/disputes", need, admin, wrap(async (_, res) => res.json(await q("select * from disputes order by created_at desc limit 100"))));
app.post("/api/admin/disputes/:id/resolve", need, admin, wrap(async (req, res) => { if (!["resolved_buyer", "resolved_seller", "closed"].includes(req.body?.status)) throw E(400, "bad status"); await q("update disputes set status=$2,resolution=$3,resolved_by=(select id from users where id=$4) where id=$1", [req.params.id, req.body.status, String(req.body.resolution || "").slice(0, 2000), req.user.id]); res.json({ ok: true }); }));
app.get("/api/admin/reports", need, admin, wrap(async (_, res) => res.json(await q("select * from reports where status='open' order by created_at desc limit 100"))));
app.get("/api/admin/users", need, admin, wrap(async (_, res) => res.json(await q("select id,username,email,role,is_seller,created_at from users order by created_at desc limit 200"))));
app.post("/api/admin/games", need, admin, wrap(async (req, res) => { const { slug, name, platform } = req.body || {}; if (!slug || !name) throw E(400, "slug and name required"); await q("insert into games(slug,name,platform) values($1,$2,$3)", [slug, name, platform || null]); res.status(201).json({ ok: true }); }));
app.post("/api/admin/categories", need, admin, wrap(async (req, res) => { const { slug, name } = req.body || {}; if (!slug || !name) throw E(400, "slug and name required"); await q("insert into categories(slug,name) values($1,$2)", [slug, name]); res.status(201).json({ ok: true }); }));

// главная отдаётся с уже встроенными настройками сайта (подвал, кнопка канала, документы), чтобы интерфейс появлялся сразу целиком
// версия каждого файла в адресе считается по его содержимому: изменённый файл всегда скачивается заново (раньше ?v=NN кэшировался на год и правки не доходили до телефонов)
const _vh = new Map();
const verOf = f => { try { const p = path.join(dir, "public", f), st = fs.statSync(p), c = _vh.get(f); if (c && c.m === st.mtimeMs) return c.h; const h = crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 8); _vh.set(f, { m: st.mtimeMs, h }); return h; } catch { return "0"; } };
const idxH = (_req, res, next) => {
  try {
    const cfg = hooks.siteConfig ? hooks.siteConfig() : {};
    const html = fs.readFileSync(path.join(dir, "public", "index.html"), "utf8").replace(/((?:src|href)="\/)([\w.-]+\.(?:js|css))\?v=\d+"/g, (_m, p, f) => `${p}${f}?v=${verOf(f)}"`).replace("<!--SC-->", "<script>window.SITE_CFG0=" + JSON.stringify(cfg).replace(/</g, "\\u003c") + "</script>");
    res.setHeader("Cache-Control", "no-cache, must-revalidate"); res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html);
  } catch { next(); }
};
app.get("/", idxH); app.get("/index.html", idxH);
// файлы с ?v=NN версионируются, поэтому их можно кэшировать надолго: сайт открывается быстрее (без 12 проверок при каждом заходе)
app.use((req, res, next) => { if (req.query.v && /\.(js|css)$/.test(req.path)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); next(); });
app.use(express.static(path.join(dir, "public"), { etag: true, lastModified: false, setHeaders: (res, p) => { if (/\.(js|css|html)$/.test(p) && !res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "no-cache, must-revalidate"); } }));
app.use("/api", (_, res) => res.status(404).json({ error: "not found" }));
app.use(async (e, req, res, _next) => {
  if (res.headersSent) { console.error("handler error after response:", e.message); return; }
  if (e.code === "22P02") e = E(400, "invalid id"); if (e.code === "23505") e = E(409, "already exists"); if (e.code === "23503") e = E(404, "not found"); if (["22003", "22001", "23502", "22007", "22008"].includes(e.code)) e = E(400, "invalid input");
  let staffDetail = null; if (!e.status && req.user) { try { const [u] = await q("select role from users where id=$1", [req.user.id]); if (["moderator", "admin", "owner"].includes(u?.role)) staffDetail = String(e.message).slice(0, 300) + (e.where ? " @" + String(e.where).slice(0, 80) : ""); } catch {} }
  if (!e.status) console.error(e); res.status(e.status || 500).json({ error: e.status ? e.message : "server error", ...(!e.status && e.code && String(req.path).startsWith("/api/admin") ? { code: e.code, detail: String(e.message).slice(0, 200) } : {}), ...(!e.status && e.code ? { ref: e.code } : {}), ...(!e.status && process.env["DEBUG_ERRORS"] === "true" ? { detail: String(e.message).slice(0, 300) } : {}), ...(staffDetail ? { detail: staffDetail } : {}) });
});
export default app;
