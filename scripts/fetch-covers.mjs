// Скачивает обложки игр (Steam, App Store, RAWG: поиск по названию) в public/img/games/<slug>.jpg и обновляет index.json.
// Запуск на своём компьютере с интернетом:  RAWG_KEY=ваш_ключ node scripts/fetch-covers.mjs
// Пропускает игры, у которых обложка уже есть. Список игр без обложки сохраняется в scripts/no-cover.txt, у них остаётся нарисованная обложка.
import fs from "fs"; import path from "path";
const root = path.resolve(import.meta.dirname, ".."), dir = path.join(root, "public/img/games");
const games = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "games.json"), "utf8"));
fs.mkdirSync(dir, { recursive: true });
const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const have = () => new Set(fs.readdirSync(dir).filter(f => /\.(webp|jpg)$/.test(f)).map(f => f.replace(/\.\w+$/, "")));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, miss = [];
// источники по порядку: Steam, App Store (мобильные игры и приложения), RAWG (почти все игры, нужен бесплатный ключ RAWG_KEY с rawg.io/apidocs)
const J = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json() };
const B = async u => { const r = await fetch(u); return r.ok ? Buffer.from(await r.arrayBuffer()) : null };
const same = (a, b) => { a = norm(a); b = norm(b); return a === b || a.startsWith(b + " ") || b.startsWith(a + " ") };
const src = {
  async steam(name) {
    const it = ((await J("https://store.steampowered.com/api/storesearch/?cc=us&l=en&term=" + encodeURIComponent(name))).items || []).find(x => same(x.name, name)); if (!it) return null;
    return (await B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`)) || (await B(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/header.jpg`));
  },
  async appstore(name) {
    const it = ((await J("https://itunes.apple.com/search?entity=software&limit=5&country=ru&term=" + encodeURIComponent(name))).results || []).find(x => same(x.trackName.split(/[:\-–—]/)[0], name) || same(x.trackName, name)); if (!it) return null;
    return B((it.artworkUrl512 || it.artworkUrl100 || "").replace(/\d+x\d+bb/, "512x512bb"));
  },
  async rawg(name) {
    if (!process.env.RAWG_KEY) return null;
    const it = ((await J(`https://api.rawg.io/api/games?search_precise=true&page_size=5&key=${process.env.RAWG_KEY}&search=${encodeURIComponent(name)}`)).results || []).find(x => same(x.name, name) && x.background_image); if (!it) return null;
    return B(it.background_image.replace("/media/games/", "/media/crop/600/400/games/"));
  }
};
for (const [slug, name] of games) {
  if (have().has(slug)) continue;
  let buf = null, from = "";
  for (const k of Object.keys(src)) { try { buf = await src[k](name); } catch { } if (buf && buf.length > 2000) { from = k; break; } buf = null; await sleep(200); }
  if (!buf) { miss.push(name); console.log("нет", name); continue; }
  fs.writeFileSync(path.join(dir, slug + ".jpg"), buf); ok++; console.log("ok", from, name);
  await sleep(300);
}
fs.writeFileSync(path.join(root, "scripts/no-cover.txt"), miss.join("\n"));
const idx = {}; for (const f of fs.readdirSync(dir).sort()) { const m = /^(.+)\.(webp|jpg)$/.exec(f); if (m) idx[m[1]] = m[2]; }
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx));
console.log(`готово: скачано ${ok}, без обложки ${miss.length}`);
