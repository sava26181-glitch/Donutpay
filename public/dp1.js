/* DonutPay: пончик у заголовков и в пустых состояниях на внутренних страницах (не на главной и не в профилях) */
(function(){
  const thr=f=>{let l=0;return()=>{l||(l=1,requestAnimationFrame(()=>{l=0;try{f()}catch{}}))}};
  let n=0;
  const donut=()=>{
    const id="dg"+(n++),sp=[[-30,-18,30,"#F472B6"],[-6,-36,-40,"#5EEAD4"],[26,-26,50,"#FDE047"],[36,6,-10,"#fff"],[22,32,60,"#F472B6"],[-12,36,20,"#5EEAD4"],[-34,16,-50,"#FDE047"],[-38,-4,70,"#fff"]];
    const r=sp.map(([x,y,a,c])=>`<rect x="${50+x-4.5}" y="${50+y-1.6}" width="9" height="3.2" rx="1.6" fill="${c}" transform="rotate(${a} ${50+x} ${50+y})"/>`).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><circle cx="50" cy="50" r="33" fill="none" stroke="#4C1D95" stroke-width="30"/><circle cx="50" cy="50" r="33" fill="none" stroke="url(#${id})" stroke-width="25"/><path d="M22 36A32 32 0 0 1 42 20" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>${r}</svg>`;
  };
  const skip=()=>{const h=location.hash||"#/";return h==="#/"||h===""||/^#\/(u|me|login|register)(\/|$)/.test(h)};
  const run=()=>{
    if(skip())return;
    const app=document.getElementById("app");if(!app)return;
    const h=app.querySelector(":scope>h2");
    if(h&&!h.querySelector(".dp-t")){const s=document.createElement("span");s.className="dp-t";s.innerHTML=donut();h.prepend(s)}
    app.querySelectorAll('.card.m[style*="text-align:center"]').forEach(c=>{if(c.querySelector(".dp-e"))return;const s=document.createElement("span");s.className="dp-e";s.innerHTML=donut();c.prepend(s)});
  };
  new MutationObserver(thr(run)).observe(document.documentElement,{childList:true,subtree:true});run();
  addEventListener("hashchange",()=>{try{scrollTo(0,0)}catch{};setTimeout(()=>{try{scrollTo(0,0)}catch{}},120)});
})();
