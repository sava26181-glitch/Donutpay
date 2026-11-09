// v68: безопасность сделок: видео-верификация (лицо и паспорт), страница «Проверка личности», проверка видео в админке
(() => {
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rub = n => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
  const dt = d => new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // тексты уведомлений
  try {
    NT6.kyc_need = n => `Заказ #${n.number} заморожен на проверку. Загрузите видео с лицом и паспортом`;
    NT6.kyc_ok = n => n.number ? `Личность подтверждена, заказ #${n.number} можно оплатить` : "Личность подтверждена: вывод без заморозки";
    NT6.kyc_no = n => `Верификация отклонена${n.note ? ": " + n.note : ""}${n.number ? ". Заказ #" + n.number + " отменён" : ""}`;
  } catch { }

  const HOW = `<ol class="kyc-how"><li>Снимите видео 10–40 секунд.</li><li>Покажите лицо и скажите вслух свой ник и сегодняшнюю дату.</li><li>Покажите открытый паспорт со страницей, где фото. Серию и номер можно прикрыть пальцем.</li></ol>`;
  window.kycBox = (id) => `<div class="kyc-box" id="kb-${id}">${HOW}<input type="file" id="kf-${id}" accept="video/*" capture="user" hidden onchange="kycSend('${id}',this.files[0])"><button class="btn pri big" style="width:100%" onclick="document.getElementById('kf-${id}').click()">Снять или выбрать видео</button><small class="m" style="display:block;margin-top:8px">Видео видит только администратор. Оно нужно один раз, чтобы сверить лицо с фото в паспорте.</small></div>`;
  window.kycSend = (id, f) => {
    if (!f) return; const box = document.getElementById("kb-" + id); if (!box) return;
    if (f.size > 38e6) { toast("Видео слишком большое: до 38 МБ. Снимите короче"); return }
    box.innerHTML = `<div class="achip"><span class="cb"><b>Загрузка видео</b><small class="m" id="kpc">0%</small></span></div>`;
    const x = new XMLHttpRequest(); x.open("POST", `/api/kyc/${id}/video`); x.setRequestHeader("Content-Type", "application/octet-stream");
    x.upload.onprogress = e => { if (e.lengthComputable) { const el = document.getElementById("kpc"); if (el) el.textContent = Math.round(e.loaded / e.total * 100) + "%" } };
    x.onload = () => { let r = {}; try { r = JSON.parse(x.responseText) } catch { }
      if (x.status >= 200 && x.status < 300) { toast("Видео отправлено на проверку"); document.getElementById("md")?.remove(); route() }
      else { toast(r.error || "Не удалось загрузить видео"); box.outerHTML = window.kycBox(id) } };
    x.onerror = () => { toast("Нет соединения, попробуйте ещё раз"); box.outerHTML = window.kycBox(id) };
    x.send(f);
  };
  // окно после заморозки заказа
  window.kycModal = r => {
    const wait = r.kyc_status === "submitted";
    mdl(`<h3 style="margin:0 0 4px">Заказ #${E(r.number || "")} заморожен на проверку</h3>
<p class="m" style="margin:0 0 10px">${wait ? "Видео уже отправлено. Администратор проверит его, мы сообщим. Деньги пока не списаны." : "Ваш аккаунт новый, а сумма заказа большая. Чтобы защитить обе стороны сделки, нужна видео-верификация. Деньги пока не списаны."}</p>
${wait ? `<button class="btn big" style="width:100%" onclick="document.getElementById('md').remove();go('/orders')">К заказам</button>` : window.kycBox(r.kyc_id)}`);
  };

  // страница «Проверка личности»
  window.identityPage = async () => {
    need(); const d = await api("/kyc/mine"), open = d.requests.find(r => r.status === "need" || r.status === "submitted"), last = d.requests[0];
    let body;
    if (d.verified) body = `<div class="card kyc-ok"><b>Личность подтверждена</b><p class="m" style="margin:4px 0 0">${dt(d.verified_at)}. Деньги за продажи приходят без заморозки, вывод доступен сразу. Заказы не отправляются на проверку.</p></div>`;
    else if (open && open.status === "submitted") body = `<div class="card"><b>Видео на проверке</b><p class="m" style="margin:4px 0 0">Отправлено ${dt(open.submitted_at)}. Обычно проверка занимает до суток, мы пришлём уведомление.</p></div>`;
    else if (open) body = `<div class="card"><b>${E(open.kind === "order" ? "Заказ #" + open.order_number + " заморожен: " + (open.reason || "") : "Загрузите видео")}</b><div style="margin-top:10px">${window.kycBox(open.id)}</div></div>`;
    else body = `${last && last.status === "rejected" ? `<div class="card" style="border-color:#7a2b3a"><b>Прошлая проверка отклонена</b><p class="m" style="margin:4px 0 0">${E(last.note || "Причина не указана")}. Можно попробовать ещё раз.</p></div>` : ""}<div class="card"><p style="margin:0 0 10px">Без верификации деньги за продажи замораживаются на ${d.hold_hours} ч. После подтверждения лица и паспорта выплаты и вывод идут без заморозки.</p><button class="btn pri big" style="width:100%" onclick="kycBegin()">Пройти верификацию</button></div>`;
    return `<h2>Проверка личности</h2><p class="m" style="margin-top:-4px">Лицо и паспорт на видео. Нужно один раз.</p>${body}`;
  };
  window.kycBegin = act(async () => { await api("/kyc/start", { method: "POST" }); route() });

  // админка: видео-верификации
  const tabs = t => window.adTabs ? window.adTabs(t) : "";
  window.adKyc = async () => {
    const rs = await api("/admin/kyc");
    return `<h2>Админ-панель</h2>${tabs("kyc")}` + (rs.map(r => `<div class="card" id="kc-${r.id}"><div class="row bet"><b>${E(r.username)}</b><span class="m">${dt(r.submitted_at || r.created_at)}</span></div>
<div class="m" style="margin:2px 0 6px">${r.kind === "order" ? `Заказ #${r.order_number}, ${rub(r.total_cents / 100)}. ` : "По желанию пользователя. "}Покупок завершено: ${r.done}. ${E(r.reason || "")}</div>
${r.status === "submitted" ? `<div class="row" style="flex-wrap:wrap"><button class="btn sm" onclick="kycWatch('${r.id}')">Смотреть видео</button></div>
<div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="kname-${r.id}" placeholder="Фамилия и имя по паспорту" maxlength="80" autocomplete="off" style="margin:0"><button class="btn sm pri" onclick="kycDo('${r.id}','approve')">Подтвердить</button></div>
<div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="kn-${r.id}" placeholder="Причина отказа" maxlength="300" style="margin:0"><button class="btn sm" onclick="kycDo('${r.id}','reject')">Отклонить</button></div>` : `<span class="m">Ждём видео от пользователя</span>`}</div>`).join("") || `<div class="card m">Видео на проверку нет.</div>`);
  };
  window.kycWatch = act(async id => { const r = await api(`/kyc/${id}/url`); mdl(`<video src="${E(r.url)}" controls playsinline autoplay style="width:100%;max-height:70vh;border-radius:12px;background:#000"></video><button class="btn big" style="width:100%;margin-top:10px" onclick="document.getElementById('md').remove()">Закрыть</button>`) });
  window.kycDo = act(async (id, action) => {
    const note = (document.getElementById("kn-" + id)?.value || "").trim(), name = (document.getElementById("kname-" + id)?.value || "").trim();
    if (action === "reject" && note.length < 3) { toast("Напишите причину отказа"); return }
    if (action === "approve" && name.split(/\s+/).length < 2) { toast("Впишите фамилию и имя по паспорту: по ним сверяется получатель при выводе"); return }
    const r = await api("/admin/kyc/" + id, { method: "POST", body: { action, note, name } });
    toast(action === "approve" ? "Подтверждено" + (r.released ? ", холды сняты: " + r.released : "") : "Отклонено"); route();
  });
})();
