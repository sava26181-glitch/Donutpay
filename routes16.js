// v71: блокировка эмуляторов Android и красная кнопка «СТОП» (только для владельцев)
export default async function routes16(app, { q, E, wrap, need, hooks, notifyStaff }) {
  const env = process.env;

  // ---------- эмуляторы Android (BlueStacks, LDPlayer, Nox, MEmu, Genymotion, стандартный эмулятор Android Studio)
  // Браузер сам определяет признаки и присылает их в заголовке X-Env (скрипт в public/app16.js). Сервер добавляет проверку User-Agent.
  const UA_EMU = /bluestacks|genymotion|ldplayer|noxplayer|\bnox\b|memu|andyroid|droid4x|koplayer|mumu|sdk_gphone|android sdk built for|vbox86|\bemulator\b|ttVM/i;
  const on = () => String(env["EMULATOR_BLOCK"] || "on").toLowerCase() !== "off";
  const blocked = { n: 0, day: new Date().toISOString().slice(0, 10) };
  const reason = req => {
    if (!on()) return null;
    const ua = String(req.headers["user-agent"] || ""), x = String(req.headers["x-env"] || "").slice(0, 80);
    if (/Android/i.test(ua) && UA_EMU.test(ua)) return "ua";
    if (/^emu:[a-z,]{1,40}$/.test(x)) return x.slice(4); // gpu | plat | ua — что именно выдало эмулятор
    return null;
  };
  const MSG = "Вход с эмуляторов Android запрещён. Откройте DonutPay на настоящем телефоне или в браузере компьютера";
  const hit = (req, what) => {
    const d = new Date().toISOString().slice(0, 10); if (blocked.day !== d) { blocked.day = d; blocked.n = 0; }
    blocked.n++; console.warn("[emu] заблокировано:", what, reason(req), String(req.ip || ""));
  };
  // role: если это сотрудник (владелец, админ, модератор), эмулятор не блокируем: иначе можно потерять доступ из-за режима телефона в браузере
  hooks.emuCheck = (req, what, role) => {
    if (["owner", "admin", "moderator"].includes(role)) return;
    if (reason(req)) { hit(req, what); throw E(403, MSG); }
  };

  // ---------- красная кнопка «СТОП»: на 1 час закрывает регистрацию и вывод средств
  const MIN = Math.max(1, Math.min(24 * 60, +env["PANIC_MINUTES"] || 60));
  let until = 0, by = null, at = null;
  const load = async () => {
    try {
      const [r] = await q("select value from site_flags where key='panic'");
      const v = r?.value || {}; until = v.until ? new Date(v.until).getTime() || 0 : 0; by = v.by || null; at = v.at || null;
    } catch (e) { console.warn("[panic] load:", e.message); }
  };
  await load();
  setInterval(load, 5000).unref?.();
  const active = () => until > Date.now();
  hooks.panicActive = () => active() ? until : 0;
  hooks.panicGate = what => {
    if (!active()) return;
    throw E(503, what === "register"
      ? "Регистрация временно закрыта из соображений безопасности. Попробуйте позже"
      : "Вывод средств временно приостановлен из соображений безопасности. Деньги в сохранности, попробуйте позже");
  };
  const st = () => ({ active: active(), until: active() ? new Date(until).toISOString() : null, left_sec: active() ? Math.ceil((until - Date.now()) / 1000) : 0, by: active() ? by : null, at: active() ? at : null, minutes: MIN, emulators_today: blocked.n });

  // кнопка видна и работает только у владельцев: роль берётся из базы при каждом запросе
  const ownerGate = wrap(async (req, _res, next) => { const [u] = await q("select role from users where id=$1", [req.user.id]); if (u?.role !== "owner") throw E(403, "forbidden"); req.ownerName = u; next(); });
  app.get("/api/admin/panic", need, ownerGate, wrap(async (_req, res) => { await load(); res.set("Cache-Control", "no-store").json(st()); }));
  app.post("/api/admin/panic", need, ownerGate, wrap(async (req, res) => {
    const turnOn = req.body?.on !== false; const [me] = await q("select username from users where id=$1", [req.user.id]);
    if (turnOn) { until = Date.now() + MIN * 60e3; by = me?.username || null; at = new Date().toISOString(); }
    else { until = 0; }
    const val = turnOn ? { until: new Date(until).toISOString(), by, at } : {};
    await q("insert into site_flags(key,value,updated_at) values('panic',$1,now()) on conflict(key) do update set value=excluded.value,updated_at=now()", [val]);
    await q("insert into audit_log(actor_id,action,target_type,target_id,details) values($1,$2,'site',null,$3)", [req.user.id, turnOn ? "panic_on" : "panic_off", { minutes: turnOn ? MIN : 0 }]).catch(() => { });
    try { notifyStaff?.(turnOn ? `СТОП включён (${me?.username || "владелец"}): регистрация и вывод средств закрыты на ${MIN} мин.` : `СТОП снят (${me?.username || "владелец"}): регистрация и вывод снова работают.`); } catch { }
    console.warn("[panic]", turnOn ? "ВКЛЮЧЁН до " + new Date(until).toISOString() : "снят", me?.username);
    res.set("Cache-Control", "no-store").json(st());
  }));
}
