# 10 · Painel e análises

## Objetivo

Mostrar, numa tela, como está a consultoria e o que precisa de atenção hoje. Para o consultor: o dia dele. Para o Gabriel: o negócio inteiro.

## Quem usa

Todos. O conteúdo muda conforme o papel.

## Escopo

**MVP (painel do dia)**
- Tarefas de hoje e atrasadas
- Retornos de leads de hoje
- Reuniões de hoje
- Alertas (carteiras com desvio, perfis vencendo, revisões atrasadas)

**Fase 2 (análises)**
- Indicadores do negócio e gráficos
- Visão por consultor
- Exportação

## Painel do consultor

| Bloco | Conteúdo |
|---|---|
| Hoje | Reuniões do dia, tarefas de hoje, retornos de leads |
| Atenção | Tarefas atrasadas, reuniões sem ata, carteiras desatualizadas, desvios de alocação, perfis vencendo |
| Meus números | Clientes ativos, patrimônio sob consultoria, leads abertos |

## Meta principal

A meta da consultoria é o **patrimônio sob consultoria**. Ele aparece no topo do painel do admin como meta × realizado, com a evolução mês a mês.

## Receita

A remuneração da consultoria **depende do tamanho do patrimônio** do cliente. O painel calcula a receita estimada a partir da tabela de remuneração por faixa de patrimônio (configurada pelo admin).

## Painel do admin (Fase 2)

**Indicadores**
| Indicador | Cálculo |
|---|---|
| Patrimônio sob consultoria | Soma do patrimônio das fotografias mais recentes dos clientes ativos |
| Clientes ativos | Contagem por status |
| Novos clientes no mês | Conversões de leads no período |
| Taxa de conversão | Leads ganhos ÷ leads encerrados (ganhos + perdidos) |
| Tempo médio de conversão | Dias entre a criação do lead e o ganho |
| Motivos de perda | Distribuição dos motivos |
| Clientes por perfil | Conservador / Moderado / Arrojado |
| Revisões em dia | % de clientes com revisão dentro do prazo |
| Clientes sem contato | Ativos sem reunião há mais de 6 meses |
| Encerramentos | Clientes encerrados no período e motivos |
| Meta de patrimônio | Patrimônio sob consultoria × meta definida pelo admin |
| Receita estimada | Soma da remuneração de cada cliente, pela faixa de patrimônio |

**Gráficos**
- Evolução do patrimônio sob consultoria
- Funil de leads (quantos em cada etapa)
- Novos clientes × encerramentos por mês
- Distribuição por consultor

## Regras de negócio

- Todo número mostra o período e a data de referência.
- O admin filtra por consultor e por período.
- Números com base em carteira desatualizada são sinalizados.
- O admin vê **todos os indicadores** listados acima, sem corte.
- O painel não mostra dados individuais de clientes de outros consultores para quem não tem permissão ([02](02-acesso-e-permissoes.md)).

## Critérios de aceite

- [ ] Painel do consultor mostra o dia e os alertas corretos
- [ ] Clicar em qualquer alerta leva direto ao item
- [ ] (Fase 2) Indicadores conferem com os dados de origem
- [ ] (Fase 2) Filtros por consultor e período

## Perguntas em aberto

1. Tabela de remuneração: quais são as faixas de patrimônio e o valor/percentual de cada uma?
2. Qual a meta de patrimônio sob consultoria (valor e prazo)?

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: o admin vê todos os indicadores; meta principal = patrimônio sob consultoria; remuneração depende do tamanho do patrimônio (receita estimada por faixa).
