// Скачивает обложки игр из Steam (поиск по названию) в public/img/games/<slug>.jpg и обновляет index.json.
// Запуск на своём компьютере с интернетом:  node scripts/fetch-covers.mjs
// Пропускает игры, у которых обложка уже есть. Игры не из Steam (мобильные, приложения) остаются с нарисованной обложкой.
import fs from "fs"; import path from "path";
const root = path.resolve(import.meta.dirname, ".."), dir = path.join(root, "public/img/games");
const games = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "games.json"), "utf8"));
fs.mkdirSync(dir, { recursive: true });
const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const have = () => new Set(fs.readdirSync(dir).filter(f => /\.(webp|jpg)$/.test(f)).map(f => f.replace(/\.\w+$/, "")));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, miss = [];
for (const [slug, name] of games) {
  if (have().has(slug)) continue;
  try {
    const r = await fetch("https://store.steampowered.com/api/storesearch/?cc=us&l=en&term=" + encodeURIComponent(name));
    const j = await r.json(), it = (j.items || []).find(x => norm(x.name) === norm(name));
    if (!it) { miss.push(name); continue; }
    const img = await fetch(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`);
    const alt = img.ok ? img : await fetch(`https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/header.jpg`);
    if (!alt.ok) { miss.push(name); continue; }
    fs.writeFileSync(path.join(dir, slug + ".jpg"), Buffer.from(await alt.arrayBuffer())); ok++;
    console.log("ok", name);
  } catch (e) { miss.push(name); console.log("fail", name, e.message); }
  await sleep(350);
}
const idx = {}; for (const f of fs.readdirSync(dir).sort()) { const m = /^(.+)\.(webp|jpg)$/.exec(f); if (m) idx[m[1]] = m[2]; }
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx));
console.log(`готово: скачано ${ok}, без обложки ${miss.length}`);
