# 03 · Clientes

## Objetivo

Ser a ficha única de cada cliente: quem é, qual o perfil, o que foi combinado, o que aconteceu. Substitui as planilhas de clientes e as anotações soltas.

## Quem usa

Consultores (os próprios clientes) e admin (todos).

## Problema que resolve

"Atualizar planilhas" e "o histórico do cliente está na cabeça do consultor ou perdido no WhatsApp".

## Escopo

**MVP**
- Cadastro e edição de cliente
- Registro do perfil de investidor definido pela corretora (uso no planejamento)
- Ficha do cliente com abas
- Linha do tempo automática
- Anotações rápidas
- Upload de documentos
- Busca e filtros na lista
- Exportar e apagar dados do cliente (LGPD)

- Núcleo familiar: vincular cônjuge e dependentes

- **Migração dos clientes do Erick**: os clientes que ele atende hoje (carteiras no Investidor10) vêm para o Atreides. Importação por planilha (cadastro + carteira), com prévia e validação antes de gravar

**Depois**
- Portal do cliente (fase 3)

## Fluxo: cadastrar cliente

1. Caminhos de entrada: botão **Novo cliente**, ou **conversão de um lead** ([04 Leads](04-leads-e-funil.md)). Na conversão, os dados do lead vêm preenchidos.
2. Consultor preenche os **dados básicos** (obrigatórios: nome, CPF, celular, e-mail).
3. Sistema valida o CPF e verifica se já existe cliente com o mesmo CPF.
4. Cliente é salvo com status **Onboarding**, e o processo de onboarding começa sozinho ([09 Processos](09-processos-e-tarefas.md)).
5. Uma das etapas do onboarding é **registrar o perfil de investidor definido pela corretora**.
6. Ao concluir o onboarding, o status vira **Ativo**.

## Fluxo: perfil de investidor (informado pela corretora)

O Atreides **não diagnostica** o perfil de investidor e não informa ao cliente qual é o perfil dele: quem faz a análise de suitability é a corretora. O sistema só **registra o perfil que a corretora definiu**, para o consultor usar no planejamento ([05](05-planejamento-financeiro.md)) e na carteira.

1. Consultor abre a aba **Perfil** e clica em **Registrar perfil**.
2. Escolhe o perfil, na escala de 4 níveis: **Conservador**, **Moderado**, **Arrojado** ou **Agressivo** (corretoras com 3 níveis não usam o último).
3. Informa a **corretora** que definiu o perfil e, se quiser, uma **observação** (ex.: "cliente se vê mais conservador que o perfil da corretora").
4. Pode anexar o **comprovante** (print ou PDF do perfil na corretora), que fica em Documentos do cliente.
5. Salvo com data e autor. Trocar o perfil depois registra a mudança na linha do tempo; não há questionário nem validade.

## Fluxo: diagnóstico financeiro

O atendimento não começa pelos investimentos: começa pela vida financeira do cliente (gastos, ganhos, dívidas, capacidade de investir). Esse fluxo tem documento próprio: **[14 Diagnóstico financeiro](14-diagnostico-financeiro.md)**. Na ficha do cliente, ele aparece na aba **Diagnóstico**, antes de Planejamento e Carteira.

## Núcleo familiar

Clientes podem ser agrupados num **núcleo familiar** (casal, família). Cada pessoa continua com a própria ficha, perfil de investidor e carteira, mas:

- O diagnóstico e o planejamento podem ser **do núcleo** (renda e gastos somados, objetivos em comum) ou individuais.
- A ficha mostra os membros do núcleo e o patrimônio consolidado da família.
- Um membro do núcleo pode ser só dependente (ex.: filho), sem contrato próprio.

## Status do cliente

```
Onboarding → Ativo ⇄ Em pausa → Encerrado
```

- **Onboarding:** contrato assinado, cadastro e perfil em andamento
- **Ativo:** atendimento normal
- **Em pausa:** contrato suspenso temporariamente
- **Encerrado:** contrato terminou. Dados ficam guardados pelo prazo de retenção, sem aparecer nas listas padrão

## Telas

**Lista de clientes**
- Colunas: nome, perfil, patrimônio sob consultoria, consultor, próxima revisão, status
- Filtros: status, perfil, consultor, revisão vencida
- Busca por nome, CPF, e-mail ou celular

