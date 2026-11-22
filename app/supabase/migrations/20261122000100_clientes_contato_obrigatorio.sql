-- Correção: sem núcleo familiar (family_role nulo), a regra de contato obrigatório
-- era avaliada como "nulo" e o banco aceitava cliente sem CPF, celular e e-mail.
alter table public.clients drop constraint clients_contact_required;
alter table public.clients add constraint clients_contact_required
  check (coalesce(family_role = 'dependent', false) or (cpf is not null and phone is not null and email is not null));
