// v72: валюта отображения (рубли, доллары, евро). Все расчёты, баланс и выводы остаются в рублях,
// курс нужен только для того, чтобы показывать суммы в выбранной валюте
export default async function routes17(app, { q, E, wrap, need }) {
  const env = process.env, OK = ["RUB", "USD", "EUR"];
  let rates = null; // { usd, eur, at, src }: сколько рублей стоит 1 доллар и 1 евро
  const manual = () => { const u = +String(env["USD_RUB"] || "").replace(",", "."), e = +String(env["EUR_RUB"] || "").replace(",", "."); return u > 1 && e > 1 ? { usd: u, eur: e, at: new Date().toISOString().slice(0, 10), src: "manual" } : null };
  const load = async () => { try { const [r] = await q("select value from site_flags where key='rates'"); const v = r?.value; if (v?.usd > 1 && v?.eur > 1) rates = v; } catch { } };
  const pull = async () => {
    const m = manual(); if (m) { rates = m; return; }
    try {
      const r = await fetch(env["RATES_URL"] || "https://www.cbr-xml-daily.ru/daily_json.js", { signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json(), v = j.Valute || {}, rate = k => v[k] && +v[k].Value / (+v[k].Nominal || 1);
      const usd = rate("USD"), eur = rate("EUR"); if (!(usd > 1 && usd < 10000 && eur > 1 && eur < 10000)) throw new Error("bad rates");
      rates = { usd: Math.round(usd * 10000) / 10000, eur: Math.round(eur * 10000) / 10000, at: String(j.Date || new Date().toISOString()).slice(0, 10), src: "cbr" };
      await q("insert into site_flags(key,value,updated_at) values('rates',$1,now()) on conflict(key) do update set value=excluded.value,updated_at=now()", [rates]);
    } catch (e) { console.warn("[rates] не удалось обновить курс:", e.message, rates ? "(остаётся прежний от " + rates.at + ")" : "(курса нет, сайт показывает рубли)"); }
  };
  await load(); if (manual()) rates = manual();
  pull(); setInterval(pull, 6 * 3600e3).unref?.();

  app.get("/api/currency", wrap(async (req, res) => {
    let mine = null; if (req.user) { const [u] = await q("select currency from users where id=$1", [req.user.id]); mine = u?.currency || "RUB"; }
    res.set("Cache-Control", "no-store").json({ usd: rates?.usd || null, eur: rates?.eur || null, at: rates?.at || null, src: rates?.src || null, mine });
  }));
  app.post("/api/currency", need, wrap(async (req, res) => {
    const c = String(req.body?.c || "").toUpperCase(); if (!OK.includes(c)) throw E(400, "bad currency");
    if (c !== "RUB" && !rates) throw E(409, "Курс валют пока недоступен. Попробуйте позже");
    await q("update users set currency=$2 where id=$1", [req.user.id, c]); res.json({ ok: true, c });
  }));
}
