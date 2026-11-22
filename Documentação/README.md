# Documentação do Atreides

Planejamento do sistema, escrito **antes** de programar. Cada fluxo tem o seu arquivo. A regra é simples: nada entra no código sem estar descrito aqui primeiro, e quando o código mudar o comportamento, o documento muda junto.

## Índice

| # | Documento | O que define | Fase |
|---|---|---|---|
| 00 | [Visão geral](00-visao-geral.md) | Objetivo, usuários, princípios, mapa de módulos, glossário | — |
| 01 | [Arquitetura e stack](01-arquitetura-e-stack.md) | Tecnologias, estrutura do código, ambientes, segurança, LGPD | MVP |
| 02 | [Acesso e permissões](02-acesso-e-permissoes.md) | Login, papéis, quem vê o quê | MVP |
| 03 | [Clientes](03-clientes.md) | Cadastro, perfil de investidor, ficha do cliente, linha do tempo | MVP |
| 04 | [Leads e funil](04-leads-e-funil.md) | Captação, etapas, follow-up, conversão em cliente | MVP |
| 14 | [Diagnóstico financeiro](14-diagnostico-financeiro.md) | Gastos, ganhos, dívidas, capacidade de investir, plano de ação | MVP |
| 05 | [Planejamento financeiro e de investimentos](05-planejamento-financeiro.md) | Objetivos, estratégia, simulação e revisões | MVP |
| 06 | [Carteiras e acompanhamento](06-carteiras-e-acompanhamento.md) | Posições, alocação, rentabilidade, alertas | MVP |
| 13 | [Pesquisa de ativos](13-pesquisa-de-ativos.md) | Busca, gráficos, indicadores fundamentalistas, adicionar à carteira | MVP (básico) |
| 07 | [Reuniões e agenda](07-reunioes-e-agenda.md) | Agendamento, pauta automática, ata e próximos passos | MVP |
| 08 | [Relatórios para o cliente](08-relatorios.md) | Relatório periódico gerado pelo sistema, em PDF | Fase 2 |
| 09 | [Processos e tarefas](09-processos-e-tarefas.md) | Checklists de onboarding e revisão, tarefas da equipe | MVP |
| 10 | [Painel e análises](10-painel-e-analises.md) | Visão geral da consultoria, indicadores, resultados | Fase 2 |
| 11 | [Modelo de dados](11-modelo-de-dados.md) | Todas as tabelas e relações num lugar só | MVP |
| 12 | [Interface e design system](12-interface-e-design-system.md) | Como a marca vira componentes e telas | MVP |

## Como usar estes documentos

1. **Ler a visão geral primeiro.** Ela explica o porquê de cada módulo.
2. **Resolver as "Perguntas em aberto"** de cada documento antes de programar aquele módulo. Resposta dada, a pergunta sai da lista e vira regra no corpo do documento.
3. **Critérios de aceite** são o checklist de "pronto": o módulo só está pronto quando todos passam.
4. **Toda mudança de escopo** é registrada no próprio documento, na seção "Histórico de decisões", com data.

## Ordem de construção sugerida

```
01 Arquitetura → 02 Acesso → 12 Design system → 11 Modelo de dados
      → 03 Clientes → 04 Leads → 09 Processos → 07 Reuniões
      → 14 Diagnóstico → 05 Planejamento → 13 Pesquisa de ativos
      → 06 Carteiras → 08 Relatórios → 10 Painel
```

A lógica: primeiro a base (infraestrutura, login, componentes, banco), depois o que tira a operação das planilhas e do WhatsApp (clientes, leads, tarefas, reuniões), em seguida o coração do atendimento na ordem em que o cliente vive (diagnóstico, planejamento, carteira) e por último o que depende de dados acumulados (relatórios e análises).

Os números dos documentos não mudam quando entra um fluxo novo (para não quebrar links). A ordem de leitura é a da tabela acima.