**Ficha do cliente** (abas)
| Aba | Conteúdo |
|---|---|
| Resumo | Dados principais, perfil, patrimônio, próxima reunião, tarefas abertas, últimas anotações |
| Linha do tempo | Tudo em ordem cronológica: reuniões, anotações, mudanças de perfil, tarefas, relatórios enviados, documentos |
| Perfil | Questionário atual e histórico |
| Diagnóstico | Ver [14](14-diagnostico-financeiro.md) |
| Planejamento | Ver [05](05-planejamento-financeiro.md) |
| Carteira | Ver [06](06-carteiras-e-acompanhamento.md) |
| Documentos | Contrato, documentos pessoais, comprovantes |
| Dados | Cadastro completo, editável |

## Dados do cliente

| Grupo | Campos |
|---|---|
| Identificação | nome completo, CPF, data de nascimento, estado civil, profissão |
| Contato | celular (WhatsApp), e-mail, cidade/UF |
| Relação | workspace (consultor responsável), origem (Instagram, prospecção ativa, indicação, AI Invest…), indicado por, data de início do contrato, status |
| Família | núcleo familiar, papel no núcleo (titular, cônjuge, dependente) |
| Financeiro | renda mensal, patrimônio total declarado, patrimônio sob consultoria (calculado da carteira) |
| Perfil | perfil informado pela corretora, corretora, observação, comprovante, data e autor do registro |
| LGPD | data do aceite de tratamento de dados |

## Regras de negócio

- CPF único: não pode haver dois clientes com o mesmo CPF.
- Celular no formato brasileiro, com DDD.
- **Linha do tempo é automática:** qualquer ação em outros módulos que envolva o cliente gera um evento. O consultor não precisa registrar nada duas vezes.
- Anotações podem ser fixadas no topo do Resumo (ex.: "não ligar antes das 10h").
- **Exportar dados (LGPD):** gera um arquivo com todos os dados do cliente. Só admin. Fica na auditoria.
- **Apagar dados (LGPD):** só admin, com confirmação dupla. Registros que a CVM obriga a guardar (mínimo de 5 anos) não são apagados antes do prazo; o restante, sim. Ver [01](01-arquitetura-e-stack.md), retenção.
- **Cliente migrado:** entra com status Ativo, sem disparar o onboarding completo. O sistema cria só as tarefas do que faltar (registrar perfil, diagnóstico, aceite LGPD).

## Implementação (21/11/2026)

- **Banco:** migrations `20261122000000_clientes.sql`, `20261122000100_clientes_contato_obrigatorio.sql` e `20261122000200_transferencia_cliente.sql`. Tabelas `clients`, `families`, `client_notes`, `client_documents`, `document_requirements`, `suitability_versions`, `suitability_responses`, `client_events`, `process_templates`, `process_template_steps`, `processes`; colunas novas em `tasks` (cliente, processo, etapa) e `meetings` (cliente); armazenamento privado `client-documents`; rotina diária (pg_cron) de perfil vencendo. Em 22/11/2026, `20261122030000_perfil_corretora.sql` e `20261122030100_perfil_corretora_regras.sql` removeram questionário, versões e rotina de vencimento e criaram o registro do perfil da corretora (`profile_broker`, `profile_note`, `profile_document_id`, `profile_recorded_at`, `profile_recorded_by`).
- **Regras no banco:** CPF válido e único; contato obrigatório (exceto dependente); status inicial pelo tipo de cadastro; perfil registrado com data e autor gravados pelo banco, mudança na linha do tempo (22/11/2026; antes: questionário com pontuação no banco); encerramento com motivo e retenção de 5 anos; exclusão bloqueada dentro da retenção; linha do tempo gravada pelos gatilhos; etapa final do onboarding só depois das outras; onboarding concluído torna o cliente Ativo; conversão de lead uma única vez; transferência só pelo admin, levando tarefas, processos e histórico.
- **Telas:** `/clientes` (indicadores, busca por nome/CPF/e-mail/celular, filtros por status e perfil), ficha `/clientes/[id]` com abas Resumo, Linha do tempo, Perfil, Diagnóstico, Planejamento, Carteira (as três últimas "Em breve"), Documentos e Dados; `/clientes/importar`; `/configuracoes/clientes` (admin).
- **Integrações:** converter lead ganho na ficha do lead; reunião e tarefa vinculadas a cliente; busca da barra superior; botão "Novo" com cliente e reunião; painel com clientes ativos e o passo da migração.
- **Testado no banco:** 13 regras de cliente + conversão de lead e anotação (a transferência aguarda um segundo workspace para teste real).
- **Perfil da corretora (22/11/2026):** aba Perfil com registro (perfil, corretora com sugestões, observação, comprovante enviado para Documentos na categoria "Comprovante de perfil"). Testadas 6 regras no banco: corretora obrigatória, data/autor gravados pelo banco e não forjáveis, evento na linha do tempo, etapa do onboarding concluída, comprovante só do próprio cliente, remoção limpa os campos.

