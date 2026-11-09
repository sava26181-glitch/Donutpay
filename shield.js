import crypto from "crypto";
// Защита от флуда и спама без внешних пакетов (в памяти процесса).
// Работает на уровне приложения: режет частые запросы, банит флудеров на время, ограничивает регистрации, сообщения, обращения,
// проверяет honeypot и (если задано) капчу Cloudflare Turnstile. Объёмные DDoS (L3/L4), которые забивают сам канал, гасятся только на входе: у хостинга или в сервисе защиты.
const env = () => process.env;
const store = new Map(); // key -> { n, t }
const bans = new Map();  // ip -> until
const strikes = new Map(); // ip -> { n, t }
const MAX_KEYS = 200000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (now > v.t) store.delete(k);
  for (const [k, v] of bans) if (now > v) bans.delete(k);
  for (const [k, v] of strikes) if (now > v.t) strikes.delete(k);
}, 30000).unref();

// счётчик в окне; возвращает {ok, retry} (секунд)
export function hit(key, limit, windowMs) {
  const now = Date.now(); let e = store.get(key);
  if (!e || now > e.t) { if (store.size > MAX_KEYS) store.clear(); e = { n: 0, t: now + windowMs }; store.set(key, e); }
  e.n++;
  return { ok: e.n <= limit, retry: Math.max(1, Math.ceil((e.t - now) / 1000)) };
}
export const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;
function tooMany(res, retry, msg) { res.setHeader("Retry-After", String(retry)); return res.status(429).json({ error: msg || "too many requests", retry }); }

// 1) самый ранний слой: настоящий IP за Cloudflare, бан, общий лимит по IP, длина URL, методы
export function shieldEarly() {
  return (req, res, next) => {
    if (env().CF_PROXY === "1") { const c = String(req.headers["cf-connecting-ip"] || "").trim(); if (IP_RE.test(c)) Object.defineProperty(req, "ip", { value: c, configurable: true }); }
    if (req.url.length > 2000) return res.status(414).end();
    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(req.method)) return res.status(405).end();
    if (req.path === "/health") return next();
    const ip = String(req.ip || "?"), now = Date.now(), until = bans.get(ip);
    if (until && now < until) return tooMany(res, Math.ceil((until - now) / 1000), "temporarily blocked");
    const api = req.path.startsWith("/api/");
    const lim = Math.ceil((api ? +env().SHIELD_API_PER_MIN || 600 : +env().SHIELD_WEB_PER_MIN || 1200) * (attackOn() ? 0.5 : 1));
    const r = hit((api ? "a:" : "w:") + ip, lim, 60e3);
    const rn = hit("n:" + subnet(ip), lim * 8, 60e3); // вся подсеть /24 (IPv6 /48): против атак с соседних адресов; запас под мобильный NAT
    if (!r.ok || !rn.ok) {
      const s = strikes.get(ip) || { n: 0, t: now + 60e3 }; s.n++; strikes.set(ip, s);
      if (s.n >= 30) { bans.set(ip, now + 10 * 60e3); strikes.delete(ip); console.warn("[shield] ban", ip); banWave(); }
      return tooMany(res, (r.ok ? rn : r).retry);
    }
    next();
  };
}

