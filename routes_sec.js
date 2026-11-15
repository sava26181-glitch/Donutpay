// Код подтверждения (двухэтапная проверка) на вывод денег и на покупку.
// Код уходит в Telegram (если привязан) и на почту (если почта настроена). Если отправить некуда, проверка пропускается, чтобы не заблокировать людей.
// Выключить целиком: SEC_CODES=off
import crypto from "node:crypto";
import { sendMail, mailConfigured, mailErr } from "./mailer.js";
export default function routesSec(app, { q, E, wrap, need, hooks }) {
  q("create table if not exists action_codes(id bigserial primary key, user_id uuid not null, purpose text not null, code_hash text not null, expires_at timestamptz not null, attempts int not null default 0, used_at timestamptz, created_at timestamptz not null default now())")
    .then(() => q("create index if not exists i_ac_u on action_codes(user_id, purpose, created_at desc)")).catch(e => console.warn("[sec]", e.message));
  const h = c => crypto.createHash("sha256").update(String(c)).digest("hex");
  const on = () => process.env.SEC_CODES !== "off";
  const PURPOSE = { withdraw: "вывод средств", purchase: "покупку" };
  const chan = u => ({ tg: !!(u?.telegram_id && process.env.TELEGRAM_BOT_TOKEN && hooks.tgSend), mail: !!(u?.email && mailConfigured()) });
  const userOf = id => q("select id,email,telegram_id from users where id=$1", [id]).then(r => r[0]);
  const purposeOf = p => p === "/api/orders" ? "purchase" : "withdraw";

  app.get("/api/security/status", need, wrap(async (req, res) => {
    const p = PURPOSE[req.query.purpose] ? req.query.purpose : null; if (!p) throw E(400, "bad purpose");
    const c = chan(await userOf(req.user.id)); res.json({ required: on() && (c.tg || c.mail), via: c.tg ? "telegram" : c.mail ? "email" : null });
  }));
  app.post("/api/security/code", need, wrap(async (req, res) => {
    const p = PURPOSE[req.body?.purpose] ? req.body.purpose : null; if (!p) throw E(400, "bad purpose");
    const u = await userOf(req.user.id), c = chan(u); if (!c.tg && !c.mail) throw E(409, "Некуда отправить код: привяжите Telegram в настройках");
    const [last] = await q("select created_at from action_codes where user_id=$1 and purpose=$2 and used_at is null and expires_at>now() order by id desc limit 1", [u.id, p]);
    if (last && Date.now() - new Date(last.created_at).getTime() < 45e3) throw E(429, "Код уже отправлен, повторить можно через минуту");
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
    await q("update action_codes set used_at=now() where user_id=$1 and purpose=$2 and used_at is null", [u.id, p]);
    await q("insert into action_codes(user_id,purpose,code_hash,expires_at) values($1,$2,$3,now()+interval '10 minutes')", [u.id, p, h(code)]);
    const body = `Код подтверждения DonutPay на ${PURPOSE[p]}: ${code}\n\nДействует 10 минут. Никому его не говорите. Если вы ничего не делали на сайте, срочно смените пароль.`;
    let sent = false;
    if (c.tg) { try { await hooks.tgSend(u.telegram_id, body); sent = true } catch (e) { console.error("[sec] tg:", e.message) } }
    if (c.mail) { try { await sendMail({ to: u.email, subject: "Код подтверждения DonutPay", text: body }); sent = true } catch (e) { console.error("[sec] mail:", mailErr(e)) } }
    if (!sent) throw E(502, "Не удалось отправить код, попробуйте позже");
    res.json({ ok: true, via: c.tg ? "telegram" : "email" });
  }));

  // проверка кода перед самим действием
  const gate = wrap(async (req, res, next) => {
    if (!on() || !req.user?.id) return next();
    const u = await userOf(req.user.id), c = chan(u); if (!c.tg && !c.mail) return next();
    const p = purposeOf(req.path), code = String(req.body?.code || "").replace(/\D/g, "");
    const fail = m => res.status(428).json({ error: m, needCode: true, purpose: p });
    if (code.length !== 6) return fail("Введите код подтверждения");
    const [r] = await q("select id,code_hash,attempts from action_codes where user_id=$1 and purpose=$2 and used_at is null and expires_at>now() order by id desc limit 1", [u.id, p]);
    if (!r || r.attempts >= 5) return fail("Код недействителен, запросите новый");
    if (r.code_hash !== h(code)) { await q("update action_codes set attempts=attempts+1 where id=$1", [r.id]); return fail("Неверный код") }
    res.on("finish", () => { if (res.statusCode < 400) q("update action_codes set used_at=now() where id=$1", [r.id]).catch(() => { }) }); delete req.body.code; next(); // код гасим только после успешного действия: при ошибке в форме вводить заново не нужно
  });
  app.post("/api/finance/withdraw", gate);
  app.post("/api/orders", gate);
}
