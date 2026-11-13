// v68: безопасность сделок. Заморозка подозрительных заказов, видео-верификация (лицо и паспорт), холд 72 часа
import express from "express";
import crypto from "crypto";
import { makeStorage } from "./storage.js";

export default function routes13(app, { q, tx, E, wrap, need, hooks, pushUser }) {
  const env = process.env, stor = makeStorage(env, env["DATABASE_URL"]), ADM = ["admin", "owner"];
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d };
  // настройки можно менять переменными окружения на хостинге, без правок кода
  const CFG = () => ({
    holdHours: num(env["HOLD_HOURS"], 72),
    amountRub: num(env["FRAUD_AMOUNT_RUB"], 50000),
    newHours: num(env["FRAUD_NEW_HOURS"], 24)
  });
  hooks.holdHours = () => CFG().holdHours;

  // ---- правило: новый аккаунт без истории покупок и крупная сумма
  hooks.fraudCheck = async (c, o) => {
    if (o.review_status === "cleared") return null;
    const { rows: [u] } = await c.query(
      `select id_verified_at,extract(epoch from now()-created_at)/3600 age_h,
        (select count(*) from orders x where x.buyer_id=u.id and x.status='completed')::int done,
        (select coalesce(sum(x.total_cents),0) from orders x where x.buyer_id=u.id and x.id<>$2 and x.payment_status='confirmed' and x.created_at>now()-interval '24 hours') day_c
       from users u where u.id=$1`, [o.buyer_id, o.id]);
    if (!u || u.id_verified_at) return null;
    const k = CFG(), amount = Number(o.total_cents) / 100, day = (Number(u.day_c) + Number(o.total_cents)) / 100;
    if (Number(u.age_h) < k.newHours && u.done === 0 && (amount >= k.amountRub || day >= k.amountRub))
      return `Новый аккаунт (${Math.max(1, Math.round(Number(u.age_h) * 60))} мин. на сайте), покупок раньше не было, сумма ${amount.toLocaleString("ru-RU")} ₽`;
    return null;
  };
  // заморозить заказ: деньги не списываются, товар не резервируется, покупателю нужно видео
  hooks.flagOrder = async (c, o, reason) => {
    await c.query("update orders set review_status='review',review_reason=$2,updated_at=now() where id=$1", [o.id, reason]);
    let { rows: [k] } = await c.query("select id,status from kyc_requests where user_id=$1 and order_id=$2 and status in ('need','submitted') limit 1", [o.buyer_id, o.id]);
    let fresh = false;
    if (!k) { ({ rows: [k] } = await c.query("insert into kyc_requests(user_id,order_id,kind,reason) values($1,$2,'order',$3) returning id,status", [o.buyer_id, o.id, reason])); fresh = true; }
    if (fresh) {
      const { rows: [n] } = await c.query("insert into notifications(user_id,type,payload) values($1,'kyc_need',$2) returning id,payload", [o.buyer_id, { order_id: o.id, number: o.number }]);
      return { kyc: k, note: n };
    }
    return { kyc: k };
  };

  // ---- видео
  const sniff = b => { if (b.length < 16) return null; if (b.slice(4, 8).toString() === "ftyp") return b.slice(8, 12).toString() === "qt  " ? "video/quicktime" : "video/mp4"; if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm"; return null; };
  const mp4dur = b => { const i = b.indexOf("mvhd"); if (i < 0 || i + 32 > b.length) return null; const v = b[i + 4]; if (v === 0) { const ts = b.readUInt32BE(i + 16); return ts ? b.readUInt32BE(i + 20) / ts : null; } if (v === 1) { const ts = b.readUInt32BE(i + 24); return ts ? Number(b.readBigUInt64BE(i + 28)) / ts : null; } return null; };
  const uuid = s => /^[0-9a-f-]{36}$/i.test(String(s));
  const adm = wrap(async (req, _res, next) => { const [u] = await q("select role from users where id=$1", [req.user.id]); if (!ADM.includes(u?.role)) throw E(403, "forbidden"); next(); });

  app.get("/api/kyc/mine", need, wrap(async (req, res) => {
    const [u] = await q("select id_verified_at from users where id=$1", [req.user.id]);
    const rs = await q("select k.id,k.kind,k.status,k.reason,k.note,k.created_at,k.submitted_at,k.order_id,o.number order_number,o.total_cents from kyc_requests k left join orders o on o.id=k.order_id where k.user_id=$1 order by k.created_at desc limit 10", [req.user.id]);
    res.json({ verified: !!u?.id_verified_at, verified_at: u?.id_verified_at || null, hold_hours: CFG().holdHours, requests: rs });
  }));
  // пользователь сам хочет пройти верификацию (чтобы выводить деньги без холда)
  app.post("/api/kyc/start", need, wrap(async (req, res) => {
    const [u] = await q("select id_verified_at from users where id=$1", [req.user.id]); if (u?.id_verified_at) throw E(409, "Личность уже подтверждена");
    const [ex] = await q("select id from kyc_requests where user_id=$1 and kind='identity' and status in ('need','submitted') limit 1", [req.user.id]);
    if (ex) return res.json({ id: ex.id });
    const [k] = await q("insert into kyc_requests(user_id,kind,reason) values($1,'identity','Верификация по желанию: вывод без холда') returning id", [req.user.id]);
    res.status(201).json({ id: k.id });
  }));
  app.post("/api/kyc/:id/video", need, express.raw({ type: "application/octet-stream", limit: "102mb" }), wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [k] = await q("select * from kyc_requests where id=$1 and user_id=$2", [req.params.id, req.user.id]); if (!k) throw E(404, "not found");
    if (!["need", "submitted"].includes(k.status)) throw E(409, "Эта проверка уже завершена");
    const b = req.body; if (!Buffer.isBuffer(b)) throw E(400, "bad upload"); const m = sniff(b); if (!m) throw E(400, "Допустимы видео MP4, MOV, WebM");
    if (b.length > 100e6) throw E(400, "Видео слишком большое (до 100 МБ). Снимите короче или в меньшем качестве");
    if (m !== "video/webm") { const d = mp4dur(b); if (d == null) throw E(400, "Не удалось определить длительность видео"); if (d < 5 || d > 90) throw E(400, `Длительность видео должна быть 5–90 секунд (сейчас ${Math.round(d)} с)`); }
    // есть облачное хранилище (SB_KEY): кладём туда. Нет: сохраняем видео в базе, чтобы отправка работала без дополнительных настроек
    let bucket = "db", path = "db";
    if (stor.on) {
      path = `kyc/${req.user.id}/${crypto.randomUUID()}.${m === "video/webm" ? "webm" : m === "video/quicktime" ? "mov" : "mp4"}`; bucket = stor.PRIV;
      try { await stor.put(stor.PRIV, path, b, m); } catch (e) { console.error("[storage]", e.message); throw E(502, "Хранилище недоступно: " + e.message); }
    } else {
      await q("insert into kyc_videos(request_id,data,mime,size) values($1,$2,$3,$4) on conflict(request_id) do update set data=excluded.data,mime=excluded.mime,size=excluded.size,created_at=now()", [k.id, b, m, b.length]);
    }
    if (k.path && k.bucket !== "db") { try { await stor.del?.(k.bucket, k.path) } catch { } }
    if (bucket !== "db") await q("delete from kyc_videos where request_id=$1", [k.id]);
    await q("update kyc_requests set status='submitted',bucket=$2,path=$3,mime=$4,size=$5,submitted_at=now() where id=$1", [k.id, bucket, path, m, b.length]);
    res.status(201).json({ ok: true });
  }));
  app.get("/api/kyc/:id/url", need, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [u] = await q("select role from users where id=$1", [req.user.id]), [k] = await q("select * from kyc_requests where id=$1", [req.params.id]);
    if (!k || !k.path || !(k.user_id === req.user.id || ADM.includes(u?.role))) throw E(404, "not found");
    if (k.bucket === "db") return res.json({ url: `/api/kyc/${k.id}/file`, mime: k.mime });
    res.json({ url: await stor.signed(k.bucket, k.path, 60), mime: k.mime });
  }));
  // видео из базы: только владелец заявки и администраторы; поддерживает Range, без него видео не играет в Safari на iPhone
  app.get("/api/kyc/:id/file", need, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const [u] = await q("select role from users where id=$1", [req.user.id]), [k] = await q("select user_id from kyc_requests where id=$1", [req.params.id]);
    if (!k || !(k.user_id === req.user.id || ADM.includes(u?.role))) throw E(404, "not found");
    const [v] = await q("select data,mime,size from kyc_videos where request_id=$1", [req.params.id]); if (!v) throw E(404, "not found");
    // драйвер базы обычно отдаёт Buffer; если пришла hex-строка (\\x…), переводим сами
    const data = Buffer.isBuffer(v.data) ? v.data : Buffer.from(String(v.data).replace(/^\\x/, ""), "hex");
    const size = data.length, hd = { "Content-Type": v.mime, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" };
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
    if (m && (m[1] || m[2])) {
      let a = m[1] === "" ? Math.max(0, size - +m[2]) : +m[1], z = m[1] === "" || m[2] === "" ? size - 1 : Math.min(+m[2], size - 1);
      if (a > z || a >= size) return res.status(416).set("Content-Range", `bytes */${size}`).end();
      return res.status(206).set({ ...hd, "Content-Range": `bytes ${a}-${z}/${size}`, "Content-Length": z - a + 1 }).end(data.subarray(a, z + 1));
    }
    res.status(200).set({ ...hd, "Content-Length": size }).end(data);
  }));
  // видео паспорта не хранится вечно: через KYC_KEEP_DAYS дней после решения удаляем (по умолчанию 30)
  const keep = num(env["KYC_KEEP_DAYS"], 30);
  setInterval(async () => { try { await q("delete from kyc_videos v using kyc_requests k where k.id=v.request_id and k.status in ('approved','rejected') and k.resolved_at < now() - ($1||' days')::interval", [String(keep)]); } catch (e) { console.warn("[kyc cleanup]", e.message); } }, 6 * 3600e3).unref?.();

  // ---- админ: проверка видео
  app.get("/api/admin/kyc", need, adm, wrap(async (_req, res) => res.json(await q(
    `select k.id,k.kind,k.status,k.reason,k.created_at,k.submitted_at,k.order_id,o.number order_number,o.total_cents,u.username,u.created_at user_created,
      (select count(*) from orders x where x.buyer_id=u.id and x.status='completed')::int done
     from kyc_requests k join users u on u.id=k.user_id left join orders o on o.id=k.order_id
     where k.status in ('submitted','need') order by (k.status='submitted') desc,k.submitted_at nulls last,k.created_at limit 100`))));
  app.post("/api/admin/kyc/:id", need, adm, wrap(async (req, res) => {
    if (!uuid(req.params.id)) throw E(404, "not found");
    const act = String(req.body?.action || ""), note = String(req.body?.note || "").slice(0, 300);
    if (!["approve", "reject"].includes(act)) throw E(400, "bad action"); if (act === "reject" && note.trim().length < 3) throw E(400, "Укажите причину отказа");
    const idName = String(req.body?.name || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (act === "approve" && !(/^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё .'-]+$/.test(idName) && idName.split(" ").length >= 2)) throw E(400, "Впишите фамилию и имя по паспорту");
    const out = await tx(async c => {
      const { rows: [k] } = await c.query("select * from kyc_requests where id=$1 for update", [req.params.id]); if (!k) throw E(404, "not found");
      if (k.status !== "submitted") throw E(409, "Видео ещё не загружено или проверка уже закрыта");
      await c.query("update kyc_requests set status=$2,note=$3,resolved_by=$4,resolved_at=now() where id=$1", [k.id, act === "approve" ? "approved" : "rejected", note || null, req.user.id]);
      let number = null;
      if (k.order_id) { const { rows: [o] } = await c.query("select number,status from orders where id=$1 for update", [k.order_id]); number = o?.number;
        if (act === "approve") await c.query("update orders set review_status='cleared',updated_at=now() where id=$1", [k.order_id]);
        else if (o && o.status === "pending_payment") { await c.query("update orders set status='cancelled',review_status='rejected',updated_at=now() where id=$1", [k.order_id]); await c.query("insert into order_events(order_id,status,actor_id) values($1,'cancelled',$2)", [k.order_id, req.user.id]); }
        else await c.query("update orders set review_status='rejected' where id=$1", [k.order_id]); }
      let released = 0;
      if (act === "approve") { // личность подтверждена: выводить можно сразу, текущие холды по времени снимаются
        await c.query("update users set id_verified_at=coalesce(id_verified_at,now()),id_name=$2 where id=$1", [k.user_id, idName]);
        released = (await c.query("update holds set status='released',closed_at=now() where user_id=$1 and status='held' and reason='hold72'", [k.user_id])).rowCount;
      }
      const { rows: [n] } = await c.query("insert into notifications(user_id,type,payload) values($1,$2,$3) returning id,payload", [k.user_id, act === "approve" ? "kyc_ok" : "kyc_no", { order_id: k.order_id || undefined, number, note }]);
      return { user: k.user_id, n, type: act === "approve" ? "kyc_ok" : "kyc_no", released };
    });
    try { pushUser?.(out.user, "notify", { id: out.n.id, type: out.type, ...out.n.payload }); } catch { }
    res.json({ ok: true, released: out.released });
  }));

  // уведомление покупателю о заморозке (вызывается из оплаты уже после коммита)
  hooks.kycNotify = (uid, n) => { try { pushUser?.(uid, "notify", { id: n.id, type: "kyc_need", ...n.payload }); } catch { } };
}
