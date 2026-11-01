// Перенос изображений из БД в Supabase Storage. Безопасно и повторяемо:
//   node scripts/migrate-media.js            — копирует и проверяет, данные в БД НЕ удаляет
//   node scripts/migrate-media.js --purge    — после успешной проверки обнуляет data в БД
import pg from "pg"; import crypto from "crypto"; import { makeStorage } from "../storage.js";
const stor = makeStorage(process.env, process.env["DATABASE_URL"]), purge = process.argv.includes("--purge");
if (!stor.on) { console.error("Нужны SUPABASE_SERVICE_ROLE_KEY (и SUPABASE_URL, если не выводится из DATABASE_URL)"); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"], ssl: /localhost|127\.0\.0\.1/.test(process.env["DATABASE_URL"]) ? false : { rejectUnauthorized: false } });
console.log("buckets:", await stor.ensure());
const ext = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const { rows } = await pool.query("select id,owner_id,kind,mime,size,data,storage_path from media where data is not null order by created_at");
let ok = 0, fail = 0, purged = 0;
for (const m of rows) {
  try {
    let path = m.storage_path;
    if (!path) { path = `${m.kind}/${m.owner_id}/${crypto.randomUUID()}.${ext[m.mime] || "bin"}`; await stor.put(stor.PUB, path, m.data, m.mime); }
    if (!(await stor.verify(stor.PUB, path, m.size))) throw new Error("проверка после загрузки не прошла");
    await pool.query("update media set storage_bucket=$2,storage_path=$3 where id=$1", [m.id, stor.PUB, path]); ok++;
    if (purge) { await pool.query("update media set data=null where id=$1", [m.id]); purged++; }
  } catch (e) { fail++; console.error("media", m.id, "->", e.message); }
}
console.log(`перенесено и проверено: ${ok}, ошибок: ${fail}, очищено в БД: ${purged}. Ошибки можно исправить и запустить повторно.`);
await pool.end(); process.exit(fail ? 2 : 0);
