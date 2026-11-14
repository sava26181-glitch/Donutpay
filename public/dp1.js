/* DonutPay: оформление главного блока и мелкие улучшения навигации */
(function(){
  const thr=f=>{let l=0;return()=>{l||(l=1,requestAnimationFrame(()=>{l=0;try{f()}catch{}}))}};
  // пончик с глазурью и посыпкой
  const donut=()=>{
    const sp=[[-48,-52,24,"#F472B6"],[10,-70,-30,"#5EEAD4"],[58,-40,58,"#FDE047"],[70,6,10,"#FFFFFF"],[40,56,-40,"#F472B6"],[-6,70,20,"#5EEAD4"],[-60,34,-60,"#FDE047"],[-72,-8,30,"#FFFFFF"],[-30,-20,70,"#FDE047"],[34,-10,-20,"#5EEAD4"],[-14,44,50,"#FFFFFF"],[20,28,0,"#F472B6"]];
    const r=sp.map(([x,y,a,c])=>`<rect x="${x-6}" y="${y-2}" width="12" height="4" rx="2" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join("");
    return `<svg viewBox="-110 -110 220 220" aria-hidden="true"><defs><radialGradient id="dpg" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="#DDD6FE"/><stop offset=".55" stop-color="#8B5CF6"/><stop offset="1" stop-color="#6D28D9"/></radialGradient></defs>
<path fill="#4C1D95" fill-rule="evenodd" d="M0-98a98 98 0 1 0 .01 0zM0-34a34 34 0 1 1-.01 0z"/>
<path fill="url(#dpg)" fill-rule="evenodd" d="M-2-92c14 4 24-6 40 0 18 7 28-2 46 16 14 14 4 28 10 44 6 16-8 26-6 44-2 18-18 24-34 32-14 8-26 14-42 10-16 4-30-6-44-14-14-8-28-16-30-34-4-16-14-24-6-42 6-14-4-28 8-42 10-14 32-8 58-14zM0-32a32 32 0 1 1-.01 0z"/>
<ellipse cx="-44" cy="-52" rx="22" ry="9" fill="#fff" opacity=".35" transform="rotate(-38 -44 -52)"/>${r}</svg>`;
  };
  // стекающая глазурь по верхнему краю
  const drip=()=>{let d="M0 0L0 6",x=0,i=0;const w=[26,18,34,22,30,16,28,20,36,24,18,30],hh=[12,22,15,24,13,20,17,23];while(x<400){const k=Math.min(w[i%w.length],400-x),h=hh[i%hh.length];d+=` L${x} 6c0 ${h*1.3} ${k} ${h*1.3} ${k} 0`;x+=k;i++}d+=" L400 0Z";return `<svg viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="dpd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><path d="${d}" fill="url(#dpd)"/></svg>`};
  const put=()=>{const p=document.querySelector(".promo");if(!p||p.querySelector(".dp-art"))return;const a=document.createElement("div");a.className="dp-art";a.innerHTML=donut();const d=document.createElement("div");d.className="dp-drip";d.innerHTML=drip();p.prepend(d,a)};
  new MutationObserver(thr(put)).observe(document.documentElement,{childList:true,subtree:true});put();
  // переход между вкладками всегда начинается сверху
  const up=()=>{try{scrollTo(0,0)}catch{}};addEventListener("hashchange",()=>{up();setTimeout(up,120)});
})();
