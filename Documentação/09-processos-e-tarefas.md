# 09 · Processos e tarefas

## Objetivo

Padronizar como a consultoria trabalha (onboarding, revisão, encerramento) e garantir que nenhuma tarefa se perca. É o "o que eu tenho que fazer hoje" de cada consultor.

## Quem usa

Consultores (executam). Admin (define os processos e acompanha).

## Escopo

**MVP**
- Tarefas avulsas e tarefas geradas pelo sistema
- Processos padrão (checklists com etapas) que criam tarefas sozinhos
- Lista "Minhas tarefas" (hoje, atrasadas, próximas)
- Tarefas vinculadas a cliente ou lead

**Depois**
- Editor visual de processos pelo admin
- Notificações por e-mail
- Tarefas recorrentes livres

## Etapas de construção

**Etapa 1 (agora): tarefas**
- Tela **Tarefas** com grupos **Atrasadas, Hoje, Próximos 7 dias, Depois e Sem prazo**; concluídas recentes ficam recolhidas
- Visões: **Minhas** (sou o responsável), **Do workspace** (todas do workspace aberto) e, para o admin, **Equipe** (todos os workspaces, filtrando por consultor)
- **Adicionar em um passo:** campo no topo da lista ("Nova tarefa…" + Enter); detalhes (descrição, prazo, responsável, vínculo) num painel lateral
- **Concluir em um clique**, com opção de desfazer
- Responsável: qualquer pessoa ativa da equipe; padrão é o dono do workspace
- Vínculo: um lead do workspace ou nenhum (cliente quando o módulo Clientes existir)
- Ficha do lead: card "Tarefas" com as tarefas abertas do lead e atalho para criar
- Tarefa de lead concluída entra no histórico do lead
- Painel: card "Tarefas de hoje" (atrasadas e de hoje, minhas)
- Tarefa manual pode ser excluída por quem criou ou pelo admin. Tarefa gerada pelo sistema (processo, reunião) não se exclui: marca "não se aplica", com motivo

**Etapa 2 (depois de Clientes):** processos padrão (onboarding, migração, revisão, encerramento) com etapas e dependências, barra de progresso na ficha do cliente e as tarefas automáticas da tabela abaixo.

## Processos padrão

**Onboarding de cliente** (dispara ao cadastrar cliente)
1. Enviar e coletar contrato assinado
2. Registrar aceite de tratamento de dados (LGPD)
3. Coletar documentos
4. Aplicar questionário de perfil de investidor
5. Reunião de onboarding: levantamento financeiro
6. Concluir o diagnóstico financeiro ([14](14-diagnostico-financeiro.md))
7. Registrar a carteira atual
8. Montar planejamento
9. Reunião de apresentação do planejamento
10. Concluir onboarding (cliente vira Ativo)

**Migração de cliente existente** (dispara ao importar um cliente do Erick)
1. Conferir cadastro e carteira importados
2. Registrar aceite de tratamento de dados (LGPD), se ainda não houver
3. Aplicar questionário de perfil de investidor
4. Fazer o diagnóstico financeiro ([14](14-diagnostico-financeiro.md))
5. Registrar o planejamento vigente no Atreides

**Revisão periódica** (dispara pela data de revisão do planejamento)
1. Atualizar a carteira
2. Conferir validade do perfil de investidor
3. Agendar reunião de revisão
4. Realizar a reunião e registrar a ata
5. Publicar a nova versão do planejamento

**Encerramento de cliente**
1. Registrar motivo do encerramento
2. Enviar relatório final
3. Iniciar a retenção conforme a CVM (dados só leitura por no mínimo 5 anos, ver [01](01-arquitetura-e-stack.md))
4. Mudar status para Encerrado

> Etapas do onboarding confirmadas pela consultoria. As etapas não têm prazo padrão: o consultor define o prazo de cada tarefa quando achar necessário.

> Ajuste necessário: o onboarding passa a incluir o **diagnóstico financeiro** ([14](14-diagnostico-financeiro.md)) antes de montar o planejamento.

## Tarefas automáticas (geradas pelo sistema)

