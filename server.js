// Лаунчер: сразу занимает порт (чтобы хостинг не видел 502 во время запуска и миграций),
// затем загружает приложение. Если запуск не удался, вместо 502 показывает причину (503) и пишет её в лог.
import http from "node:http";
const PORT = +process.env["PORT"] || 3000;
let handler = null, err = "";
const safe = s => String(s).replace(/\/\/[^@\s\/]*@/g, "//***@").slice(0, 400);
const srv = http.createServer((req, res) => {
  if (handler) return handler(req, res);
  if (req.url === "/health") { res.writeHead(err ? 500 : 503); return res.end(err ? "error" : "starting"); }
  res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "10", "Cache-Control": "no-store" });
  res.end(err ? "DonutPay: ошибка запуска\n" + err : "DonutPay запускается, обновите страницу через несколько секунд");
});
// защита от медленных соединений (slowloris)
srv.headersTimeout = 15000; srv.requestTimeout = 120000; srv.keepAliveTimeout = 10000; srv.maxHeadersCount = 60;
srv.listen(PORT, "0.0.0.0", () => console.log("DonutPay on", PORT, "(запуск приложения…)"));
process.on("unhandledRejection", e => console.error("[unhandledRejection]", e));
process.on("uncaughtException", e => console.error("[uncaughtException]", e));
try { const m = await import("./app.js"); handler = m.default; console.log("DonutPay ready"); }
catch (e) { err = safe((e && e.code ? e.code + ": " : "") + (e && e.message || e)); console.error("[startup] не удалось запустить приложение:", e); }
