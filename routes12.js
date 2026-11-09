// v66: уведомления о новых сообщениях чата в Telegram через отдельного бота (NOTIFY_BOT_TOKEN, NOTIFY_BOT_USERNAME, NOTIFY_WEBHOOK_SECRET)
import crypto from "node:crypto";
export default function routes12(app, { q, E, wrap, need, hooks, online }) {
  const env = process.env, TOK = (env["NOTIFY_BOT_TOKEN"] || "").trim(), BN = (env["NOTIFY_BOT_USERNAME"] || "donutvolume").replace(/^@/, "").trim(), SEC = (env["NOTIFY_WEBHOOK_SECRET"] || "").trim();
  const API = String(env["TELEGRAM_API_BASE"] || "https://api.telegram.org").replace(/\/+$/, ""), base = (env["SITE_URL"] || env["RENDER_EXTERNAL_URL"] || "").replace(/\/$/, "");
  const on = !!TOK, hash = t => crypto.createHash("sha256").update(t).digest("hex");
  const send = async (chat, text, extra) => {
    const r = await fetch(`${API}/bot${TOK}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true, ...extra }), signal: AbortSignal.timeout(8000) });
    const d = await r.json().catch(() => ({})); if (!d.ok) throw new Error(d.description || "HTTP " + r.status); return d;
  };
  if (on && SEC && base.startsWith("https://")) fetch(`${API}/bot${TOK}/setWebhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: base + "/api/notify-bot/webhook", secret_token: SEC, allowed_updates: ["message"] }), signal: AbortSignal.timeout(8000) }).then(r => r.json()).then(d => console.log("[telegram:notify] setWebhook ->", d.ok ? "ok" : d.description)).catch(e => console.warn("[telegram:notify] setWebhook не удался:", e.message));
  app.get("/api/me/notify", need, wrap(async (req, res) => { const [u] = await q("select tg_notify_id,tg_notify_on from users where id=$1", [req.user.id]); res.json({ configured: on && !!SEC, bot: BN, linked: !!u?.tg_notify_id, on: !!u?.tg_notify_on }); }));
  app.post("/api/me/notify/link", need, wrap(async (req, res) => {
    if (!on || !SEC) throw E(503, "Бот уведомлений не настроен на сервере (нужны NOTIFY_BOT_TOKEN и NOTIFY_WEBHOOK_SECRET)");
    const tok = crypto.randomBytes(18).toString("base64url");
    await q("delete from notify_links where user_id=$1", [req.user.id]); await q("insert into notify_links(token_hash,user_id,expires_at) values($1,$2,now()+interval '15 minutes')", [hash(tok), req.user.id]);
    res.json({ url: `https://t.me/${BN}?start=n_${tok}`, bot: BN });
  }));
  app.post("/api/me/notify/toggle", need, wrap(async (req, res) => {
    const [u] = await q("select tg_notify_id from users where id=$1", [req.user.id]); if (!u?.tg_notify_id) throw E(400, "Сначала подключите Telegram");
    await q("update users set tg_notify_on=$2 where id=$1", [req.user.id, !!req.body?.on]); res.json({ ok: true, on: !!req.body?.on });
  }));
  app.post("/api/me/notify/unlink", need, wrap(async (req, res) => { await q("update users set tg_notify_id=null,tg_notify_on=false where id=$1", [req.user.id]); res.json({ ok: true }); }));
  app.post("/api/me/notify/test", need, wrap(async (req, res) => {
    const [u] = await q("select tg_notify_id from users where id=$1", [req.user.id]); if (!u?.tg_notify_id) throw E(400, "Сначала подключите Telegram");
    try { await send(u.tg_notify_id, "Проверка: уведомления DonutPay работают."); res.json({ ok: true }); } catch (e) { throw E(502, "Telegram не принял сообщение: " + e.message + (/ECONN|fetch failed|timeout|abort/i.test(e.message) ? " (сервер не достаёт до api.telegram.org: укажите TELEGRAM_API_BASE с рабочим зеркалом)" : "")); }
  }));
  app.post("/api/notify-bot/webhook", wrap(async (req, res) => {
    if (!on || !SEC) return res.sendStatus(404);
    const h = req.get("x-telegram-bot-api-secret-token") || ""; if (h.length !== SEC.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(SEC))) return res.sendStatus(401);
    const m = req.body?.message, reply = t => res.json({ method: "sendMessage", chat_id: m.chat.id, text: t });
    if (!m || m.chat?.type !== "private" || typeof m.text !== "string") return res.json({ ok: true });
    const tok = (m.text.match(/^\/start(?:@\w+)?\s+n_([\w-]{10,60})/) || [])[1];
    if (!tok) return reply("Это бот уведомлений DonutPay. Чтобы получать сообщения из чатов сайта, откройте на сайте «Настройки», раздел «Уведомления в Telegram», и нажмите «Подключить».");
    const [l] = await q("delete from notify_links where token_hash=$1 and expires_at>now() returning user_id", [hash(tok)]);
    if (!l) return reply("Ссылка устарела. Откройте на сайте «Настройки» и нажмите «Подключить» ещё раз.");
    const [o] = await q("select 1 from users where tg_notify_id=$1 and id<>$2", [m.chat.id, l.user_id]); if (o) await q("update users set tg_notify_id=null,tg_notify_on=false where tg_notify_id=$1 and id<>$2", [m.chat.id, l.user_id]);
    const [u] = await q("update users set tg_notify_id=$2,tg_notify_on=true where id=$1 returning username", [l.user_id, m.chat.id]);
    reply(`Готово, аккаунт ${u?.username || ""} подключён. Сюда будут приходить новые сообщения из чатов DonutPay, когда вас нет на сайте. Отключить можно в настройках сайта.`);
  }));
  // отправка уведомления о сообщении (не чаще раза в минуту на переписку, только если получателя нет на сайте)
  const last = new Map();
  // важные события аккаунта (вход с нового устройства): приходят, даже если человек на сайте
  hooks.notifyTg = async (toId, text) => { try { if (!on) return; const [u] = await q("select tg_notify_id from users where id=$1 and tg_notify_on and tg_notify_id is not null", [toId]); if (u) await send(u.tg_notify_id, text); } catch (e) { console.warn("[notify] не отправлено:", e.message); } };
  hooks.notifyChat = async (toId, fromName, text, convId) => {
    try {
      if (!on || online?.(toId)) return;
      const k = toId + ":" + convId, n = Date.now(); if (n - (last.get(k) || 0) < 60000) return; last.set(k, n); if (last.size > 5000) last.clear();
      const [u] = await q("select tg_notify_id from users where id=$1 and tg_notify_on and tg_notify_id is not null", [toId]); if (!u) return;
      const snip = String(text || "").replace(/\s+/g, " ").slice(0, 120);
      await send(u.tg_notify_id, `Новое сообщение от ${fromName}:\n${snip}`, base.startsWith("https://") ? { reply_markup: { inline_keyboard: [[{ text: "Открыть чат", url: `${base}/#/chat/${convId}` }]] } } : {});
    } catch (e) { console.warn("[notify] не отправлено:", e.message); }
  };
}
