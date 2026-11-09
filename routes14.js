// v69: правила безопасности (обязательно прочитать перед покупкой и продажей), лимит вывода без верификации,
// не больше 2 аккаунтов с одного устройства, проверка реквизитов при выводе, пауза продаж при проигранных спорах
import crypto from "crypto";

export default function routes14(app, { q, E, wrap, need, hooks, pushUser }) {
  const env = process.env, ST = ["moderator", "admin", "owner"];
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d };
  const SAFETY_VER = 1; // поменять номер, если правила изменились и их нужно прочитать заново
  const CFG = () => ({
    wdLimit: num(env["WITHDRAW_LIMIT_RUB"], 15000),
    perDevice: num(env["ACCOUNTS_PER_DEVICE"], 2),
    disputePct: num(env["SELLER_DISPUTE_PCT"], 5),
    disputeMin: num(env["SELLER_DISPUTE_MIN_DEALS"], 20)
  });
  const pub = () => { const k = CFG(); return { ver: SAFETY_VER, hold_hours: hooks.holdHours?.() || 72, wd_limit: k.wdLimit, dispute_pct: k.disputePct, dispute_min: k.disputeMin }; };
  const rub = n => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  const plr = (n, a) => { const x = n % 100, y = n % 10; return x > 10 && x < 20 ? a[2] : y === 1 ? a[0] : y > 1 && y < 5 ? a[1] : a[2] };
  const staffGate = wrap(async (req, _res, next) => { const [u] = await q("select role from users where id=$1", [req.user.id]); if (!ST.includes(u?.role)) throw E(403, "forbidden"); next(); });

  // настройки для страницы правил приходят в index.html сразу (SITE_CFG0.safety): цифры в тексте всегда совпадают с настройками сервера
  { const sc = hooks.siteConfig; hooks.siteConfig = () => ({ ...(sc ? sc() : {}), safety: pub() }); }

  // ---------- правила безопасности: «прочитал и согласен»
  hooks.safetyOk = async (c, uid) => { const { rows: [u] } = await c.query("select safety_ack_ver from users where id=$1", [uid]); return (u?.safety_ack_ver || 0) >= SAFETY_VER; };
  hooks.safetyOkQ = async uid => { const [u] = await q("select safety_ack_ver from users where id=$1", [uid]); return (u?.safety_ack_ver || 0) >= SAFETY_VER; };
  app.get("/api/safety", wrap(async (req, res) => {
    let at = null; if (req.user) { const [u] = await q("select safety_ack_ver,safety_ack_at from users where id=$1", [req.user.id]); if (u && u.safety_ack_ver >= SAFETY_VER) at = u.safety_ack_at; }
    res.set("Cache-Control", "no-store").json({ ...pub(), acked: !!at, acked_at: at });
  }));
  app.post("/api/safety/ack", need, wrap(async (req, res) => {
    const [u] = await q("update users set safety_ack_ver=$2,safety_ack_at=now() where id=$1 returning safety_ack_at", [req.user.id, SAFETY_VER]);
    res.json({ ok: true, ver: SAFETY_VER, acked_at: u?.safety_ack_at || null });
  }));

  // ---------- мультиаккаунты: не больше N аккаунтов с одного устройства
  // устройство = случайный ID из localStorage (заголовок X-Device), хэш считается так же, как в app.js для user_fp
  const fp = v => crypto.createHash("sha256").update(env["JWT_SECRET"] + "|" + v).digest("hex").slice(0, 32);
  const devOf = req => String(req.headers["x-device"] || "").slice(0, 64);
  hooks.fpHash = fp;
  hooks.deviceGate = async req => {
    const dev = devOf(req); if (!dev) return;
    const [r] = await q("select count(distinct user_id)::int n from user_fp where kind='dev' and hash=$1", [fp(dev)]), max = CFG().perDevice;
    if (r.n >= max) throw E(403, `На этом устройстве уже есть ${r.n} ${plr(r.n, ["аккаунт", "аккаунта", "аккаунтов"])} DonutPay. С одного устройства можно создать не больше ${max}. Войдите в свой аккаунт`);
  };
  hooks.deviceBind = async (req, uid) => { const dev = devOf(req); if (!dev) return; await q("insert into user_fp(user_id,kind,hash) values($1,'dev',$2) on conflict(user_id,kind,hash) do update set last_seen=now()", [uid, fp(dev)]).catch(() => { }); };

  // ---------- вывод: лимит без верификации и проверка реквизитов
  const TR = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "iu", "я": "ia" };
  // «скелет» имени: кириллица и латиница сводятся к одному виду (Юлия = Iuliia = Yuliya = Julia, Хабибуллин = Khabibullin)
  const skel = w => {
    let s = String(w).toLowerCase().replace(/[а-яё]/g, ch => TR[ch] ?? "").replace(/[^a-z]/g, "");
    s = s.replace(/[yj]/g, "i").replace(/(.)\1+/g, "$1");
    s = s.replace(/shch|sch/g, "sh").replace(/kh/g, "h").replace(/ts|tz/g, "c").replace(/ck/g, "k").replace(/x/g, "ks").replace(/w/g, "v").replace(/q/g, "k").replace(/ph/g, "f");
    s = s.replace(/iu/g, "u").replace(/ia/g, "a").replace(/ie/g, "e").replace(/(.)\1+/g, "$1");
    return s;
  };
  const toks = s => String(s || "").split(/[\s.,-]+/).map(skel).filter(x => x.length >= 2);
  // фамилия из паспорта (первое слово «Фамилия Имя») должна встретиться в имени получателя; длинные фамилии на картах иногда обрезаны
  const nameMatch = (idName, holder) => { const sur = toks(idName)[0]; if (!sur) return true; return toks(holder).some(t => t === sur || (t.length >= 5 && sur.length >= 5 && (t.startsWith(sur) || sur.startsWith(t)))); };
  const normDet = (method, d) => {
    const s = String(d || "").trim().toLowerCase(), dig = s.replace(/\D/g, "");
    if (method === "card" && dig.length >= 12) return "card:" + dig;
    if (method === "sbp" && dig.length >= 10) { let p = dig; if (p.length === 11 && p[0] === "8") p = "7" + p.slice(1); if (p.length === 10) p = "7" + p; return "sbp:" + p; }
    return method + ":" + s.replace(/\s+/g, " ");
  };
  hooks.nameMatch = nameMatch;
  hooks.withdrawCheck = async (c, uid, { amount, method, details, holder }) => {
    await c.query("insert into wallets(user_id) values($1) on conflict do nothing", [uid]);
    await c.query("select 1 from wallets where user_id=$1 for update", [uid]); // заявки одного человека проверяются по очереди
    const k = CFG(), { rows: [u] } = await c.query("select id_verified_at,id_name from users where id=$1", [uid]);
    if (!u?.id_verified_at) {
      const { rows: [m] } = await c.query("select coalesce(sum(amount),0)::float s from withdrawals where user_id=$1 and status in ('pending','processing','paid') and created_at >= (date_trunc('month', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow')", [uid]);
      if (m.s + amount > k.wdLimit + 1e-9) {
        const left = Math.max(0, k.wdLimit - m.s);
        throw E(409, left >= 10 ? `Без верификации можно вывести до ${rub(k.wdLimit)} ₽ в месяц. В этом месяце осталось ${rub(left)} ₽. Чтобы снять лимит, пройдите проверку личности в разделе «Финансы»` : `Лимит вывода без верификации (${rub(k.wdLimit)} ₽ в месяц) исчерпан. Пройдите проверку личности в разделе «Финансы», и лимит снимется`);
      }
    }
    const norm = normDet(method, details), flags = [];
    if (u?.id_verified_at && u.id_name && holder && !nameMatch(u.id_name, holder)) flags.push({ k: "name", t: `Имя получателя «${holder}» не совпадает с паспортом: ${u.id_name}`, bad: 1 });
    const { rows: [d] } = await c.query("select count(distinct details_norm)::int n,coalesce(bool_or(details_norm=$2),false) seen from withdrawals where user_id=$1 and details_norm is not null and created_at>now()-interval '30 days'", [uid, norm]);
    const dn = d.n + (d.seen ? 0 : 1);
    if (dn >= 3) flags.push({ k: "cards", t: `${dn} ${plr(dn, ["реквизит", "разных реквизита", "разных реквизитов"])} за 30 дней`, bad: 1 });
    const { rows: [ev] } = await c.query("select exists(select 1 from withdrawals where user_id=$1 and details_norm=$2) e", [uid, norm]);
    if (!ev.e) flags.push({ k: "new", t: "Новые реквизиты" });
    const { rows: sh } = await c.query("select distinct u.username from withdrawals w join users u on u.id=w.user_id where w.details_norm=$1 and w.user_id<>$2 limit 5", [norm, uid]);
    if (sh.length) flags.push({ k: "shared", t: "Эти реквизиты уже указывал другой аккаунт: " + sh.map(x => x.username).join(", "), bad: 1 });
    if (!u?.id_verified_at) flags.push({ k: "unverified", t: "Личность не подтверждена" });
    return { norm, flags };
  };
  hooks.withdrawInfo = async uid => {
    const k = CFG(), [u] = await q("select id_verified_at from users where id=$1", [uid]);
    const [m] = await q("select coalesce(sum(amount),0)::float s from withdrawals where user_id=$1 and status in ('pending','processing','paid') and created_at >= (date_trunc('month', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow')", [uid]);
    return u?.id_verified_at ? { wd_limit: null, wd_used: m.s, wd_left: null } : { wd_limit: k.wdLimit, wd_used: m.s, wd_left: Math.max(0, k.wdLimit - m.s) };
  };

  // ---------- продавец проиграл больше 5% споров: продажи на паузе до проверки
  hooks.salesPaused = async (c, sellerId) => { const { rows: [u] } = await c.query("select sales_paused_at from users where id=$1", [sellerId]); return !!u?.sales_paused_at; };
  const note = async (uid, type, payload) => { try { const [n] = await q("insert into notifications(user_id,type,payload) values($1,$2,$3) returning id,payload", [uid, type, payload]); pushUser?.(uid, "notify", { id: n.id, type, ...n.payload }); } catch { } };
  hooks.sellerRateCheck = async disputeId => {
    const [d] = await q("select o.seller_id from disputes d join orders o on o.id=d.order_id where d.id=$1", [disputeId]); if (!d) return null;
    const [s] = await q(`select (select count(*) from orders where seller_id=$1 and payment_status in ('confirmed','refunded'))::int deals,
      (select count(*) from disputes x join orders o on o.id=x.order_id where o.seller_id=$1 and x.status='resolved_buyer')::int lost`, [d.seller_id]);
    const k = CFG(); if (s.deals < k.disputeMin || s.lost * 100 <= k.disputePct * s.deals) return null;
    const reason = `Проиграно споров: ${s.lost} из ${s.deals} сделок (${(s.lost * 100 / s.deals).toFixed(1).replace(".", ",")}%), порог ${k.disputePct}%`;
    const [u] = await q("update users set sales_paused_at=now(),sales_pause_reason=$2 where id=$1 and sales_paused_at is null returning id", [d.seller_id, reason]);
    if (u) await note(d.seller_id, "sales_paused", { reason });
    return u ? reason : null;
  };
  app.get("/api/admin/paused-sellers", need, staffGate, wrap(async (_req, res) => res.json(await q(
    `select u.id,u.username,u.sales_paused_at,u.sales_pause_reason,
      (select count(*) from orders o where o.seller_id=u.id and o.status in ('paid','in_progress','dispute'))::int open_orders,
      (select count(*) from orders o where o.seller_id=u.id and o.payment_status in ('confirmed','refunded'))::int deals
     from users u where u.sales_paused_at is not null order by u.sales_paused_at desc limit 100`))));
  app.post("/api/admin/paused-sellers/:id/resume", need, staffGate, wrap(async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw E(404, "not found");
    const [u] = await q("update users set sales_paused_at=null,sales_pause_reason=null where id=$1 and sales_paused_at is not null returning id", [req.params.id]); if (!u) throw E(409, "Продажи уже не на паузе");
    await q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,'sales_resume','user',$2,'{}')", [req.user.id, req.params.id]).catch(() => { });
    await note(req.params.id, "sales_resumed", {});
    res.json({ ok: true });
  }));
}
