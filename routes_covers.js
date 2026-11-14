// Обложки игр: сервер сам ищет картинку (Steam, App Store, RAWG), сохраняет в базу и отдаёт.
// Переменная RAWG_KEY (необязательно, бесплатный ключ с rawg.io/apidocs) добавляет поиск по RAWG: консольные и старые игры.
export default function routesCovers(app, { q, wrap }) {
  const env = process.env;
  q("create table if not exists game_covers(slug text primary key, ext text, data bytea, miss boolean not null default false, at timestamptz not null default now())").then(() => q("delete from game_covers where miss")).catch(e => console.warn("[covers]", e.message));
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
    async name => { for (const l of ["ru", "en"]) { const r = await J(`https://${l}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=6&gsrsearch=${encodeURIComponent(name)}&prop=pageimages&piprop=thumbnail&pithumbsize=600&origin=*`); const it = Object.values((r.query && r.query.pages) || {}).find(x => x.thumbnail && same(String(x.title).replace(/\s*\(.*\)$/, ""), name)); if (it) { const b = await B(it.thumbnail.source); if (b) return b } } return null }
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
    if (c && c.miss && Date.now() - new Date(c.at).getTime() < 864e5) return res.status(404).end();
    const [g] = await q("select name from games where slug=$1", [slug]); if (!g) return res.status(404).end();
    const b = await find(slug, g.name);
    return b ? res.set("Content-Type", mime(b)).send(b) : res.status(404).end();
  }));
}
