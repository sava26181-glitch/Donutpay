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
  const MOT={
    "Сообщения":`<g transform="translate(300 40)"><path d="M-46-24h60a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H-6l-16 14v-14h-24a12 12 0 0 1-12-12v-22a12 12 0 0 1 12-12z" fill="url(#GG)"/><circle cx="-30" cy="-1" r="3.4" fill="#4C1D95"/><circle cx="-16" cy="-1" r="3.4" fill="#4C1D95"/><circle cx="-2" cy="-1" r="3.4" fill="#4C1D95"/></g><g transform="translate(352 74) scale(.62)"><path d="M-46-24h60a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H-6l-16 14v-14h-24a12 12 0 0 1-12-12v-22a12 12 0 0 1 12-12z" fill="#F472B6" opacity=".9"/></g>`,
    "Финансы":`<g transform="translate(316 78)"><g id="GGc"><rect x="-36" y="2" width="72" height="14" fill="#4C1D95"/><ellipse cy="16" rx="36" ry="12" fill="#4C1D95"/><ellipse cy="2" rx="36" ry="12" fill="#7C3AED"/></g><g transform="translate(0 -14)"><rect x="-36" y="2" width="72" height="14" fill="#5B21B6"/><ellipse cy="16" rx="36" ry="12" fill="#5B21B6"/><ellipse cy="2" rx="36" ry="12" fill="#8B5CF6"/></g><g transform="translate(0 -28)"><rect x="-36" y="2" width="72" height="14" fill="#6D3FD6"/><ellipse cy="16" rx="36" ry="12" fill="#6D3FD6"/><ellipse cy="2" rx="36" ry="12" fill="url(#GG)"/><ellipse cy="2" rx="13" ry="4.4" fill="#2A1060"/><path d="M-26-1q6-6 14-7" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/></g></g><g transform="translate(364 44) rotate(-12)"><circle r="15" fill="#CA8A04"/><circle r="13" fill="#FDE047"/><circle r="9" fill="none" stroke="#CA8A04" stroke-width="2"/><path d="M-3 5V-5h4a2.6 2.6 0 0 1 0 5.2H-3" fill="none" stroke="#A16207" stroke-width="2" stroke-linecap="round"/></g>`,
    "Избранное":`<g transform="translate(318 46)"><path d="M0 34C-44 6-30-26-10-26c8 0 10 5 10 5s2-5 10-5c20 0 34 32-10 60z" fill="url(#GG)" transform="translate(0 -4)"/><path d="M-20-12c4-6 9-7 13-5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></g>`,
    "Заказы":`<g transform="translate(316 44)"><rect x="-30" y="-24" width="60" height="50" rx="10" fill="url(#GG)"/><path d="M-30-6h60" stroke="#4C1D95" stroke-width="3"/><path d="M-12 8l7 7 15-15" fill="none" stroke="#2A1060" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`};
  MOT["Мои заказы"]=MOT["Заказы"];
  const scene=t=>{
    const id="ds"+(n++),st=[[20,18,1.5],[58,40,1],[96,14,1.2],[140,30,.9],[188,12,1.4],[226,30,1],[262,10,1.1],[390,14,1.2],[170,50,.8]];
    const sp=[[60,26,20,"#F472B6"],[150,44,-30,"#5EEAD4"],[220,22,40,"#FDE047"],[262,58,-10,"#F472B6"],[392,96,30,"#5EEAD4"]];
    return `<svg viewBox="0 0 400 120" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F0724"/><stop offset=".55" stop-color="#2E1568"/><stop offset="1" stop-color="#6D3FD6"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDE9FE"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient><radialGradient id="${id}h" cx=".78" cy=".35" r=".55"><stop offset="0" stop-color="#C4B5FD" stop-opacity=".55"/><stop offset="1" stop-color="#C4B5FD" stop-opacity="0"/></radialGradient><linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0F0724" stop-opacity=".85"/><stop offset=".55" stop-color="#0F0724" stop-opacity="0"/></linearGradient></defs>
<rect width="400" height="120" fill="url(#${id}s)"/><rect width="400" height="120" fill="url(#${id}h)"/>${st.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".75"/>`).join("")}
<path d="M0 88C60 66 110 78 170 90S270 96 330 78 385 70 400 76V120H0Z" fill="#3A1C80" opacity=".8"/><path d="M0 98C70 84 130 94 200 100S330 90 400 94V120H0Z" fill="#241052"/><path d="M0 110C90 102 170 110 260 106S360 104 400 108V120H0Z" fill="#150A33"/>
<g class="dp-fl">${(MOT[t]||MOT["Сообщения"]).replace(/GG/g,id+"g")}</g>${sp.map(([x,y,a,c])=>`<rect x="${x-6}" y="${y-2}" width="12" height="4" rx="2" fill="${c}" opacity=".9" transform="rotate(${a} ${x} ${y})"/>`).join("")}<rect width="400" height="120" fill="url(#${id}l)"/></svg>`;
  };

  const homeScene=()=>{
    const id="dh"+(n++);
    const sp=[[300,184,-30,"#5EEAD4"],[392,184,-15,"#F472B6"],[262,14,30,"#5EEAD4"],[390,8,25,"#FDE047"]];
    const dots=[[270,30,1.4],[290,12,1],[380,26,1.3],[395,110,1],[250,60,1]];
    return `<svg class="dp-ps" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F0724"/><stop offset=".6" stop-color="#2E1568"/><stop offset="1" stop-color="#6D3FD6"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDE9FE"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient><radialGradient id="${id}h" cx=".82" cy=".38" r=".5"><stop offset="0" stop-color="#C4B5FD" stop-opacity=".6"/><stop offset="1" stop-color="#C4B5FD" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="200" fill="url(#${id}s)"/><rect width="400" height="200" fill="url(#${id}h)"/>${dots.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".75"/>`).join("")}
