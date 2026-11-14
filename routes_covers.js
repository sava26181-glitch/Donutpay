// Обложки игр: сервер сам ищет картинку (Steam, App Store, RAWG), сохраняет в базу и отдаёт.
// Переменная RAWG_KEY (необязательно, бесплатный ключ с rawg.io/apidocs) добавляет поиск по RAWG: консольные и старые игры.
export default function routesCovers(app, { q, wrap }) {
  const env = process.env;
  q("create table if not exists game_covers(slug text primary key, ext text, data bytea, miss boolean not null default false, at timestamptz not null default now())").catch(e => console.warn("[covers]", e.message));
  const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.startsWith(b + " ") || b.startsWith(a + " ")) };
  const get = async (u, ms = 8000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { return await fetch(u, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 DonutPay" } }) } finally { clearTimeout(t) } };
  const J = async u => { const r = await get(u); if (!r.ok) throw new Error(r.status); return r.json() };
  const B = async u => { if (!u) return null; const r = await get(u); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); return b.length > 2000 && b.length < 4e6 ? b : null };
  const src = [
    async name => { const it = ((await J("https://store.steampowered.com/api/storesearch/?cc=us&l=en&term=" + encodeURIComponent(name))).items || []).find(x => same(x.name, name)); if (!it) return null; return (await B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`)) || B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/header.jpg`) },
    async name => { const it = ((await J("https://itunes.apple.com/search?entity=software&limit=5&country=ru&term=" + encodeURIComponent(name))).results || []).find(x => same(String(x.trackName).split(/[:\-–—]/)[0], name) || same(x.trackName, name)); return it ? B(String(it.artworkUrl512 || it.artworkUrl100 || "").replace(/\d+x\d+bb/, "512x512bb")) : null },
    async name => { if (!env.RAWG_KEY) return null; const it = ((await J(`https://api.rawg.io/api/games?search_precise=true&page_size=5&key=${encodeURIComponent(env.RAWG_KEY)}&search=${encodeURIComponent(name)}`)).results || []).find(x => same(x.name, name) && x.background_image); return it ? B(String(it.background_image).replace("/media/games/", "/media/crop/600/400/games/")) : null }
  ];
  const mime = b => b[0] === 0x89 ? "image/png" : b[0] === 0x52 ? "image/webp" : "image/jpeg";
  // очередь: не больше 3 поисков одновременно, одна игра не ищется дважды
  const busy = new Map(); let run = 0; const wait = [];
  const slot = () => run < 3 ? (run++, Promise.resolve()) : new Promise(r => wait.push(r));
  const free = () => { run--; const n = wait.shift(); if (n) { run++; n() } };
  const find = (slug, name) => { if (busy.has(slug)) return busy.get(slug); const p = (async () => { await slot(); try { for (const s of src) { try { const b = await s(name); if (b) return b } catch { } } return null } finally { free() } })().then(async b => { await q("insert into game_covers(slug,ext,data,miss,at) values($1,'img',$2,$3,now()) on conflict(slug) do update set data=$2,miss=$3,at=now()", [slug, b, !b]).catch(() => { }); return b }).finally(() => busy.delete(slug)); busy.set(slug, p); return p };
  app.get("/api/cover/:slug", wrap(async (req, res) => {
    const slug = String(req.params.slug || ""); if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(404).end();
    res.set("Cache-Control", "public, max-age=86400");
    const [c] = await q("select data,miss,at from game_covers where slug=$1", [slug]);
    if (c && typeof c.data === "string") c.data = Buffer.from(c.data.replace(/^\\x/, ""), "hex");
    if (c && c.data) return res.set("Content-Type", mime(c.data)).send(c.data);
    if (c && c.miss && Date.now() - new Date(c.at).getTime() < 7 * 864e5) return res.status(404).end();
    const [g] = await q("select name from games where slug=$1", [slug]); if (!g) return res.status(404).end();
    const b = await find(slug, g.name);
    return b ? res.set("Content-Type", mime(b)).send(b) : res.status(404).end();
  }));
}
