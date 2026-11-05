// v66: клавиатура не перекрывает поля, кнопки внизу закреплены и не прыгают
(() => {
  const vv = window.visualViewport, root = document.documentElement, FIELD = "INPUT,TEXTAREA,SELECT,[contenteditable=true]";
  const isChat = e => e && (e.id === "lt" || e.id === "otm" || e.closest && e.closest("#dkb,.mm.ch"));
  const upd = () => { const h = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0; root.style.setProperty("--kbh", (h > 120 ? h : 0) + "px"); document.body.classList.toggle("kbf", h > 120 && !document.body.classList.contains("inchat")) };
  if (vv) { vv.addEventListener("resize", upd); vv.addEventListener("scroll", upd) }
  const reveal = el => { if (!el || isChat(el) || !el.scrollIntoView) return; const go = () => { try { const r = el.getBoundingClientRect(), vh = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0, bar = 72; if (r.bottom > top + vh - bar || r.top < top + 70) el.scrollIntoView({ block: "center", behavior: "smooth" }) } catch { } }; [250, 600, 1000].forEach(d => setTimeout(go, d)) };
  document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(FIELD) && !isChat(e.target)) { document.body.classList.add("typing"); upd(); reveal(e.target) } });
  document.addEventListener("focusout", () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches || !document.activeElement.matches(FIELD)) { document.body.classList.remove("typing"); upd() } }, 120));
})();