## Critérios de aceite

- [x] Cadastro com validação de CPF e checagem de duplicidade
- [x] Perfil de investidor informado pela corretora registrado com corretora, observação e comprovante (22/11/2026)
- [x] Linha do tempo mostra eventos de todos os módulos sem registro manual (inclui a fase de lead)
- [x] Busca encontra cliente por nome, CPF, e-mail ou celular
- [x] Documentos sobem para armazenamento privado
- [x] Exportação e exclusão LGPD funcionam e ficam na auditoria
- [x] Clientes podem ser agrupados em núcleo familiar, com patrimônio consolidado (declarado; o da carteira vem com o módulo 06)
- [x] Importação dos clientes do Erick com prévia e validação (cadastro; a carteira vem com o módulo 06)

## Decisões de construção (21/11/2026)

- **Documentos obrigatórios:** lista padrão editável pelo admin (Configurações › Clientes): contrato assinado, documento com foto (RG ou CNH), comprovante de residência, aceite LGPD. A ficha mostra o que falta.
- **Perfil de investidor (22/11/2026):** registrado a partir do perfil definido pela corretora; o Atreides não aplica questionário próprio. Substitui a decisão anterior de questionário versionado (removido).
- **Migração do Erick:** importação por planilha CSV só do cadastro, com prévia e erros linha a linha. Clientes entram como Ativos e disparam o processo de migração. A carteira entra com o módulo Carteiras ([06](06-carteiras-e-acompanhamento.md)).
- **Dependente** (papel no núcleo): CPF, celular e e-mail opcionais (filho sem contrato próprio).
- **Abas Diagnóstico, Planejamento e Carteira** aparecem como "Em breve" até os módulos 14, 05 e 06 existirem. Patrimônio sob consultoria mostra "—" até haver carteira.
- **Processos:** cadastrar cliente inicia o processo de **Onboarding**; cliente migrado inicia o de **Migração** (sem a tarefa de aceite LGPD se já houver aceite). Concluir a última etapa do onboarding torna o cliente Ativo. Perfil registrado e aceite LGPD concluem sozinhos as tarefas correspondentes.
- **Encerramento:** ação na ficha com motivo obrigatório; grava a data e o prazo de retenção (5 anos, CVM). O cliente sai das listas padrão.
- **Exclusão (LGPD):** só admin, com confirmação dupla. Bloqueada enquanto houver registros da atividade dentro do prazo de retenção da CVM (documentos e reuniões); nesse caso a tela mostra a data a partir da qual pode apagar.

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: sem base de clientes (importação fora do MVP); questionário de perfil será criado do zero; validade do perfil de 24 meses; núcleo familiar incluído no MVP; diagnóstico financeiro vira fluxo próprio ([14](14-diagnostico-financeiro.md)).
- 21/11/2026: os clientes do Erick migram para o Atreides: importação volta ao MVP; cliente migrado entra como Ativo com tarefas só do que faltar; exclusão respeita a retenção da CVM.
- 21/11/2026: perguntas em aberto resolvidas (lista de documentos editável, questionário rascunho marcado como não validado, importação por CSV só do cadastro); módulo construído por completo, com abas de Diagnóstico, Planejamento e Carteira aguardando seus módulos.
- 21/11/2026: implementado (banco, lista, ficha com abas, questionário, documentos, núcleo familiar, importação, conversão de lead, transferência, LGPD). Corrigida regra de contato obrigatório que aceitava cliente sem CPF quando não havia núcleo familiar.
- 22/11/2026: o Atreides deixa de diagnosticar o perfil de investidor (quem faz é a corretora). Questionário de suitability, versões, validade e tarefa de perfil vencendo removidos; no lugar, registro do perfil da corretora (4 níveis: conservador, moderado, arrojado, agressivo), com corretora, observação e comprovante, para uso no planejamento.
