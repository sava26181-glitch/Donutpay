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

  const banner=()=>{
    const app=document.getElementById("app");if(!app||/^#\/m\/./.test(location.hash||""))return;
    let h=app.querySelector(".mm:not(.ch) .ml>h2")||app.querySelector(":scope>h2");const fh=app.querySelector(".fx-head");if(!h&&fh)h=fh.querySelector("h2");if(!h)return;const at=h.parentElement===fh?fh:h;
    const t=(h.textContent||"").trim(),c=BAN[t];if(!c||at.nextElementSibling?.classList?.contains("dp-ban"))return;
    at.insertAdjacentHTML("afterend",`<div class="dp-ban">${scene(t)}<b>${c[0]}</b><span>${c[1]}</span></div>`);
  };
  const skip=()=>{const h=location.hash||"#/";return h==="#/"||h===""||/^#\/(u|me|login|register)(\/|$)/.test(h)};
  const run=()=>{
    try{banner()}catch{}
    if(skip())return;
    const app=document.getElementById("app");if(!app)return;
    const h=app.querySelector(":scope>h2");
    if(h&&!h.querySelector(".dp-t")){const s=document.createElement("span");s.className="dp-t";s.innerHTML=donut();h.prepend(s)}
  };
  new MutationObserver(thr(run)).observe(document.documentElement,{childList:true,subtree:true});run();
  addEventListener("hashchange",()=>{try{scrollTo(0,0)}catch{};setTimeout(()=>{try{scrollTo(0,0)}catch{}},120)});
  // персонал открывает обычную ссылку на заказ: показываем карточку заказа с полным чатом
  try{const op=window.orderPage;if(typeof op==="function")window.orderPage=async id=>{try{return await op(id)}catch(e){if(typeof isStaff==="function"&&isStaff()){setTimeout(()=>go("/admin?tab=order&id="+id),0);return""}throw e}}}catch{}

  // ---------- страница «Игры»: витрина с обложками и аккуратный список
  const ART=new Set("apex-legends brawl-stars chess clash-royale cs2 dota-2 ea-fc fortnite league-of-legends minecraft-pvp mobile-legends pubg-mobile rocket-league standoff-2 valorant".split(" "));
  const EXT={};try{fetch("/img/games/index.json").then(r=>r.json()).then(a=>{Object.keys(a).forEach(x=>{ART.add(x);EXT[x]=a[x]});window.GQ!==undefined&&document.getElementById("gl")&&typeof glist==="function"&&(document.getElementById("gl").innerHTML=glist())}).catch(()=>{})}catch{}
  const GRAD=[["#5B3FD0","#5B3FD0"],["#3A4A9A","#3A4A9A"],["#1F6F78","#1F6F78"],["#7A3C8C","#7A3C8C"],["#2F5FA8","#2F5FA8"],["#6B4A2F","#6B4A2F"]];
  const hs=t=>{let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))>>>0;return h};
  const mono=g=>{const [a,b]=GRAD[hs(g.slug||g.name)%GRAD.length],l=gs(g.name).trim().charAt(0).toUpperCase();return `<span class="gm" style="background:linear-gradient(135deg,${a},${b})">${esc(l)}</span>`};
  window.glist=function(){
    const q=GQ.toLowerCase(),a=GAMES.filter(g=>gk(g.name)!=="#"&&g.name.toLowerCase().includes(q)).sort((x,y)=>gs(x.name).localeCompare(gs(y.name),"ru"));
    if(!a.length)return empty("Игра не найдена. Проверьте запрос.");
    const L=[...new Set(a.map(g=>gk(g.name)))],pop=q?[]:GAMES.filter(g=>ART.has(g.slug));
    const top=pop.length?`<div class="gx-h">Популярные игры</div><div class="gx">${pop.map(g=>`<a class="gx-c" onclick="go('/catalog?game=${g.slug}')"><img src="/img/games/${g.slug}.${EXT[g.slug]||"webp"}" alt="" loading="lazy"><b>${esc(g.name)}</b></a>`).join("")}</div><div class="gx-h">Все игры</div>`:"";
    return top+`<nav class="ai">${L.map(l=>`<a onclick="azGo('${l}')">${l}</a>`).join("")}</nav>`+L.map(l=>`<div class="lh" id="L-${l}">${l}</div><div class="lgrid">${a.filter(g=>gk(g.name)===l).map(g=>`<div class="lr"><img class="gm" src="${ART.has(g.slug)?`/img/games/${g.slug}.${EXT[g.slug]||"webp"}`:cover(g.slug,g.name)}" alt="" loading="lazy"><div class="gt"><a class="gn" onclick="go('/catalog?game=${g.slug}')">${esc(g.name)}</a><div class="gcs">${(g.cats||[]).map(c=>`<a onclick="go('/catalog?game=${g.slug}&category=${c.slug}')">${esc(c.label)}</a>`).join("")}</div></div></div>`).join("")}</div>`).join("");
  };

  // ---------- обложки для всех игр: если картинки нет, рисуем свою (разный узор и цвет для каждой игры)
  const PAL=[["#3B1D8F","#8B5CF6"],["#1E3A8A","#3B82F6"],["#0F5C5C","#2DD4BF"],["#7A1F5C","#EC4899"],["#7C2D12","#FB923C"],["#14532D","#4ADE80"],["#4C1D95","#C084FC"],["#831843","#FB7185"],["#1E293B","#64748B"],["#713F12","#FACC15"],["#312E81","#818CF8"],["#064E3B","#34D399"]];
  const ini=n=>{const w=String(n).replace(/[^\p{L}\p{N} ]/gu," ").trim().split(/\s+/).filter(Boolean);return(w.length>1?w[0][0]+w[1][0]:(w[0]||"?").slice(0,2)).toUpperCase()};
  const cover=(slug,name)=>{
    const h=hs(slug),[a,b]=PAL[h%PAL.length],k=(h>>4)%5,r=(h>>8)%360,id="c"+(h%99999);
    let art="";
    if(k===0)art=[0,1,2,3].map(i=>`<circle cx="${40+i*8}" cy="${150-i*6}" r="${60+i*24}" fill="none" stroke="#fff" stroke-opacity=".${12-i*2}" stroke-width="10"/>`).join("");
    else if(k===1)art=[0,1,2,3,4,5].map(i=>`<rect x="${-60+i*52}" y="-20" width="22" height="260" fill="#fff" opacity=".07" transform="rotate(24 100 100)"/>`).join("");
    else if(k===2)art=[0,1,2].map(i=>`<path d="M100 ${10+i*34} l${60-i*14} ${60-i*10} l-${60-i*14} ${60-i*10} l-${60-i*14} -${60-i*10} z" fill="none" stroke="#fff" stroke-opacity=".${9-i*2}" stroke-width="5"/>`).join("");
    else if(k===3)art=Array.from({length:30},(_,i)=>`<circle cx="${(i%6)*38+10}" cy="${Math.floor(i/6)*38+10}" r="${(i*7+h)%3+2}" fill="#fff" opacity=".18"/>`).join("");
    else art=[0,1,2,3].map(i=>`<path d="M-10 ${50+i*38} q55 -${24+i*4} 110 0 t120 0" fill="none" stroke="#fff" stroke-opacity=".${14-i*2}" stroke-width="8"/>`).join("");
    const t=ini(name),fs=t.length>1?76:92;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="200" fill="url(#${id})"/>${art}<text x="100" y="${t.length>1?124:132}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="${fs}" fill="#fff" stroke="#14082e" stroke-opacity=".35" stroke-width="10" paint-order="stroke" stroke-linejoin="round" letter-spacing="-2">${t.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  };
  window.gameCover=cover;
  document.addEventListener("error",e=>{const i=e.target;if(!i||i.tagName!=="IMG"||i.dataset.cv)return;const m=/\/img\/games\/([^/?#]+?)\.(?:webp|png|jpe?g)/.exec(i.getAttribute("src")||"");if(!m)return;i.dataset.cv=1;const g=(window.GAMES||[]).find(x=>x.slug===m[1]);i.src=cover(m[1],g?g.name:m[1].replace(/-/g," "))},true);
})();
