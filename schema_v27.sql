-- v27: код верификации сохраняется на 15 минут (чтобы не пропадал при выходе со страницы)
alter table seller_verifications add column if not exists code_plain text;
