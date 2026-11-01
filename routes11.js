// v42: подтверждение продавца по SMS вместо Telegram. SMS отправляет и проверяет Supabase Auth (Phone provider).
// Нужны переменные окружения: SUPABASE_URL и SUPABASE_ANON_KEY (anon public, не service_role).
// В базе хранится только HMAC номера (для проверки «номер уже занят») и последние 4 цифры.
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

export default function routes11(app, { q, tx, E, wrap, need }) {
  const base = () => String(process.env["SUPABASE_URL"] || "").trim().replace(/\/+$/, "");
  const key = () => String(process.env["SUPABASE_ANON_KEY"] || "").trim();
  const cfg = () => !!(base() && key());
  const hmac = p => crypto.createHmac("sha256", String(process.env["JWT_SECRET"] || "")).update(p).digest("hex");
  const rl = rateLimit({ windowMs: 60e3, limit: 20 });

  // номер в формате +79991234567; 8999... превращаем в +7999...
  const norm = raw => {
    let p = String(raw || "").replace(/[\s()\-.]/g, "");
    if (/^8\d{10}$/.test(p)) p = "+7" + p.slice(1);
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

  const sb = async (path, body) => {
    const r = await fetch(base() + path, {
      method: "POST", headers: { apikey: key(), "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    let j = null; try { j = await r.json(); } catch { }
    return { ok: r.ok, status: r.status, j };
  };

  app.get("/api/verify/sms/status", need, wrap(async (req, res) => {
    const [u] = await q("select seller_verified,phone_last4 from users where id=$1", [req.user.id]);
    const missing = [!base() && "SUPABASE_URL", !key() && "SUPABASE_ANON_KEY"].filter(Boolean);
    res.json({ configured: cfg(), missing, verified: !!u?.seller_verified, last4: u?.phone_last4 || null });
  }));

  app.post("/api/verify/sms/send", need, rl, wrap(async (req, res) => {
    if (!cfg()) throw E(503, "sms not configured");
    const phone = norm(req.body?.phone); if (!phone) throw E(400, "bad phone");
    const [me] = await q("select seller_verified from users where id=$1", [req.user.id]);
    if (me?.seller_verified) throw E(409, "already verified");
    const h = hmac(phone);
    if ((await q("select 1 from users where phone_hash=$1 and id<>$2", [h, req.user.id])).length) throw E(409, "phone taken");
    limit("u:" + req.user.id, 5, 36e5); limit("p:" + h, 3, 36e5);
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
    if (!cfg()) throw E(503, "sms not configured");
    const phone = norm(req.body?.phone); if (!phone) throw E(400, "bad phone");
    const code = String(req.body?.code || "").replace(/\s/g, ""); if (!/^\d{4,8}$/.test(code)) throw E(400, "wrong code");
    limit("c:" + req.user.id, 10, 10 * 60e3, "too many code attempts");
    const r = await sb("/auth/v1/verify", { type: "sms", phone, token: code });
    if (!r.ok) {
      if (r.status >= 500 || r.status === 429) { console.error("[sms] supabase verify", r.status); throw E(502, "sms service error"); }
      throw E(400, "wrong code");
    }
    const h = hmac(phone);
    try {
      await tx(async c => {
        const u = await c.query("update users set phone_hash=$2,phone_last4=$3,seller_verified=true where id=$1 and not exists(select 1 from users where phone_hash=$2 and id<>$1)", [req.user.id, h, phone.slice(-4)]);
        if (!u.rowCount) throw E(409, "phone taken");
        await c.query("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'seller_verified','user',$2,$3)", [req.user.id, String(req.user.id), { via: "sms" }]);
      });
    } catch (e) { if (e.code === "23505") throw E(409, "phone taken"); throw e; }
    res.json({ ok: true });
  }));
}