| Gatilho | Tarefa |
|---|---|
| Início do mês / toda segunda (semanais) | Atualizar carteiras ([06](06-carteiras-e-acompanhamento.md)) |
| Periodicidade de relatório do cliente | Gerar relatório ([08](08-relatorios.md)) |
| Perfil de investidor vence em 30 dias | Atualizar questionário de perfil |
| Reunião realizada sem ata | Registrar ata |
| Próximo passo de reunião | Tarefa com o prazo combinado |
| Lead com contato marcado | Aparece em "Retornos de hoje" ([04](04-leads-e-funil.md)) |

## Telas

- **Minhas tarefas:** grupos Atrasadas, Hoje, Próximos 7 dias e Sem prazo. Marcar como feita em um clique.
- **Processo do cliente:** na ficha do cliente, barra de progresso do processo em andamento, com as etapas.
- **Tarefas da equipe** (admin): todas as tarefas, filtráveis por consultor.

## Regras de negócio

- Tarefa tem: título, responsável, prazo (opcional), cliente/lead (opcional) e origem (manual, processo, reunião, sistema).
- Etapas de processo podem depender umas das outras (ex.: "Montar planejamento" só libera após "Diagnóstico").
- Concluir a última etapa do onboarding muda o status do cliente para Ativo.
- Tarefa concluída entra na linha do tempo do cliente.
- Ninguém apaga tarefa gerada por processo: pode marcar como "não se aplica", com motivo.

## Dados

- `processos_modelo`: id, nome, gatilho, ativo
- `processo_modelo_etapas`: id, processo_modelo_id, ordem, titulo, prazo_dias, depende_de
- `processos`: id, processo_modelo_id, cliente_id, status, iniciado_em, concluido_em
- `tarefas` (`tasks`): id, workspace_id, titulo, descricao, responsavel_id, prazo, lead_id, cliente_id (quando existir), processo_id e etapa_id (etapa 2), origem (manual | processo | reuniao | sistema), status (aberta | concluida | nao_se_aplica), motivo_nao_se_aplica, concluida_em, concluida_por, criado_por

## Implementação da etapa 1 (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261121220000_tarefas.sql` (tabela `tasks`). Regras no próprio banco: responsável ativo da equipe, lead do mesmo workspace, quem e quando concluiu gravados pelo banco, "não se aplica" exige motivo, só tarefa manual pode ser criada pela tela, exclusão só de tarefa manual por quem criou ou pelo admin, tarefa de lead concluída no histórico do lead, auditoria de edição em workspace alheio.
- **Telas:** `/tarefas` com abas Minhas, Do workspace e Equipe (só admin, com filtro por consultor); campo de criação rápida com prazo (Sem prazo, Hoje, Amanhã, +1 semana); grupos por prazo; concluir em um clique com "Desfazer"; painel lateral para editar, concluir, reabrir e excluir.
- **Integrações:** card "Tarefas" na ficha do lead (criar já vinculada) e card "Tarefas de hoje" no painel.

## Critérios de aceite

- [x] Cadastrar cliente dispara o onboarding com todas as etapas
- [x] "Minhas tarefas" agrupa atrasadas, hoje e próximas
- [ ] Tarefas automáticas são criadas pelos gatilhos da tabela
- [x] Concluir o onboarding torna o cliente Ativo
- [x] Barra de progresso do processo na ficha do cliente

## Perguntas em aberto

Nenhuma no momento. (Outros processos recorrentes, como a declaração de IR em março–abril, ficam para depois, conforme decidido.)

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: etapas do onboarding confirmadas (com o diagnóstico financeiro incluído); sem prazos padrão por etapa; outros processos recorrentes (ex.: IR) ficam para depois.
- 21/11/2026: novo processo de migração para os clientes do Erick; encerramento segue a retenção da CVM.
- 21/11/2026: tarefas construídas antes de Clientes, em duas etapas. Etapa 1: tarefas avulsas com grupos por prazo, visões Minhas / Do workspace / Equipe (admin), vínculo com lead, histórico do lead e painel. Etapa 2: motor de processos, que depende de Clientes.
- 21/11/2026: etapa 1 implementada (banco, tela de tarefas, ficha do lead, painel).
- 21/11/2026: etapa 2 iniciada junto com Clientes: processos de Onboarding e Migração com etapas, dependência da etapa final e barra de progresso na ficha. Revisão periódica entra com o Planejamento (depende da data de revisão); encerramento é uma ação na ficha do cliente.
- 21/11/2026: processos de Onboarding e Migração implementados; "não se aplica" com motivo para tarefas de processo; questionário e aceite LGPD concluem as etapas sozinhos.
