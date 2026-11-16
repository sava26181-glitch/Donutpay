// Напоминание покупателю: заказ оплачен, но выполнение не подтверждено. Раз в час в уведомления (и в Telegram, если привязан).
export default function routesRemind(app, { q, hooks }) {
  const EVERY_MS = 3600e3, MAX = 72; // не больше 72 напоминаний на заказ (3 суток)
  q("alter table orders add column if not exists last_remind_at timestamptz").then(() => q("alter table orders add column if not exists remind_count int not null default 0")).catch(e => console.warn("[remind]", e.message));
  let busy = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try {
      const rows = await q(`select o.id,o.number,o.buyer_id,u.telegram_id from orders o join users u on u.id=o.buyer_id
        where o.status in ('paid','in_progress') and o.updated_at < now()-interval '1 hour' and (o.last_remind_at is null or o.last_remind_at < now()-interval '1 hour') and o.remind_count < $1 limit 200`, [MAX]);
      for (const o of rows) {
        await q("delete from notifications where user_id=$1 and type='confirm_reminder' and payload->>'id'=$2", [o.buyer_id, String(o.id)]).catch(() => { });
        await q("insert into notifications(user_id,type,payload) values($1,'confirm_reminder',$2)", [o.buyer_id, { id: o.id, number: o.number }]).catch(() => { });
        await q("update orders set last_remind_at=now(), remind_count=remind_count+1 where id=$1", [o.id]).catch(() => { });
        if (o.telegram_id && process.env.TELEGRAM_BOT_TOKEN && hooks.tgSend) hooks.tgSend(o.telegram_id, `Заказ #${o.number} оплачен. Если вы получили товар, подтвердите выполнение заказа на сайте, иначе продавец не получит деньги.`).catch(() => { });
      }
    } catch (e) { console.warn("[remind]", e.message) } finally { busy = false }
  };
  setTimeout(tick, 60e3); setInterval(tick, 5 * 60e3).unref?.();
}