<path d="M0 150C70 126 130 140 200 152S320 160 400 138V200H0Z" fill="#3A1C80" opacity=".8"/><path d="M0 170C90 154 170 168 260 172S360 162 400 166V200H0Z" fill="#241052"/><path d="M0 188C100 180 200 190 400 184V200H0Z" fill="#150A33"/>
<g class="dp-fl"><g transform="translate(346 146) scale(.56)"><circle r="64" fill="#4C1D95"/><circle r="56" fill="url(#${id}g)"/><circle r="20" fill="#2A1060"/><path d="M-40-26A48 48 0 0 1-12-46" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/><rect x="-12" y="30" width="14" height="5" rx="2.5" fill="#F472B6" transform="rotate(30 -5 32)"/><rect x="26" y="-30" width="14" height="5" rx="2.5" fill="#5EEAD4" transform="rotate(-40 33 -28)"/><rect x="32" y="12" width="14" height="5" rx="2.5" fill="#FDE047" transform="rotate(60 39 14)"/><rect x="-44" y="-2" width="14" height="5" rx="2.5" fill="#fff" transform="rotate(-70 -37 0)"/><rect x="2" y="-48" width="14" height="5" rx="2.5" fill="#F472B6" transform="rotate(15 9 -46)"/></g></g>${sp.map(([x,y,a,c])=>`<rect x="${x-6}" y="${y-2}" width="12" height="4" rx="2" fill="${c}" opacity=".9" transform="rotate(${a} ${x} ${y})"/>`).join("")}</svg>`;
  };
  const promo=()=>{};
  const banner=()=>{
    const app=document.getElementById("app");if(!app||/^#\/m\/./.test(location.hash||""))return;
    let h=app.querySelector(".mm:not(.ch) .ml>h2")||app.querySelector(":scope>h2");const fh=app.querySelector(".fx-head");if(!h&&fh)h=fh.querySelector("h2");if(!h)return;const at=h.parentElement===fh?fh:h;
    const t=(h.textContent||"").trim(),c=BAN[t];if(!c||at.nextElementSibling?.classList?.contains("dp-ban"))return;
    at.insertAdjacentHTML("afterend",`<div class="dp-ban">${scene(t)}<b>${c[0]}</b><span>${c[1]}</span></div>`);
  };
  const skip=()=>{const h=location.hash||"#/";return h==="#/"||h===""||/^#\/(u|me|login|register)(\/|$)/.test(h)};
  const run=()=>{
    try{banner();promo()}catch{}
    if(skip())return;
    const app=document.getElementById("app");if(!app)return;
    const h=app.querySelector(":scope>h2");
    if(h&&!h.querySelector(".dp-t")){const s=document.createElement("span");s.className="dp-t";s.innerHTML=donut();h.prepend(s)}
  };
  new MutationObserver(thr(run)).observe(document.documentElement,{childList:true,subtree:true});run();
  addEventListener("hashchange",()=>{try{scrollTo(0,0)}catch{};setTimeout(()=>{try{scrollTo(0,0)}catch{}},120)});
})();