// 2) правила по путям (после разбора JSON и определения пользователя)
const RULES = [
  ["POST", /^\/api\/auth\/register$/, 5, 3600e3, "ip", "too many registrations"],
  ["POST", /^\/api\/auth\/login$/, 25, 600e3, "ip", "too many attempts"],
  ["POST", /^\/api\/auth\/reset\/request$/, 8, 3600e3, "ip", "too many attempts"],
  ["POST", /^\/api\/auth\/reset\/confirm$/, 15, 3600e3, "ip", "too many attempts"],
  ["POST", /^\/api\/conversations\/[^/]+\/messages$/, 40, 60e3, "user", "too many messages"],
  ["POST", /^\/api\/disputes\/[^/]+\/messages$/, 30, 60e3, "user", "too many messages"],
  ["POST", /^\/api\/tickets$/, 6, 3600e3, "user", "too many tickets"],
  ["POST", /^\/api\/tickets\/[^/]+\/messages$/, 20, 60e3, "user", "too many messages"],
  ["POST", /^\/api\/reports$/, 10, 3600e3, "user", "too many reports"],
  ["POST", /^\/api\/listings$/, 30, 86400e3, "user", "too many listings"],
  ["POST", /^\/api\/orders$/, 30, 3600e3, "user", "too many orders"],
  ["POST", /^\/api\/orders\/[^/]+\/(review|dispute)$/, 20, 3600e3, "user", "too many requests"],
];
const BAD_MAIL = new Set("mailinator.com,guerrillamail.com,10minutemail.com,tempmail.com,temp-mail.org,trashmail.com,yopmail.com,sharklasers.com,getnada.com,dispostable.com,maildrop.cc,throwawaymail.com,fakeinbox.com,mintemail.com".split(","));
export function shieldRules() {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    const ip = String(req.ip || "?"), uid = req.user?.id;
    // общий лимит на изменяющие запросы: на пользователя (или IP, если не вошёл)
    const g = hit("wr:" + (uid || ip), uid ? 120 : 60, 60e3); if (!g.ok) return tooMany(res, g.retry);
    for (const [m, re, limit, win, by, msg] of RULES) {
      if (req.method === m && re.test(req.path)) {
        const r = hit(`r:${re.source}:${by === "user" ? (uid || ip) : ip}`, limit, win); if (!r.ok) return tooMany(res, r.retry, msg);
        break;
      }
    }
    // по email: не больше N попыток на один аккаунт, чтобы нельзя было перебирать пароль с разных IP
    const em = String(req.body?.email || "").trim().toLowerCase().slice(0, 120);
    if (em && req.method === "POST") {
      if (req.path === "/api/auth/login") { const r = hit("le:" + em, 12, 15 * 60e3); if (!r.ok) return tooMany(res, r.retry, "too many attempts"); }
      if (req.path === "/api/auth/reset/request") { const r = hit("re:" + em, 4, 3600e3); if (!r.ok) return tooMany(res, r.retry, "too many attempts"); }
    }
    next();
  };
}

// 3) антибот для регистрации и запроса сброса: honeypot, одноразовые почты, Turnstile (если задан TURNSTILE_SECRET)
export async function verifyTurnstile(token, ip) {
  const secret = env().TURNSTILE_SECRET; if (!secret) return true;
  if (!token || typeof token !== "string" || token.length > 2100) return false;
  try {
    const r = await fetch(env().TURNSTILE_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, remoteip: ip || "" }), signal: AbortSignal.timeout(8000) });
    const d = await r.json(); return d.success === true;
  } catch (e) { console.error("[turnstile]", e.message); return false; }
}
export function antibot({ strictMail = false } = {}) {
  return async (req, res, next) => {
    const b = req.body || {};
    if (b.hp) return res.status(400).json({ error: "invalid input" });          // honeypot: человек это поле не видит
    if (strictMail) { const d = String(b.email || "").split("@")[1]?.toLowerCase(); if (d && BAD_MAIL.has(d)) return res.status(400).json({ error: "disposable email" }); }
    if (!(await verifyTurnstile(b.cf, req.ip))) return res.status(400).json({ error: "captcha" });
    next();
  };
}
export const turnstileSiteKey = () => (env().TURNSTILE_SECRET && env().TURNSTILE_SITEKEY) ? env().TURNSTILE_SITEKEY : "";


