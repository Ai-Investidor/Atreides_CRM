-- =====================================================================
-- 0010 · Perfil de investidor informado pela corretora (Documentação/03) — parte 1
--
-- O Atreides deixa de diagnosticar o perfil (quem faz é a corretora). Esta parte só
-- cria os valores novos dos tipos; a parte 2 os usa (o Postgres exige transações separadas).
--   very_aggressive → "Agressivo" (4º nível da escala; aggressive continua sendo "Arrojado")
--   broker_profile  → categoria de documento "Comprovante de perfil da corretora"
--   profile_set     → evento da linha do tempo "Perfil registrado"
-- =====================================================================

alter type public.investor_profile add value if not exists 'very_aggressive';
alter type public.document_category add value if not exists 'broker_profile';
alter type public.client_event_type add value if not exists 'profile_set';
