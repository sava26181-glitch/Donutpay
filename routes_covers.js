// Обложки игр: сервер сам ищет картинку (Steam, App Store, RAWG), сохраняет в базу и отдаёт.
// Переменная RAWG_KEY (необязательно, бесплатный ключ с rawg.io/apidocs) добавляет поиск по RAWG: консольные и старые игры.
import { createHash } from "node:crypto";
export default function routesCovers(app, { q, wrap, need, E }) {
  const env = process.env;
  q("create table if not exists game_covers(slug text primary key, ext text, data bytea, miss boolean not null default false, at timestamptz not null default now())").then(() => q("alter table game_covers add column if not exists sha text")).then(() => q("delete from game_covers where miss")).then(() => setTimeout(warm, 20000)).catch(e => console.warn("[covers]", e.message));
  const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "u", я: "a" };
  const skel = s => norm(s).replace(/[а-яё]/g, c => TR[c] ?? "").replace(/(.)\1+/g, "$1").replace(/y/g, "i").replace(/\s+/g, " ");
  const toks = s => skel(s).split(" ").filter(w => w.length > 1);
  // совпадение названий: точное, по началу, либо почти все слова общие (с учётом транслита: «Тиндер» = Tinder)
  const same = (a, b) => {
    const x = skel(a), y = skel(b); if (!x || !y) return false;
    const na = (String(a).match(/\d+/g) || []).join(","), nb = (String(b).match(/\d+/g) || []).join(",");
    if (na && nb && na !== nb) return false; // Dota 2 != Dota 3
    if (x === y || x.startsWith(y + " ") || y.startsWith(x + " ") || x.replace(/ /g, "") === y.replace(/ /g, "")) return true;
    const A = toks(a), B = toks(b); if (!A.length || !B.length) return false;
    const common = A.filter(w => B.includes(w)).length; return common / Math.max(A.length, B.length) >= 0.75;
  };
  const get = async (u, ms = 8000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { return await fetch(u, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 DonutPay" } }) } finally { clearTimeout(t) } };
  const J = async u => { const r = await get(u); if (!r.ok) throw new Error(r.status); return r.json() };
  const B = async u => { if (!u) return null; const r = await get(u); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); return b.length > 2000 && b.length < 4e6 ? b : null };
  const src = [
    async name => { let it; for (const [cc, l] of [["us", "english"], ["ru", "russian"]]) { it = ((await J(`https://store.steampowered.com/api/storesearch/?cc=${cc}&l=${l}&term=` + encodeURIComponent(name))).items || []).find(x => same(x.name, name)); if (it) break } if (!it) return null; return (await B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`)) || B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/header.jpg`) },
    async name => { const it = ((await J("https://itunes.apple.com/search?entity=software&limit=10&country=ru&term=" + encodeURIComponent(name))).results || []).find(x => same(String(x.trackName).split(/[:\-–—]/)[0], name) || same(x.trackName, name) || same(x.sellerName, name)); return it ? B(String(it.artworkUrl512 || it.artworkUrl100 || "").replace(/\d+x\d+bb/, "512x512bb")) : null },
    async name => { if (!env.RAWG_KEY) return null; const it = ((await J(`https://api.rawg.io/api/games?search_precise=true&page_size=5&key=${encodeURIComponent(env.RAWG_KEY)}&search=${encodeURIComponent(name)}`)).results || []).find(x => same(x.name, name) && x.background_image); return it ? B(String(it.background_image).replace("/media/games/", "/media/crop/600/400/games/")) : null },
    // RuStore
    async name => { const r = await J("https://backapi.rustore.ru/applicationData/v2/search?query=" + encodeURIComponent(name) + "&pageNumber=0&pageSize=10"); const l = (r.body && (r.body.content || r.body.apps || r.body.list)) || []; const it = l.find(x => same(x.appName || x.name || "", name)); return it ? B(it.iconUrl || it.icon || (it.icon && it.icon.url)) : null },
    // Google Play
    async name => { const r = await get("https://play.google.com/store/search?c=apps&hl=ru&gl=ru&q=" + encodeURIComponent(name)); if (!r.ok) return null; const h = await r.text(); const re = /<img[^>]+(?:alt="([^"]*)"[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"|src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"[^>]+alt="([^"]*)")/g; let m; while ((m = re.exec(h))) { const t = m[1] || m[4], u = m[2] || m[3]; if (t && same(t, name)) return B(u.replace(/=w\d+-h\d+.*$/, "") + "=w512-h512") } return null },
    // App Store (США)
    async name => { const it = ((await J("https://itunes.apple.com/search?entity=software&limit=10&country=us&term=" + encodeURIComponent(name))).results || []).find(x => same(String(x.trackName).split(/[:\-–—]/)[0], name) || same(x.trackName, name)); return it ? B(String(it.artworkUrl512 || it.artworkUrl100 || "").replace(/\d+x\d+bb/, "512x512bb")) : null },
    // Википедия (ru, en): картинка статьи с похожим названием
    async name => { for (const l of ["ru", "en"]) { const r = await J(`https://${l}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=6&gsrsearch=${encodeURIComponent(name)}&prop=pageimages&piprop=thumbnail&pithumbsize=600&origin=*`); const it = Object.values((r.query && r.query.pages) || {}).find(x => x.thumbnail && same(String(x.title).replace(/\s*\(.*\)$/, ""), name)); if (it) { const b = await B(it.thumbnail.source); if (b) return b } } return null },
    // Bing Картинки: последняя попытка для всего, что не нашлось в магазинах (первые квадратные миниатюры результата)
    async name => {
      const r = await fetch("https://www.bing.com/images/search?form=HDRSC2&q=" + encodeURIComponent(name + " game icon logo") + "&first=1&adlt=moderate", { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "ru,en;q=0.8" }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null; const html = await r.text();
      const ids = [...new Set([...html.matchAll(/https:\/\/tse\d\.mm\.bing\.net\/th\?id=([A-Za-z0-9._%\-]+)/g)].map(m => m[1]))].slice(0, 4);
      for (const id of ids) { const b = await B(`https://tse1.mm.bing.net/th?id=${id}&w=256&h=256&c=7&rs=1&pid=ImgDetMain`); if (b) return b }
      return null;
    },
  ];
  const mime = b => b[0] === 0x89 ? "image/png" : b[0] === 0x52 ? "image/webp" : "image/jpeg";
  // очередь: не больше 3 поисков одновременно, одна игра не ищется дважды
  const busy = new Map(); let run = 0; const wait = [];
  const slot = () => run < 3 ? (run++, Promise.resolve()) : new Promise(r => wait.push(r));
  const free = () => { run--; const n = wait.shift(); if (n) { run++; n() } };
  const find = (slug, name) => { if (busy.has(slug)) return busy.get(slug); const p = (async () => { await slot(); try { for (const s of src) { try { const b = await s(name); if (b) return b } catch { } } return null } finally { free() } })().then(async b => {
    let sha = null;
    if (b) { sha = createHash("sha1").update(b).digest("hex"); try { const [d] = await q("select 1 from game_covers where sha=$1 and slug<>$2 limit 1", [sha, slug]); if (d) b = null } catch { } } // одинаковая картинка у разных игр не нужна: у второй будет своя нарисованная
    await q("insert into game_covers(slug,ext,data,miss,at,sha) values($1,'img',$2,$3,now(),$4) on conflict(slug) do update set data=$2,miss=$3,at=now(),sha=$4", [slug, b, !b, b ? sha : null]).catch(() => { }); return b }).finally(() => busy.delete(slug)); busy.set(slug, p); return p };
  // прогрев: после старта в фоне подбираем обложки всем играм, чтобы страница не ждала поиск
  async function warm() {
    try {
      const gs = await q("select g.slug,g.name from games g left join game_covers c on c.slug=g.slug where g.is_active and c.slug is null order by g.name");
      for (const g of gs) { await find(g.slug, g.name).catch(() => { }); await new Promise(r => setTimeout(r, 400)) }
      console.log("[covers] прогрев готов: " + gs.length);
    } catch (e) { console.warn("[covers] прогрев:", e.message) }
  }
  // обложки, найденные браузером сотрудника: сервер сам скачивает картинку (только с разрешённых сайтов) и кэширует для всех
  const HOST = /^https:\/\/([a-z0-9-]+\.)*(mzstatic\.com|wikimedia\.org|steamstatic\.com|googleusercontent\.com|rustore\.ru)\//i;
  const isStaff = async req => { const [u] = await q("select role from users where id=$1", [req.user.id]); return ["moderator", "admin", "owner"].includes(u?.role) };
  app.get("/api/cover-missing", need, wrap(async (req, res) => {
    if (!await isStaff(req)) throw E(403, "forbidden");
    res.json(await q("select g.slug,g.name from games g left join game_covers c on c.slug=g.slug where g.is_active and (c.slug is null or c.miss) order by g.name"));
  }));
  app.post("/api/cover-hint", need, wrap(async (req, res) => {
    if (!await isStaff(req)) throw E(403, "forbidden");
    const slug = String(req.body?.slug || ""), url = String(req.body?.url || ""); if (!/^[a-z0-9-]{1,80}$/.test(slug) || !HOST.test(url) || url.length > 600) throw E(400, "bad hint");
    const [g] = await q("select 1 from games where slug=$1", [slug]); if (!g) throw E(404, "not found");
    const [c] = await q("select miss from game_covers where slug=$1", [slug]); if (c && !c.miss) return res.json({ ok: true, kept: true });
    let b = await B(url).catch(() => null); if (!b) return res.json({ ok: false });
    const sha = createHash("sha1").update(b).digest("hex"); const [d] = await q("select 1 from game_covers where sha=$1 and slug<>$2 limit 1", [sha, slug]); if (d) return res.json({ ok: false, dup: true });
    await q("insert into game_covers(slug,ext,data,miss,at,sha) values($1,'img',$2,false,now(),$3) on conflict(slug) do update set data=$2,miss=false,at=now(),sha=$3", [slug, b, sha]);
    res.json({ ok: true });
  }));
  // диагностика: открой /api/cover-debug/<slug> в браузере, покажет что ответил каждый источник
  app.get("/api/cover-debug/:slug", wrap(async (req, res) => {
    const slug = String(req.params.slug || ""); if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(404).end();
    const [g] = await q("select name from games where slug=$1", [slug]); if (!g) return res.status(404).json({ error: "нет такой игры" });
    const out = []; for (let i = 0; i < src.length; i++) { const t = Date.now(); try { const b = await src[i](g.name); out.push({ source: i, found: !!b, bytes: b ? b.length : 0, ms: Date.now() - t }) } catch (e) { out.push({ source: i, error: String(e.message || e), ms: Date.now() - t }) } }
    res.json({ name: g.name, sources: out });
  }));
  app.get("/api/cover/:slug", wrap(async (req, res) => {
    const slug = String(req.params.slug || ""); if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(404).end();
    res.set("Cache-Control", "public, max-age=86400");
    const [c] = await q("select data,miss,at from game_covers where slug=$1", [slug]);
    if (c && typeof c.data === "string") c.data = Buffer.from(c.data.replace(/^\\x/, ""), "hex");
    if (c && c.data) return res.set("Content-Type", mime(c.data)).send(c.data);
    if (c && c.miss && Date.now() - new Date(c.at).getTime() < 864e5) return res.status(404).end();
    const [g] = await q("select name from games where slug=$1", [slug]); if (!g) return res.status(404).end();
    const b = await find(slug, g.name);
    return b ? res.set("Content-Type", mime(b)).send(b) : res.status(404).end();
  }));
}
