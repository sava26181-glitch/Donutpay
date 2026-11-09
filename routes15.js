// v70: защита аккаунтов и сайта. Выход на всех устройствах (версия сессии), вход с нового устройства,
// слабые пароли, проверка источника запросов (CSRF), режим защиты от атак в админке
import { shieldStatus, shieldSetMode } from "./shield.js";

export default function routes15(app, { q, E, wrap, need, hooks, pushUser }) {
  const env = process.env, ADM = ["admin", "owner"];
  const admGate = wrap(async (req, _res, next) => { const [u] = await q("select role from users where id=$1", [req.user.id]); if (!ADM.includes(u?.role)) throw E(403, "forbidden"); next(); });

  // ---------- версия сессии: при смене пароля и «выйти везде» старые куки перестают работать
  const tv = new Map(); // user_id -> { v, t }
  hooks.tokVer = async uid => {
    const c = tv.get(uid); if (c && Date.now() - c.t < 30000) return c.v;
    const [u] = await q("select token_ver from users where id=$1", [uid]); const v = u ? u.token_ver || 0 : -1;
    tv.set(uid, { v, t: Date.now() }); if (tv.size > 50000) tv.clear(); return v;
  };
  hooks.bumpTokens = async uid => { const [u] = await q("update users set token_ver=token_ver+1 where id=$1 returning token_ver", [uid]); const v = u ? u.token_ver : 0; tv.set(uid, { v, t: Date.now() }); return v; };
  app.post("/api/me/logout-all", need, wrap(async (req, res) => {
    const v = await hooks.bumpTokens(req.user.id); hooks.setCookie?.(res, req.user.id, v);
    res.json({ ok: true });
  }));

  // ---------- слабые пароли
  const COMMON = new Set("12345678 123456789 1234567890 0123456789 12341234 87654321 11111111 00000000 88888888 123123123 qwerty12 qwerty123 qwertyui qwertyuiop 1q2w3e4r 1q2w3e4r5t q1w2e3r4 1qaz2wsx zaq12wsx qazwsxedc 123qweasd asdfghjk asdf1234 abcd1234 abc12345 password password1 password123 passw0rd iloveyou admin123 donutpay donutpay1 йцукенгш пароль123 парольпароль".split(" "));
  hooks.weakPw = (pw, username, email) => {
    const p = String(pw || ""), l = p.toLowerCase(), local = String(email || "").split("@")[0].toLowerCase(), un = String(username || "").toLowerCase();
    if (COMMON.has(l) || /^(.)\1+$/.test(p) || (un.length >= 4 && l.includes(un)) || (local.length >= 4 && l.includes(local))) throw E(400, "Слишком простой пароль: не используйте 12345678, qwerty, свой ник или почту");
  };

  // ---------- вход с нового устройства: уведомление на сайте и в Telegram (если подключён)
  const devName = ua => {
    const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "неизвестное устройство";
    const br = /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
    return br ? os + ", " + br : os;
  };
  hooks.loginNotice = async (req, u) => {
    try {
      const dev = String(req.headers["x-device"] || "").slice(0, 64); if (!dev || !hooks.fpHash) return;
      const h = hooks.fpHash(dev);
      const [r] = await q("select exists(select 1 from user_fp where user_id=$1 and kind='dev' and hash=$2) seen,exists(select 1 from user_fp where user_id=$1 and kind='dev') known", [u.id, h]);
      await q("insert into user_fp(user_id,kind,hash) values($1,'dev',$2) on conflict(user_id,kind,hash) do update set last_seen=now()", [u.id, h]);
      if (r.seen || !r.known) return;
      const device = devName(String(req.headers["user-agent"] || ""));
      const [n] = await q("insert into notifications(user_id,type,payload) values($1,'new_login',$2) returning id,payload", [u.id, { device }]);
      try { pushUser?.(u.id, "notify", { id: n.id, type: "new_login", ...n.payload }); } catch { }
      hooks.notifyTg?.(u.id, `Вход в аккаунт DonutPay с нового устройства: ${device}.\nЕсли это не вы, смените пароль и нажмите «Выйти на других устройствах» в настройках.`);
    } catch (e) { console.warn("[login-notice]", e.message); }
  };

  // ---------- CSRF: изменяющие запросы к API принимаются только со своего сайта
  const hostOf = u => { try { return new URL(u).host.toLowerCase() } catch { return "" } };
  hooks.csrf = (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.path.startsWith("/api/") || /\/webhook$/.test(req.path)) return next();
    if (String(env["CSRF_CHECK"] || "on").toLowerCase() === "off") return next();
    const o = String(req.headers.origin || ""), rf = String(req.headers.referer || "");
    if (o === "null") return res.status(403).json({ error: "bad origin" });
    const src = o ? hostOf(o) : rf ? hostOf(rf) : "";
    if (!src) return next(); // не браузер (бот, сервер): защищают куки SameSite и подписи вебхуков
    const ok = new Set([String(req.headers.host || "").toLowerCase(), String(req.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase(), hostOf(env["SITE_URL"] || ""), hostOf(env["RENDER_EXTERNAL_URL"] || ""), ...String(env["ALLOWED_ORIGINS"] || "").split(",").map(x => hostOf(x.trim()) || x.trim().toLowerCase())].filter(Boolean));
    if (ok.has(src)) return next();
    if (!env["SITE_URL"] && /^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(String(req.headers.host || ""))) return next(); // адрес за прокси неизвестен: не ломаем сайт
    console.warn("[csrf] запрос с чужого сайта отклонён:", src, req.method, req.path);
    return res.status(403).json({ error: "bad origin" });
  };

  // ---------- режим защиты от атак: состояние и ручное включение
  app.get("/api/admin/shield", need, admGate, wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(shieldStatus())));
  app.post("/api/admin/shield", need, admGate, wrap(async (req, res) => {
    let st; try { st = shieldSetMode(String(req.body?.mode || "")); } catch { throw E(400, "bad mode"); }
    await q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'shield_mode','site',null,$2)", [req.user.id, { mode: st.mode }]).catch(() => { });
    res.json(st);
  }));
}
