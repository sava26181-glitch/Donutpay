/* DonutPay: пончик у заголовков и в пустых состояниях на внутренних страницах (не на главной и не в профилях) */
(function(){
  const thr=f=>{let l=0;return()=>{l||(l=1,requestAnimationFrame(()=>{l=0;try{f()}catch{}}))}};
  let n=0;
  const donut=()=>{
    const id="dg"+(n++),sp=[[-30,-18,30,"#F472B6"],[-6,-36,-40,"#5EEAD4"],[26,-26,50,"#FDE047"],[36,6,-10,"#fff"],[22,32,60,"#F472B6"],[-12,36,20,"#5EEAD4"],[-34,16,-50,"#FDE047"],[-38,-4,70,"#fff"]];
    const r=sp.map(([x,y,a,c])=>`<rect x="${50+x-4.5}" y="${50+y-1.6}" width="9" height="3.2" rx="1.6" fill="${c}" transform="rotate(${a} ${50+x} ${50+y})"/>`).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><circle cx="50" cy="50" r="33" fill="none" stroke="#4C1D95" stroke-width="30"/><circle cx="50" cy="50" r="33" fill="none" stroke="url(#${id})" stroke-width="25"/><path d="M22 36A32 32 0 0 1 42 20" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>${r}</svg>`;
  };

  // баннер-пейзаж: сумерки, пончик-луна, холмы и посыпка
  const BAN={"Сообщения":["Ваши диалоги","Покупатели и продавцы пишут сюда"],"Финансы":["Ваш баланс","Деньги, выводы и история операций"],"Избранное":["Ваше избранное","Лоты, за ценой которых вы следите"],"Заказы":["Ваши заказы","Статус каждой покупки и продажи"],"Мои заказы":["Ваши заказы","Статус каждой покупки и продажи"]};
  const scene=()=>{
    const id="ds"+(n++),st=[[20,18,1.6],[58,40,1.1],[96,14,1.3],[140,34,1],[188,12,1.5],[226,30,1.1],[262,10,1.2],[364,16,1.4],[384,52,1],[170,52,.9]];
    const sp=[[60,26,20,"#F472B6"],[150,44,-30,"#5EEAD4"],[220,22,40,"#FDE047"],[262,60,-10,"#F472B6"],[380,100,30,"#5EEAD4"]];
    return `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#150B2B"/><stop offset=".6" stop-color="#3B1D7A"/><stop offset="1" stop-color="#7C3AED"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DDD6FE"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
<rect width="400" height="120" fill="url(#${id}s)"/>${st.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".8"/>`).join("")}
<g transform="translate(318 44)"><circle r="31" fill="#4C1D95"/><circle r="27" fill="url(#${id}g)"/><circle r="10" fill="#2A1060"/><path d="M-20-12A24 24 0 0 1-6-22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/><rect x="-6" y="14" width="7" height="2.6" rx="1.3" fill="#F472B6" transform="rotate(30 -2 15)"/><rect x="12" y="-14" width="7" height="2.6" rx="1.3" fill="#5EEAD4" transform="rotate(-40 15 -13)"/><rect x="16" y="6" width="7" height="2.6" rx="1.3" fill="#FDE047" transform="rotate(60 19 7)"/></g>
<path d="M0 92C50 74 96 80 150 90S260 98 320 82 380 78 400 84V120H0Z" fill="#2A1457"/><path d="M0 106C70 92 130 100 200 104S330 96 400 100V120H0Z" fill="#170A33"/>${sp.map(([x,y,a,c])=>`<rect x="${x-6}" y="${y-2}" width="12" height="4" rx="2" fill="${c}" opacity=".9" transform="rotate(${a} ${x} ${y})"/>`).join("")}</svg>`;
  };
  const banner=()=>{
    const app=document.getElementById("app");if(!app||/^#\/m\/./.test(location.hash||""))return;
    let h=app.querySelector(".mm:not(.ch) .ml>h2")||app.querySelector(":scope>h2");const fh=app.querySelector(".fx-head");if(!h&&fh)h=fh.querySelector("h2");if(!h)return;const at=h.parentElement===fh?fh:h;
    const t=(h.textContent||"").trim(),c=BAN[t];if(!c||at.nextElementSibling?.classList?.contains("dp-ban"))return;
    at.insertAdjacentHTML("afterend",`<div class="dp-ban">${scene()}<b>${c[0]}</b><span>${c[1]}</span></div>`);
  };
  const skip=()=>{const h=location.hash||"#/";return h==="#/"||h===""||/^#\/(u|me|login|register)(\/|$)/.test(h)};
  const run=()=>{
    try{banner()}catch{}
    if(skip())return;
    const app=document.getElementById("app");if(!app)return;
    const h=app.querySelector(":scope>h2");
    if(h&&!h.querySelector(".dp-t")){const s=document.createElement("span");s.className="dp-t";s.innerHTML=donut();h.prepend(s)}
    app.querySelectorAll('.card.m[style*="text-align:center"]').forEach(c=>{if(c.querySelector(".dp-e"))return;const s=document.createElement("span");s.className="dp-e";s.innerHTML=donut();c.prepend(s)});
  };
  new MutationObserver(thr(run)).observe(document.documentElement,{childList:true,subtree:true});run();
  addEventListener("hashchange",()=>{try{scrollTo(0,0)}catch{};setTimeout(()=>{try{scrollTo(0,0)}catch{}},120)});
})();
