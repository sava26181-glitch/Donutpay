// v60: язык сайта: русский / English. Переключатель в меню «…».
// Английский режим переводит интерфейс на лету: сначала встроенный словарь, незнакомые фразы переводятся бесплатным MyMemory и запоминаются в браузере.
(() => {
  const lang = () => { try { return localStorage.dp_ui === "en" ? "en" : "ru" } catch { return "ru" } };
  window.UI_LANG = lang;
  window.uiLang = l => { try { localStorage.dp_ui = l === "en" ? "en" : "ru"; localStorage.dp_lang = l === "en" ? "en" : "" } catch { } location.reload() };
  const flag = {
    ru: '<svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true"><rect width="24" height="16" rx="2.5" fill="#fff"/><rect y="5.33" width="24" height="5.34" fill="#0039A6"/><rect y="10.67" width="24" height="5.33" fill="#D52B1E"/><rect width="24" height="16" rx="2.5" fill="none" stroke="rgba(128,128,128,.45)"/></svg>',
    en: (() => { let r = ""; for (let i = 0; i < 7; i++) r += `<rect y="${(i * 2 * 16 / 13).toFixed(2)}" width="24" height="${(16 / 13).toFixed(2)}" fill="#B22234"/>`; return `<svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true"><rect width="24" height="16" rx="2.5" fill="#fff"/>${r}<rect width="10.5" height="8.6" fill="#3C3B6E"/><rect width="24" height="16" rx="2.5" fill="none" stroke="rgba(128,128,128,.45)"/></svg>` })(),
  };
  window.uiLangRow = () => { const l = lang(); return `<div class="umg umlg" data-notr="1"><span class="umlt">Language / Язык</span><div class="lgb"><a class="${l === "ru" ? "on" : ""}" onclick="uiLang('ru')">${flag.ru}<span>RU</span></a><a class="${l === "en" ? "on" : ""}" onclick="uiLang('en')">${flag.en}<span>EN</span></a></div></div>` };
  if (lang() !== "en") return;
  document.documentElement.lang = "en";

  const D = {
    // навигация и шапка
    "Главная": "Home", "Игры": "Games", "Избранное": "Favorites", "Сообщения": "Messages", "Профиль": "Profile", "Поиск игр и товаров": "Search games and items", "Войти": "Log in", "Регистрация": "Sign up", "Вход": "Log in",
    "Мой профиль": "My profile", "Мои объявления": "My listings", "Мои покупки": "My purchases", "Мои продажи": "My sales", "Финансы": "Finance", "Уведомления": "Notifications", "Турниры": "Tournaments", "Верификация продавца": "Seller verification", "Кодекс продавца": "Seller code",
    "Настройки": "Settings", "Поддержка": "Support", "Админ-панель": "Admin panel", "Выход": "Log out", "Поддержка и т.д": "Support",
    // главная
    "Дуэли магазинов": "Shop duels", "24 часа, призы": "24 hours, prizes", "Честные правила": "Fair rules", "Найти игру": "Find a game", "Всего игр для турниров: {n}": "Games with tournaments: {n}", "Новости": "News", "Добавить новость": "Add news", "Новостей пока нет.": "No news yet.", "Идут турниры:": "Tournaments now:",
    "Создать объявление": "Create listing", "Показать ещё": "Show more", "Сбросить": "Reset", "Закрыть": "Close", "Отмена": "Cancel", "Сохранить": "Save", "Отменить": "Cancel", "Удалить": "Delete", "Подтвердить": "Confirm", "Отправить": "Send", "Назад": "Back", "Далее": "Next", "Готово": "Done", "Копировать": "Copy", "Редактировать": "Edit", "Изменить": "Change", "Добавить": "Add", "Найти": "Search", "Открыть": "Open", "Продолжить": "Continue", "Да": "Yes", "Нет": "No",
    // подвал
    "Политика конфиденциальности": "Privacy policy", "Пользовательское соглашение": "Terms of service", "Правила маркетплейса": "Marketplace rules", "Правила покупателей": "Buyer rules", "Правила продавцов": "Seller rules", "Контакты": "Contacts", "ИНН {n}": "Tax ID {n}",
    // игры и каталог
    "Поиск по названию": "Search by name", "Каталог": "Catalog", "Все игры": "All games", "Все категории": "All categories", "Цена от": "Price from", "Цена до": "Price to", "Сначала новые": "Newest first", "Сначала дешёвые": "Cheapest first", "Сначала дорогие": "Most expensive first", "По рейтингу продавца": "By seller rating",
    "Ничего не найдено. Измените фильтры или запрос.": "Nothing found. Change the filters or the query.", "Игра не найдена. Проверьте запрос.": "Game not found. Check your query.", "Золото / Кристаллы": "Gold / Crystals", "Золото": "Gold", "Аккаунты": "Accounts", "Предметы": "Items", "Услуги": "Services", "Прочее": "Other", "Ключи": "Keys", "Сообщества": "Communities", "Каналы": "Channels", "Game Pass": "Game Pass", "Офлайн активации": "Offline activations",
    "Рейтинг": "Rating", "Цена": "Price", "Купить": "Buy", "Купить сейчас": "Buy now", "В наличии": "In stock", "Продавец": "Seller", "Описание": "Description", "Отзывы": "Reviews", "Объявления": "Listings", "О пользователе": "About", "Нет активных объявлений.": "No active listings.", "Написать": "Message", "Написать продавцу": "Message the seller", "Редактировать профиль": "Edit profile",
    "Пользователь пока ничего не рассказал о себе.": "This user hasn't shared anything yet.", "Продано товаров": "Items sold", "На сайте с": "Member since", "Скорость ответа": "Response speed", "Избранных пока нет.": "No favorites yet.",
    // авторизация
    "Email": "Email", "Пароль": "Password", "Имя пользователя": "Username", "Создать аккаунт": "Create account", "Забыли пароль?": "Forgot your password?", "Уже есть аккаунт? Войти": "Already have an account? Log in", "Сброс пароля": "Password reset", "Код двухэтапной аутентификации": "Two-factor authentication code", "Минимум 8 символов": "At least 8 characters", "3–24 символа": "3–24 characters", "Хочу продавать и подписываю": "I want to sell and I sign the",
    "Неверный email или пароль": "Wrong email or password", "Войдите в аккаунт": "Log in to your account", "Проверьте введённые данные": "Check the data you entered", "Показать пароль": "Show password",
    "Войдите, чтобы участвовать": "Log in to take part", "Войдите, чтобы подписать": "Log in to sign", "Войдите, чтобы присоединиться": "Log in to join",
    // настройки
    "Оформление": "Appearance", "Фон и цвет акцента действуют на всём сайте.": "Background and accent color apply to the whole site.", "Фон сайта": "Site background", "Тёмная": "Dark", "Белая": "White", "Синяя": "Blue", "Красная": "Red", "Зелёная": "Green", "Графит": "Graphite", "Акцент": "Accent", "Звуки": "Sounds", "Сообщения, уведомления и сделки.": "Messages, notifications and deals.", "Включить звуки": "Enable sounds", "Громкость": "Volume", "Мелодия уведомления": "Notification tone",
    "Клавиатура в чате": "Chat keyboard", "Настройки сохранены": "Settings saved", "Показывать": "Show", "Скрыть": "Hide", "Колокольчик": "Bell", "Маримба": "Marimba", "Монета": "Coin", "Стекло": "Glass", "Арпеджио": "Arpeggio", "Перезвон": "Chime", "Пинг": "Ping", "Безопасность": "Security", "Смена пароля": "Change password", "Текущий пароль": "Current password", "Новый пароль": "New password", "Повторите пароль": "Repeat password",
    "Двухэтапная аутентификация": "Two-factor authentication", "Подтвердить и включить": "Confirm and enable", "Копировать ключ": "Copy key", "Открыть в приложении": "Open in app",
    // профиль / редактор
    "Основное": "Basics", "Расположение элементов": "Layout", "Сбросить оформление": "Reset appearance", "Аватар": "Avatar", "Обложка": "Cover", "Аватар сохранён": "Avatar saved", "Оформление профиля": "Profile appearance",
    // верификация
    "Верификация пройдена": "Verification complete", "Получите код": "Get a code", "Получить код": "Get code", "Отправьте код боту": "Send the code to the bot", "Открыть бота": "Open bot", "Копировать код": "Copy code", "Код скопирован": "Code copied", "Пройти верификацию": "Verify now", "Нужна верификация продавца": "Seller verification required", "Нужна один раз, чтобы публиковать объявления.": "Needed once, to publish listings.",
    "Код действует 15 минут и привязан к вашему аккаунту.": "The code is valid for 15 minutes and is tied to your account.", "Нажмите в боте «Старт». Если Telegram не передал код, отправьте боту": "Press “Start” in the bot. If Telegram did not pass the code, send the bot", "Страница обновится сама, как только бот подтвердит код.": "The page will update by itself once the bot confirms the code.", "Верификация временно недоступна": "Verification is temporarily unavailable",
    "Ваш Telegram подтверждён. Можно создавать объявления.": "Your Telegram is confirmed. You can create listings.",
    // финансы / заказы
    "Баланс": "Balance", "Баланс DonutPay": "DonutPay balance", "Баланс пополнен": "Balance topped up", "Пополнить": "Top up", "Вывести": "Withdraw", "Заказы": "Orders", "Заказ": "Order", "Мои заказы": "My orders", "Оплатить": "Pay", "Статус": "Status", "Завершён": "Completed", "Отменён": "Cancelled", "Спор": "Dispute", "Открыть спор": "Open dispute", "Подтвердить получение": "Confirm receipt", "Оставить отзыв": "Leave a review",
    "Недостаточно средств на балансе. Пополните баланс в разделе «Финансы»": "Not enough funds. Top up your balance in “Finance”", "Отзывов пока нет.": "No reviews yet.", "Сообщений пока нет.": "No messages yet.", "Написать сообщение...": "Write a message...", "Напишите сообщение": "Write a message", "Нет уведомлений.": "No notifications.",
    // турниры
    "Выберите игру: внутри каждой свои актуальные турниры, участники и создание нового турнира.": "Choose a game: each one has its own current tournaments, players and tournament creation.", "← Все игры": "← All games", "Создать турнир": "Create tournament", "Актуальные": "Current", "Завершённые": "Finished", "Сейчас нет актуальных турниров по этой игре.": "No current tournaments for this game.",
    "Набор открыт": "Registration open", "Идёт": "In progress", "Закреплён": "Pinned", "Новый турнир": "New tournament", "Название": "Title", "Например, Кубок выходного дня": "For example, Weekend Cup", "Игра": "Game", "Формат": "Format", "Число мест": "Slots", "Взнос, ₽": "Entry fee, ₽", "Начало": "Start", "Призы": "Prizes", "Сколько призовых мест": "How many prize places", "Дополнительно": "Additional", "Условия": "Rules",
    "Правила матчей, регламент, ограничения": "Match rules, regulations, restrictions", "Участвовать": "Join", "Выйти из турнира": "Leave tournament", "Мест нет": "No slots left", "Бесплатно": "Free", "Взнос": "Entry fee", "Игроки": "Players", "Организатор": "Organizer", "Участники": "Participants", "Пока никто не записался.": "Nobody has joined yet.", "Чат турнира": "Tournament chat", "Загрузка...": "Loading...",
    "Сообщение участникам и организатору": "Message to participants and organizer", "Сообщений пока нет. Напишите первым.": "No messages yet. Be the first to write.", "Начать турнир": "Start tournament", "Завершить и выбрать победителя": "Finish and choose winner", "Отменить турнир": "Cancel tournament", "Добавить помощника": "Add helper", "Помощники:": "Helpers:", "Удалить турнир": "Delete tournament", "Закрепить": "Pin", "Открепить": "Unpin",
    "Турнир завершён": "Tournament finished", "Турнир отменён": "Tournament cancelled", "Взносы возвращены участникам.": "Entry fees were returned to the players.", "Итоги турнира": "Tournament results", "Лучшие моменты": "Best moments", "Смотреть видео": "Watch video", "Добавить картинку итогов": "Add results picture", "Добавить фото или видео": "Add photo or video", "Правила турниров": "Tournament rules",
    "Участие в турнире": "Tournament entry", "Ваш ник в игре": "Your in-game nickname", "ID или тег игрока": "Player ID or tag", "Записаться": "Join", "Оплатить и записаться": "Pay and join", "Вы записаны": "You are registered", "Вы вышли из турнира": "You left the tournament", "Турнир создан": "Tournament created", "Турнир начался": "Tournament started", "Турнир завершён.": "Tournament finished.", "Завершить турнир": "Finish tournament", "Подтвердить и закрыть турнир": "Confirm and close tournament",
    "Выберите игрока": "Select a player", "Помощник организатора": "Organizer's helper", "Помощник добавлен": "Helper added", "Добавлено": "Added", "Закреплён.": "Pinned.", "Откреплён": "Unpinned", "Турнир удалён": "Tournament deleted", "Для старта нужно минимум 2 участника.": "At least 2 players are needed to start.", "Регистрация закрыта или турнир уже идёт": "Registration is closed or the tournament has started", "В турнире нет свободных мест": "No free slots in the tournament", "Вы уже записаны на этот турнир": "You are already registered for this tournament",
    "Чат закрыт": "Chat closed", "Сообщение: от 1 до 500 символов": "Message: 1 to 500 characters", "Такой игры нет в списке турниров.": "This game is not in the tournament list.", "Сейчас": "Now",
    // общие сообщения
    "Загрузка": "Loading", "Ошибка": "Error", "Что-то пошло не так": "Something went wrong", "Слишком много запросов. Попробуйте позже": "Too many requests. Try again later", "Не найдено": "Not found", "Доступ запрещён": "Access denied", "Скопируйте код вручную": "Copy the code manually", "Скопировано": "Copied",
    "Все": "All", "Новые": "New", "Старые": "Old", "Онлайн": "Online", "Не в сети": "Offline", "В сети": "Online", "Тест": "Test",
    "Админ": "Admin", "Модератор": "Moderator", "Владелец": "Owner", "Администратор": "Administrator", "Пользователь": "User", "Организатор турниров": "Tournament organizer", "Администрация": "Administration",
    "Мои сообщения": "My messages", "Чаты": "Chats", "Нет диалогов.": "No conversations.", "Избранное.": "Favorites.", "Обращения": "Tickets", "Создать обращение": "Create ticket", "Правила": "Rules", "Акции": "Promotions", "Распродажа": "Sale", "Автовыдача": "Auto-delivery", "Безопасная сделка": "Safe deal",
  };
  const MON = { января: "January", февраля: "February", марта: "March", апреля: "April", мая: "May", июня: "June", июля: "July", августа: "August", сентября: "September", октября: "October", ноября: "November", декабря: "December" };
  const CY = /[А-Яа-яЁё]/;
  const norm = s => { const n = []; const k = s.replace(/\d+(?:[.,]\d+)?/g, m => { n.push(m); return "{n}" }); return [k, n] };
  const fill = (v, n) => { let i = 0; return v.replace(/\{n\}/g, () => n[i++] ?? "") };
  let CACHE = {}; try { CACHE = JSON.parse(localStorage.dp_trc || "{}") } catch { }
  const saveCache = (() => { let t = 0; return () => { clearTimeout(t); t = setTimeout(() => { try { const k = Object.keys(CACHE); if (k.length > 1500) k.slice(0, k.length - 1200).forEach(x => delete CACHE[x]); localStorage.dp_trc = JSON.stringify(CACHE) } catch { } }, 800) } })();
  const dict = core => {
    const [k, n] = norm(core);
    if (D[core] != null) return D[core];
    if (D[k] != null) return fill(D[k], n);
    if (CACHE[core] != null) return CACHE[core];
    if (/(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/.test(core) && /^[\d\sа-яё:,.в]+$/i.test(core)) return core.replace(/(\d{1,2}) ([а-яё]+)( в)?/gi, (m, d, mo, v) => MON[mo.toLowerCase()] ? `${MON[mo.toLowerCase()]} ${d}${v ? " at" : ""}` : m);
    return null;
  };
  window.uiTr = text => { const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim(); if (!core || !CY.test(core)) return text; const v = dict(core); return v == null ? text : lead + v + trail };
  const oc = window.confirm.bind(window), oa = window.alert.bind(window);
  window.confirm = m => oc(window.uiTr(String(m))); window.alert = m => oa(window.uiTr(String(m)));

  // фоновый перевод незнакомых фраз
  const pending = new Map(); let running = 0;
  const pump = () => {
    while (running < 2 && pending.size) {
      const [core, cbs] = pending.entries().next().value; pending.delete(core); running++;
      (typeof trClient === "function" ? trClient(core, "en") : Promise.reject()).then(r => { if (r && r.translated && !r.same) { CACHE[core] = r.translated; saveCache(); cbs.forEach(f => f(r.translated)) } else { CACHE[core] = core; saveCache() } }).catch(() => { }).finally(() => { running--; setTimeout(pump, 150) });
    }
  };
  const later = (core, cb) => { if (core.length < 2 || core.length > 1200) return; if (pending.has(core)) pending.get(core).push(cb); else pending.set(core, [cb]); pump() };
  const SKIP = "script,style,textarea,code,pre,.bt,.bub,.bbi,.nt,.nick,.tpa,.vfcode,.kcode,[data-notr],[contenteditable]";
  const doText = node => {
    const v = node.nodeValue; if (!v || !CY.test(v)) return;
    const p = node.parentElement; if (!p || p.closest(SKIP)) return;
    const core = v.trim(), d = dict(core);
    if (d != null) { if (d !== core) node.nodeValue = v.replace(core, d) } else later(core, t => { if (node.isConnected && node.nodeValue.trim() === core) node.nodeValue = node.nodeValue.replace(core, t) });
  };
  const ATTR = ["placeholder", "title", "aria-label", "alt"];
  const doEl = el => {
    if (el.closest && el.closest(SKIP)) return;
    for (const a of ATTR) { const v = el.getAttribute && el.getAttribute(a); if (v && CY.test(v)) { const d = dict(v.trim()); if (d != null) el.setAttribute(a, d); else later(v.trim(), t => el.setAttribute(a, t)) } }
  };
  const scan = root => {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doEl(root); root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach(doEl);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = []; while ((n = w.nextNode())) list.push(n); list.forEach(doText);
  };
  const start = () => {
    scan(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") doText(m.target); else m.addedNodes.forEach(scan) } }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
