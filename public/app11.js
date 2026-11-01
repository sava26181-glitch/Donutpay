// v42: верификация продавца по SMS (Supabase Auth) вместо Telegram
(() => {
  Object.assign(ERR, {
    "sms not configured": "SMS-подтверждение пока не настроено на сервере",
    "bad phone": "Введите номер в формате +79991234567",
    "wrong code": "Неверный или просроченный код",
    "phone taken": "Этот номер уже используется",
    "already verified": "Вы уже прошли верификацию",
    "sms too often": "SMS можно запрашивать не чаще раза в минуту. Подождите и повторите",
    "too many sms attempts": "Слишком много запросов SMS. Попробуйте позже",
    "too many code attempts": "Слишком много попыток ввода кода. Подождите несколько минут",
    "sms service error": "Не удалось отправить SMS. Попробуйте позже",
  });
  const form = s => !s.configured
    ? `<div class="card"><b>Верификация временно недоступна</b><p class="m">SMS-сервис не настроен на сервере. Не хватает переменных окружения:</p><ul>${(s.missing || []).map(x => `<li><code>${esc(x)}</code></li>`).join("")}</ul></div>`
    : `<div class="card"><b>Подтвердите номер телефона</b><p class="m" style="margin:6px 0">Мы отправим SMS с кодом. Номер не показывается другим пользователям, сохраняются только последние 4 цифры. Один номер можно привязать только к одному аккаунту.</p>
<div id="sv1"><label for="svp">Номер телефона</label><input id="svp" type="tel" inputmode="tel" placeholder="+79991234567" autocomplete="tel" onkeydown="if(event.key==='Enter')svSend()"><button class="btn pri" style="width:100%;margin-top:10px" onclick="svSend()">Получить код</button></div>
<div id="sv2" hidden><label for="svc">Код из SMS</label><input id="svc" type="text" inputmode="numeric" maxlength="8" placeholder="123456" autocomplete="one-time-code" onkeydown="if(event.key==='Enter')svCheck()"><button class="btn pri" style="width:100%;margin-top:10px" onclick="svCheck()">Подтвердить</button><button id="svr" class="btn" style="width:100%;margin-top:8px" onclick="svSend()">Отправить код ещё раз</button><button class="btn" style="width:100%;margin-top:8px" onclick="svBack()">Изменить номер</button></div></div>`;
  window.verifyBox = v => `<h2>Верификация продавца</h2><div class="vstack">${v.verified ? `<div class="card"><b>Верификация пройдена</b><p class="m" style="margin:6px 0 0">Вы можете создавать объявления.</p><button class="btn pri wr" style="margin-top:10px" onclick="go('/sell')">Создать объявление</button></div>` : form(window._sms || { configured: true })}</div>`;
  window.verify = async function () {
    need();
    window._sms = await api("/verify/sms/status");
    return verifyBox({ verified: window._sms.verified }) + `<div class="card" style="margin-top:12px"><b>Кодекс продавца</b><p class="m" style="margin:6px 0 10px">Правила, которые продавец публично обязуется соблюдать. Подписанный кодекс обязателен для публикации лотов.</p><button class="btn wr" style="width:100%" onclick="go('/code')">Открыть Кодекс продавца</button></div>`;
  };
  let timer = null;
  const tick = () => {
    let left = 60; const b = $("#svr"); if (!b) return; b.disabled = true; clearInterval(timer);
    timer = setInterval(() => { const x = $("#svr"); if (!x) return clearInterval(timer); left--; x.textContent = left > 0 ? `Отправить код ещё раз (${left} с)` : "Отправить код ещё раз"; if (left <= 0) { clearInterval(timer); x.disabled = false } }, 1000);
  };
  const svSend = act(async () => {
    const p = $("#svp").value;
    await api("/verify/sms/send", { method: "POST", body: { phone: p } });
    $("#sv1").hidden = true; $("#sv2").hidden = false; $("#svc").focus(); toast("Код отправлен"); tick();
  });
  const svCheck = act(async () => {
    await api("/verify/sms/check", { method: "POST", body: { phone: $("#svp").value, code: $("#svc").value } });
    clearInterval(timer); ME = await api("/me"); toast("Номер подтверждён"); route();
  });
  const svBack = () => { clearInterval(timer); $("#sv2").hidden = true; $("#sv1").hidden = false; $("#svc").value = "" };
  Object.assign(window, { svSend, svCheck, svBack });
})();
