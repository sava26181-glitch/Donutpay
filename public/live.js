// v60: всё обновляется само: сервер сообщает об изменениях, открытая страница перерисовывается без ручного обновления
(() => {
  if (!window.EventSource) return;
  const PAGES = /^#\/(?:$|\?|games|catalog|tournaments|fav|orders)/;
  let tm = 0, pend = false, last = 0;
  const busy = () => { const a = document.activeElement; return !!document.getElementById("md") || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || window.PEDIT || /tab=edit/.test(location.hash) };
  const run = () => {
    if (document.hidden) { pend = true; return }
    if (Date.now() - last < 10000) return; last = Date.now(); const h = location.hash || "#/"; if (!PAGES.test(h) || busy()) return;
    const y = window.scrollY;
    try { Promise.resolve(route()).finally(() => { setTimeout(() => scrollTo(0, y), 60); setTimeout(() => scrollTo(0, y), 300) }) } catch { }
  };
  const refresh = () => { clearTimeout(tm); tm = setTimeout(run, 600) };
  const es = new EventSource("/api/live");
  es.addEventListener("refresh", refresh);
  es.addEventListener("tchat", e => { try { window.tChatLive && window.tChatLive(JSON.parse(e.data)) } catch { } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pend) { pend = false; refresh() } });
})();
