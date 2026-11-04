// v42/v47: подтверждение продавца по SMS вместо Telegram.
// Два способа отправки (выбирается автоматически):
//   1) SMS-сервис sms.ru: нужна переменная SMSRU_API_ID. Код создаёт и проверяет сам сайт (в базе только хэш).
//   2) Supabase Auth (Phone provider): нужны SUPABASE_URL и SUPABASE_ANON_KEY. Используется, если SMSRU_API_ID не задан.
// Третий способ без SMS: вход через Telegram (виджет). Подпись проверяется на нашем сервере по токену бота,
// к api.telegram.org сервер не обращается. Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME; в BotFather: /setdomain.
// В базе пользователя хранится только HMAC номера (для проверки «номер уже занят») и последние 4 цифры.
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

export default function routes11(app, { q, tx, E, wrap, need }) {
  const env = k => String(process.env[k] || "").trim();
  const base = () => env("SUPABASE_URL").replace(/\/+$/, "");
  const key = () => env("SUPABASE_ANON_KEY");
  const smsru = () => env("SMSRU_API_ID");
  const SMSRU_URL = () => (env("SMSRU_API_URL") || "https://sms.ru").replace(/\/+$/, "");
  const tgBot = () => env("TELEGRAM_BOT_USERNAME").replace(/^@/, ""), tgTok = () => env("TELEGRAM_BOT_TOKEN");
  // вход через Telegram включается только явно (TELEGRAM_LOGIN=1): по умолчанию выключен
  const tgOk = () => env("TELEGRAM_LOGIN") === "1" && !!(tgBot() && tgTok());
  const provider = () => smsru() ? "smsru" : (base() && key() ? "supabase" : null);
  const secret = () => String(process.env["JWT_SECRET"] || "");
  const hmac = p => crypto.createHmac("sha256", secret()).update(p).digest("hex");
  const rl = rateLimit({ windowMs: 60e3, limit: 20 });

  // номер в формате +79991234567; 8999... и 999... превращаем в +7999...
  const norm = raw => {
    let p = String(raw || "").replace(/[\s()\-.]/g, "");
    if (/^8\d{10}$/.test(p)) p = "+7" + p.slice(1);
    if (/^9\d{9}$/.test(p)) p = "+7" + p;
    if (/^\d+$/.test(p)) p = "+" + p;
    return /^\+\d{10,15}$/.test(p) ? p : null;
  };

  // простые лимиты в памяти: ключ -> времена попыток
  const hits = new Map();
  const limit = (k, max, ms, msg) => {
    const now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < ms);
    if (a.length >= max) throw E(429, msg || "too many sms attempts");
    a.push(now); hits.set(k, a);
  };
  setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some(t => now - t < 36e5)) hits.delete(k); }, 10 * 60e3).unref?.();

  // ---- Supabase
  const sb = async (path, body) => {
    const r = await fetch(base() + path, {
      method: "POST", headers: { apikey: key(), "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    let j = null; try { j = await r.json(); } catch { }
    return { ok: r.ok, status: r.status, j };
  };

  // ---- sms.ru: отправка текста на номер
  async function smsruSend(phone, text) {
    const to = phone.replace(/^\+/, "");
    const u = new URL(SMSRU_URL() + "/sms/send");
    u.searchParams.set("api_id", smsru()); u.searchParams.set("to", to); u.searchParams.set("msg", text); u.searchParams.set("json", "1");
    if (env("SMSRU_FROM")) u.searchParams.set("from", env("SMSRU_FROM"));
    if (env("SMSRU_TEST") === "1") u.searchParams.set("test", "1");
    let j = null, st = 0;
    try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); st = r.status; j = await r.json(); } catch (e) { return { ok: false, why: "нет связи с sms.ru" }; }
    const one = j?.sms?.[to];
    if (j?.status === "OK" && one?.status === "OK") return { ok: true };
    return { ok: false, why: "sms.ru: " + (one?.status_text || j?.status_text || ("код " + (one?.status_code ?? j?.status_code ?? st))) };
  }

  app.get("/api/verify/sms/status", need, wrap(async (req, res) => {
    const [u] = await q("select seller_verified,phone_last4 from users where id=$1", [req.user.id]);
    const missing = provider() || tgOk() ? [] : ["SMSRU_API_ID"];
    res.json({ configured: !!provider(), provider: provider(), tg_ok: tgOk(), tg_bot: tgOk() ? tgBot() : null, missing, verified: !!u?.seller_verified, last4: u?.phone_last4 || null });
  }));


  // ---- вход через Telegram: браузер возвращается сюда с подписанными данными пользователя
  const tgUsed = new Map(); // защита от повторного использования одной и той же ссылки
  setInterval(() => { const now = Date.now(); for (const [k, t] of tgUsed) if (now - t > 15 * 60e3) tgUsed.delete(k); }, 5 * 60e3).unref?.();
  const tgVerify = qs => {
    for (const k of Object.keys(qs)) if (typeof qs[k] !== "string" || qs[k].length > 500) return "bad";
    const hash = String(qs.hash || ""); if (!/^[0-9a-f]{64}$/.test(hash) || !/^\d{1,15}$/.test(String(qs.id || ""))) return "bad";
    const data = Object.keys(qs).filter(k => k !== "hash").sort().map(k => k + "=" + qs[k]).join("\n");
    const want = crypto.createHmac("sha256", crypto.createHash("sha256").update(tgTok()).digest()).update(data).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(want), Buffer.from(hash))) return "bad";
    const age = Date.now() / 1000 - Number(qs.auth_date);
    if (!Number.isFinite(age) || age > 600 || age < -60) return "old";
    if (tgUsed.has(hash)) return "old";
    tgUsed.set(hash, Date.now());
    return "ok";
  };
  app.get("/api/verify/tg/callback", wrap(async (req, res) => {
    const back = r => res.redirect(302, "/#/verify?tg=" + r);
    res.set("Cache-Control", "no-store");
    if (!req.user) return res.redirect(302, "/#/login");
    if (!tgOk()) return back("off");
    const r = tgVerify(req.query); if (r !== "ok") return back(r);
    const h = hmac("tg:" + req.query.id);
    const [me] = await q("select seller_verified from users where id=$1", [req.user.id]);
    if (me?.seller_verified) return back("already");
    try {
      const done = await tx(async c => {
        const u = await c.query("update users set tg_hash=$2,seller_verified=true where id=$1 and not exists(select 1 from users where tg_hash=$2 and id<>$1)", [req.user.id, h]);
        if (!u.rowCount) return false;
        await c.query("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'seller_verified','user',$2,$3)", [req.user.id, String(req.user.id), { via: "telegram" }]);
        return true;
      });
      return back(done ? "ok" : "taken");
    } catch (e) { if (e.code === "23505") return back("taken"); throw e; }
  }));

  app.post("/api/verify/sms/send", need, rl, wrap(async (req, res) => {
    const prov = provider(); if (!prov) throw E(503, "sms not configured");
    const phone = norm(req.body?.phone); if (!phone) throw E(400, "bad phone");
    const [me] = await q("select seller_verified from users where id=$1", [req.user.id]);
    if (me?.seller_verified) throw E(409, "already verified");
    const h = hmac(phone);
    limit("u:" + req.user.id, 5, 36e5);
    if ((await q("select 1 from users where phone_hash=$1 and id<>$2", [h, req.user.id])).length) throw E(409, "phone taken");
    limit("p:" + h, 3, 36e5);

    if (prov === "smsru") {
      // не чаще одного кода в минуту
      const [last] = await q("select created_at from phone_codes where user_id=$1", [req.user.id]);
      if (last && Date.now() - new Date(last.created_at).getTime() < 60e3) throw E(429, "sms too often");
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      await q("insert into phone_codes(user_id,phone_hash,code_hash,attempts,expires_at,created_at) values($1,$2,$3,0,now()+interval '5 minutes',now()) on conflict (user_id) do update set phone_hash=$2,code_hash=$3,attempts=0,expires_at=now()+interval '5 minutes',created_at=now()",
        [req.user.id, h, hmac(h + ":" + code)]);
      const r = await smsruSend(phone, code + " — код подтверждения DonutPay. Никому его не сообщайте.");
      if (!r.ok) {
        console.error("[sms] sms.ru", r.why);
        await q("delete from phone_codes where user_id=$1", [req.user.id]).catch(() => { });
        throw E(502, "Не удалось отправить SMS. " + r.why);
      }
      return res.json({ ok: true });
    }

    const r = await sb("/auth/v1/otp", { phone, create_user: true });
    if (!r.ok) {
      const why = String(r.j?.error_code || r.j?.msg || r.j?.message || r.j?.error_description || r.j?.error || "").slice(0, 80);
      console.error("[sms] supabase otp", r.status, why);
      if (r.status === 429) throw E(429, "sms too often");
      throw E(502, "Не удалось отправить SMS. Ответ Supabase: " + r.status + (why ? " " + why : ""));
    }
    res.json({ ok: true });
  }));

  app.post("/api/verify/sms/check", need, rl, wrap(async (req, res) => {
    const prov = provider(); if (!prov) throw E(503, "sms not configured");
    const phone = norm(req.body?.phone); if (!phone) throw E(400, "bad phone");
    const code = String(req.body?.code || "").replace(/\s/g, ""); if (!/^\d{4,8}$/.test(code)) throw E(400, "wrong code");
    limit("c:" + req.user.id, 10, 10 * 60e3, "too many code attempts");
    const h = hmac(phone);

    if (prov === "smsru") {
      const [rec] = await q("select phone_hash,code_hash,attempts,(expires_at>now()) alive from phone_codes where user_id=$1", [req.user.id]);
      if (!rec || !rec.alive || rec.phone_hash !== h) throw E(400, "wrong code");
      if (rec.attempts >= 5) { await q("delete from phone_codes where user_id=$1", [req.user.id]); throw E(429, "too many code attempts"); }
      const a = Buffer.from(hmac(h + ":" + code)), b = Buffer.from(rec.code_hash);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        await q("update phone_codes set attempts=attempts+1 where user_id=$1", [req.user.id]);
        throw E(400, "wrong code");
      }
    } else {
      const r = await sb("/auth/v1/verify", { type: "sms", phone, token: code });
      if (!r.ok) {
        if (r.status >= 500 || r.status === 429) { console.error("[sms] supabase verify", r.status); throw E(502, "sms service error"); }
        throw E(400, "wrong code");
      }
    }

    try {
      await tx(async c => {
        const u = await c.query("update users set phone_hash=$2,phone_last4=$3,seller_verified=true where id=$1 and not exists(select 1 from users where phone_hash=$2 and id<>$1)", [req.user.id, h, phone.slice(-4)]);
        if (!u.rowCount) throw E(409, "phone taken");
        await c.query("delete from phone_codes where user_id=$1", [req.user.id]);
        await c.query("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'seller_verified','user',$2,$3)", [req.user.id, String(req.user.id), { via: "sms", provider: prov }]);
      });
    } catch (e) { if (e.code === "23505") throw E(409, "phone taken"); throw e; }
    res.json({ ok: true });
  }));
}
