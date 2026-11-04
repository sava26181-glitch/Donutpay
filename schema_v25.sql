-- v25: платные турниры (взнос списывается с баланса, при неявке не возвращается)
alter table tournaments add column if not exists entry_fee numeric(10,2) not null default 0 check(entry_fee>=0 and entry_fee<=100000);
alter table tournament_players add column if not exists paid numeric(10,2) not null default 0;
alter table ledger_entries drop constraint if exists ledger_entries_kind_check;
alter table ledger_entries add constraint ledger_entries_kind_check check(kind in('topup','order_payment','order_payout','refund','adjustment','test_topup','withdraw','withdraw_refund','dispute_capture','tournament_fee','tournament_refund','tournament_prize'));