// 4) Режим защиты от атак (L7 DDoS) без внешних сервисов.
// Включается сам при всплеске запросов, перегрузке или волне банов (ATTACK_MODE=auto), вручную из админки или ATTACK_MODE=on.
// В режиме защиты страница сначала показывает короткую проверку браузера: решает задачу (proof-of-work) и получает подписанную
// куку на ATTACK_HOURS часов. Скрипты-флудеры без браузера дальше не проходят. Вебхуки и /health не трогаются.
// Плюс всегда: лимит одновременных запросов на IP и на весь сервер, сброс нагрузки при зависании event loop.
const G = { mode: null, until: 0, reason: "", rps: new Array(10).fill(0), sec: 0, lag: 0, lagBad: 0, inflight: 0, perIp: new Map(), sse: new Map(), revoked: new Set(), cid: new Map(), used: new Map(), banTs: [] };
const numE = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d };
const gmode = () => G.mode || String(env().ATTACK_MODE || "auto").toLowerCase();
const powBits = () => Math.min(22, Math.max(8, numE(env().ATTACK_POW_BITS, 16)));
const SECRET = () => String(env().JWT_SECRET || "dp") + "|shield";
const hm = v => crypto.createHmac("sha256", SECRET()).update(v).digest("hex");
const uaH = req => crypto.createHash("sha256").update(String(req.headers["user-agent"] || "")).digest("hex").slice(0, 8);
const isHook = p => /\/webhook$/.test(p);
export function attackOn() { const m = gmode(); return m === "on" || (m === "auto" && Date.now() < G.until); }
function trip(reason) { if (gmode() !== "auto") return; if (Date.now() >= G.until) console.warn("[shield] режим защиты включён:", reason); G.until = Date.now() + 10 * 60e3; G.reason = reason; }
function banWave() { const now = Date.now(); G.banTs = G.banTs.filter(t => now - t < 60e3); G.banTs.push(now); if (G.banTs.length >= 10) trip("волна блокировок"); }
function subnet(ip) { const v4 = /(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(ip); if (v4) return v4[1] + "." + v4[2] + "." + v4[3]; return ip.split(":").slice(0, 3).join(":"); }
function tick() { const s = Math.floor(Date.now() / 1000); if (s !== G.sec) { const gap = Math.min(10, s - G.sec); for (let i = 1; i <= gap; i++) G.rps[(G.sec + i) % 10] = 0; G.sec = s; } G.rps[s % 10]++; }
const avgRps = () => G.rps.reduce((a, b) => a + b, 0) / 10;
setInterval(() => { const t = performance.now(); setImmediate(() => { G.lag = performance.now() - t; G.lagBad = G.lag > 250 ? G.lagBad + 1 : 0; if (G.lagBad >= 4) trip("сервер перегружен"); }); }, 500).unref();
setInterval(() => { const now = Date.now(); for (const [k, v] of G.used) if (v < now) G.used.delete(k); for (const [k, v] of G.cid) if (v.t < now) G.cid.delete(k); if (G.revoked.size > 50000) G.revoked.clear(); }, 60000).unref();
function busy(res, msg) { res.setHeader("Retry-After", "3"); res.setHeader("Cache-Control", "no-store"); return res.status(503).json({ error: msg || "server busy" }); }
function cookieOf(req, name) { const m = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)").exec(String(req.headers.cookie || "")); return m ? decodeURIComponent(m[1]) : ""; }
function clearance(req) {
  const v = cookieOf(req, "dpc"), [exp, ua, sig] = v.split("."); if (!sig || !(+exp > Date.now()) || ua !== uaH(req)) return null;
  if (hm(exp + "." + ua).slice(0, 24) !== sig) return null; const cid = sig.slice(0, 12); if (G.revoked.has(cid)) return null;
  const ip = String(req.ip || "?"); let e = G.cid.get(cid); if (!e) { e = { ips: new Set(), t: Date.now() + 10 * 60e3 }; G.cid.set(cid, e); }
  if (e.ips.size < 64) e.ips.add(ip); if (e.ips.size > 40) { G.revoked.add(cid); console.warn("[shield] кука проверки используется с многих IP, отозвана"); return null; }
  return cid;
}
const lz = hex => { let n = 0; for (const ch of hex) { const v = parseInt(ch, 16); if (v === 0) { n += 4; continue; } n += Math.clz32(v) - 28; break; } return n; };
const SHA_JS = 'var K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]),W=new Uint32Array(64);function sha(m){var l=m.length,nb=(l+9+63)>>6,w=new Uint32Array(nb*16),i,t;for(i=0;i<l;i++)w[i>>2]|=m.charCodeAt(i)<<(24-(i&3)*8);w[l>>2]|=0x80<<(24-(l&3)*8);w[nb*16-1]=l*8;var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;for(var b=0;b<nb;b++){for(t=0;t<16;t++)W[t]=w[b*16+t];for(t=16;t<64;t++){var x=W[t-15],y=W[t-2];W[t]=(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+W[t-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))+W[t-16]}var a=h0,c=h1,d=h2,e=h3,f=h4,g=h5,k=h6,o=h7;for(t=0;t<64;t++){var T1=(o+(((f>>>6)|(f<<26))^((f>>>11)|(f<<21))^((f>>>25)|(f<<7)))+((f&g)^(~f&k))+K[t]+W[t])|0,T2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&c)^(a&d)^(c&d)))|0;o=k;k=g;g=f;f=(e+T1)|0;e=d;d=c;c=a;a=(T1+T2)|0}h0=(h0+a)|0;h1=(h1+c)|0;h2=(h2+d)|0;h3=(h3+e)|0;h4=(h4+f)|0;h5=(h5+g)|0;h6=(h6+k)|0;h7=(h7+o)|0}return h0>>>0}';
function challenge(req, res) {
  const ts = Math.floor(Date.now() / 1000), rnd = crypto.randomBytes(6).toString("hex"), bits = powBits(), base = ts + "." + rnd + "." + bits;
  const seed = base + "." + hm(base + "." + uaH(req)).slice(0, 16);
  res.status(200).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
  res.end(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DonutPay</title><style>:root{--a:#8b5cf6}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08080c;color:#fff;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{padding:24px;text-align:center}b{display:block;margin-bottom:4px;font-size:18px}p{margin:0;color:#a1a1aa}i{display:block;width:160px;height:3px;margin:20px auto 0;border-radius:3px;background:#24242c;overflow:hidden}i:after{content:"";display:block;width:40%;height:100%;background:var(--a);animation:m .9s ease-in-out infinite alternate}@keyframes m{to{transform:translateX(150%)}}@media(prefers-reduced-motion:reduce){i:after{animation:none;width:100%}}noscript p{margin-top:14px;color:#f87171}</style></head><body><main><b>Проверяем браузер</b><p>Пара секунд, и сайт откроется</p><i></i><noscript><p>Включите JavaScript, чтобы открыть DonutPay</p></noscript></main><script>try{var c=JSON.parse(localStorage.dp_site||"{}").accent;if(c)document.documentElement.style.setProperty("--a",c)}catch(e){}${SHA_JS};var S=${JSON.stringify(seed)},B=${bits},n=0;function run(){var t=Date.now();while(Date.now()-t<40){if((sha(S+":"+n)>>>(32-B))===0){location.replace("/__dp/pass?s="+encodeURIComponent(S)+"&n="+n+"&r="+encodeURIComponent(location.pathname+location.search+location.hash));return}n++}setTimeout(run,0)}run()</script></body></html>`);
}
function passCheck(req, res) {
  const ip = String(req.ip || "?"); if (!hit("dp:" + ip, 20, 60e3).ok) return tooMany(res, 60, "too many attempts");
  const s = String(req.query.s || "").slice(0, 120), n = String(req.query.n || "").slice(0, 16), r0 = String(req.query.r || "/");
  const r = /^\/(?![\/\\])[^\s]{0,500}$/.test(r0) ? r0 : "/";
  const [ts, rnd, bits, sig] = s.split(".");
  const ok = sig && /^\d+$/.test(n) && Math.abs(Date.now() / 1000 - +ts) < 600 && +bits >= Math.min(powBits(), 16) && hm(ts + "." + rnd + "." + bits + "." + uaH(req)).slice(0, 16) === sig && !G.used.has(s)
    && lz(crypto.createHash("sha256").update(s + ":" + n).digest("hex")) >= +bits;
  if (!ok) { res.setHeader("Cache-Control", "no-store"); return res.redirect(302, r); }
  G.used.set(s, Date.now() + 15 * 60e3);
  const exp = Date.now() + numE(env().ATTACK_HOURS, 12) * 3600e3, ua = uaH(req), val = exp + "." + ua + "." + hm(exp + "." + ua).slice(0, 24);
  const secure = req.secure || String(req.headers["x-forwarded-proto"] || "").startsWith("https");
  res.setHeader("Set-Cookie", `dpc=${val}; Path=/; Max-Age=${Math.floor((exp - Date.now()) / 1000)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  res.setHeader("Cache-Control", "no-store"); return res.redirect(302, r);
}
export function shieldGate() {
  return (req, res, next) => {
    const p = req.path; if (p === "/health") return next();
    if (p === "/__dp/pass") return passCheck(req, res);
    if (!/\.(js|css|webp|png|jpe?g|svg|ico|woff2?|gif|mp4|txt|xml)$/i.test(p)) { tick(); const lim = numE(env().ATTACK_RPS, 150); if (avgRps() > lim) trip("всплеск запросов: " + Math.round(avgRps()) + " в секунду"); } // считаем страницы и API, не картинки
    const ip = String(req.ip || "?"), hook = isHook(p), sse = p === "/api/stream" || p === "/api/live";
    if (sse) {
      const n = G.sse.get(ip) || 0; if (n >= numE(env().SHIELD_IP_STREAMS, 8)) return busy(res, "too many parallel requests");
      G.sse.set(ip, n + 1); let d = false; const fin = () => { if (d) return; d = true; const m = (G.sse.get(ip) || 1) - 1; if (m <= 0) G.sse.delete(ip); else G.sse.set(ip, m); }; res.on("close", fin); res.on("finish", fin);
    } else {
      if (!hook && G.inflight >= numE(env().SHIELD_MAX_INFLIGHT, 400)) { trip("очередь запросов"); return busy(res); }
      const n = G.perIp.get(ip) || 0; if (!hook && n >= numE(env().SHIELD_IP_INFLIGHT, 60)) return busy(res, "too many parallel requests");
      G.inflight++; G.perIp.set(ip, n + 1); let d = false; const fin = () => { if (d) return; d = true; G.inflight--; const m = (G.perIp.get(ip) || 1) - 1; if (m <= 0) G.perIp.delete(ip); else G.perIp.set(ip, m); }; res.on("finish", fin); res.on("close", fin);
    }
    if (G.lagBad >= 4 && !hook && p.startsWith("/api/") && req.method !== "GET") return busy(res);
    if (hook || !attackOn() || clearance(req)) return next();
    if (req.method === "GET" && (p === "/" || /text\/html/.test(String(req.headers.accept || "")))) return challenge(req, res);
    res.setHeader("Cache-Control", "no-store"); return res.status(503).json({ error: "browser check required", challenge: true });
  };
}
export function shieldStatus() {
  const on = attackOn(), m = gmode();
  return { mode: m, active: on, reason: on ? (m === "on" ? "включено вручную" : G.reason) : "", until: m === "auto" && G.until > Date.now() ? new Date(G.until).toISOString() : null, rps: Math.round(avgRps()), inflight: G.inflight, lag_ms: Math.round(G.lag), bans: bans.size, pow_bits: powBits() };
}
export function shieldSetMode(m) { if (!["auto", "on", "off"].includes(m)) throw new Error("bad mode"); G.mode = m; if (m !== "auto") G.until = 0; return shieldStatus(); }
