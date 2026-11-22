# 00 · Visão geral

## O que é o Atreides

O CRM interno da consultoria financeira e de investimentos da AI Invest. Um único lugar para toda a operação: clientes, leads, diagnósticos, planejamentos, carteiras, pesquisa de ativos, reuniões, processos, relatórios e análises.

A consultoria começa pela vida financeira do cliente (controle de gastos, otimização de ganhos, potencial de investimento) e só depois chega aos investimentos. O sistema segue essa mesma ordem.

Hoje essa operação está espalhada entre planilhas, WhatsApp, e-mail e a memória de cada consultor. O Atreides existe para acabar com isso.

O nome vem de Ἀτρείδης, os filhos de Atreu na *Ilíada*, e da Casa Atreides de *Duna*: liderança, honra, lealdade e responsabilidade. O conceito da marca é a **pedra angular**, a peça que trava os pilares e sustenta tudo. No sistema, a pedra angular é a confiança: o cliente confia na consultoria, e a consultoria confia nos próprios dados.

## Quem usa

| Usuário | Quantos | O que precisa |
|---|---|---|
| Gabriel (sócio / gestor) | 1 | Visão da consultoria inteira, indicadores, carteira de todos os consultores, configuração |
| Consultores de investimentos | 2 (o Erick é o único com clientes hoje) | Trabalhar no próprio workspace (clientes e leads), navegar no dos colegas, preparar reuniões, montar diagnósticos, planejamentos, carteiras e relatórios |

O cliente final **não acessa** o sistema nesta fase. Ele recebe o que o sistema produz: relatórios, planejamentos, mensagens.

## Problemas que o sistema resolve

Tarefas que a equipe repete toda semana e que o Atreides deve tirar das costas:

| Tarefa de hoje | Onde o Atreides resolve |
|---|---|
| Montar relatório para o cliente | [08 Relatórios](08-relatorios.md): relatório gerado a partir dos dados, com revisão do consultor |
| Atualizar planilhas | [03 Clientes](03-clientes.md) e [06 Carteiras](06-carteiras-e-acompanhamento.md): o sistema passa a ser a fonte única |
| Acompanhar as carteiras | [06 Carteiras](06-carteiras-e-acompanhamento.md): alocação atual × alvo, alertas de desvio |
| Preparar reuniões | [07 Reuniões](07-reunioes-e-agenda.md): pauta montada automaticamente com o contexto do cliente |
| Cobrar retorno de leads | [04 Leads](04-leads-e-funil.md): follow-up com data, lembrete e fila do dia |

## Princípios do produto

1. **Fonte única da verdade.** Se o dado está no Atreides, não precisa estar em planilha nenhuma.
2. **O cliente no centro.** Tudo (planejamento, carteira, reunião, tarefa, documento) pendura em um cliente e aparece na linha do tempo dele.
3. **O sistema lembra, o consultor decide.** O Atreides sugere, alerta e prepara. Decisão de investimento é sempre do consultor.
4. **Pouca digitação.** Cada dado é digitado uma vez só. Tudo o que pode ser calculado ou importado, é.
5. **Sóbrio e rápido.** Interface limpa, sem enfeite, que abre rápido. A marca transmite segurança, firmeza e confiança, e a interface também.
6. **Seguro por padrão.** Dados financeiros e pessoais de clientes são sensíveis. Ver [01 Arquitetura](01-arquitetura-e-stack.md), seção de segurança e LGPD.

## Mapa de módulos

```
                         ┌──────────────┐
                         │    Painel    │  (10)
                         └──────┬───────┘
        ┌──────────────┬────────┼────────┬──────────────┐
   ┌────┴────┐   ┌─────┴────┐ ┌─┴──────┐ ┌┴──────────┐ ┌─┴─────────┐
   │  Leads  │──▶│ Clientes │ │Reuniões│ │ Processos │ │Relatórios │
   │  (04)   │   │   (03)   │ │  (07)  │ │  (09)     │ │   (08)    │
   └─────────┘   └────┬─────┘ └────────┘ └───────────┘ └───────────┘
                      │
        ┌─────────────┼──────────────┐
  ┌─────┴──────┐ ┌────┴───────┐ ┌────┴──────┐    ┌───────────┐
  │Diagnóstico │▶│Planejamento│▶│ Carteiras │◀───│ Pesquisa  │
  │   (14)     │ │    (05)    │ │   (06)    │    │ de ativos │
  └────────────┘ └────────────┘ └───────────┘    │   (13)    │
                                                 └───────────┘
```

O lead vira cliente. O cliente passa pelo diagnóstico, ganha um planejamento e uma carteira (montada com a pesquisa de ativos). Reuniões, tarefas e relatórios giram em torno do cliente. O painel lê tudo.

## Fases

| Fase | Objetivo | Módulos |
|---|---|---|
| **MVP** | Tirar a operação das planilhas, do WhatsApp e do Investidor10 | Acesso (workspaces, login Google), Clientes, Leads, Processos e tarefas, Reuniões (Google Calendar e Meet), Diagnóstico, Planejamento, Carteiras, Pesquisa de ativos (básica) |
| **Fase 2** | Gerar valor com os dados acumulados | Relatórios em PDF (e-mail e WhatsApp), Painel e análises, indicadores técnicos, importação de extratos |
| **Fase 3** | Automação e integração | Integração com a plataforma de IA da AI Invest, WhatsApp, e-mail, importação automática de posições |

A unificação com a IA da AI Invest está prevista para 2027–2028. Por isso, o modelo de dados já nasce pensando em integração (ver [11 Modelo de dados](11-modelo-de-dados.md)).

## Glossário

| Termo | Significado no Atreides |
|---|---|
| **Lead** | Pessoa interessada que ainda não é cliente |
| **Cliente** | Pessoa com contrato ativo de consultoria |
| **Consultor responsável** | O consultor dono da relação com aquele cliente ou lead |
| **Perfil de investidor (suitability)** | Classificação do cliente (conservador, moderado, arrojado) a partir de questionário |
| **Workspace** | O espaço de trabalho de cada consultor, com os clientes e leads dele |
| **Núcleo familiar** | Grupo de clientes (casal, família) com diagnóstico e planejamento em comum |
| **Diagnóstico** | Levantamento de rendas, gastos, dívidas e patrimônio, com indicadores e plano de ação |
| **Planejamento** | Documento com objetivos, plano de ação e estratégia de investimento do cliente |
| **Simulação** | Estimativa de quando um objetivo é atingido, com premissa informada pelo consultor. Nunca é promessa de retorno |
| **Carteira** | Conjunto de posições de investimento do cliente |
| **Alocação alvo** | A distribuição por classe de ativo que o planejamento recomenda |
| **Desvio** | Diferença entre a alocação atual e a alvo |
| **Revisão** | Encontro periódico para reavaliar planejamento e carteira |
| **Linha do tempo** | Histórico cronológico de tudo o que aconteceu com um cliente |
| **Processo** | Sequência padrão de etapas (ex.: onboarding de cliente novo) |

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: incluídos os fluxos de diagnóstico financeiro (14) e pesquisa de ativos (13); workspaces por consultor; Google Calendar/Meet no MVP.
