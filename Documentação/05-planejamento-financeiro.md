# 05 · Planejamento financeiro e de investimentos

## Objetivo

Registrar, de forma estruturada, o planejamento de cada cliente (ou núcleo familiar): aonde ele quer chegar e qual a estratégia, partindo do diagnóstico da vida financeira dele.

## Quem usa

Consultores. Admin acompanha.

## Como funciona hoje

Hoje só o Erick tem clientes. Ele monta as carteiras dos clientes no **Investidor10** (ativos, quantidade e valor) e todo mês envia um **PDF com a identidade visual da consultoria dele** detalhando o planejamento de investimento do mês. O Atreides substitui esse processo: carteira montada aqui ([06](06-carteiras-e-acompanhamento.md) e [13](13-pesquisa-de-ativos.md)), planejamento aqui, e o PDF mensal sai do sistema ([08](08-relatorios.md)).

## Lugar no atendimento

```
14 Diagnóstico financeiro  →  05 Planejamento  →  06 Carteira  →  08 Relatórios
(gastos, ganhos, dívidas,      (objetivos,         (ativos e        (acompanhamento
 capacidade de investir)        estratégia)          posições)         mensal)
```

O planejamento **parte do diagnóstico**: só começa depois que o diagnóstico financeiro do cliente está concluído.

## Escopo

**MVP**
- Objetivos do cliente com valor, prazo e prioridade
- Plano de ação financeiro (vindo do diagnóstico: cortes de gastos, quitação de dívidas, reserva)
- Alocação alvo por classe de ativo
- Simulação de cada objetivo com premissas informadas pelo consultor
- Planejamento individual ou do núcleo familiar
- Versões do planejamento (cada revisão gera uma nova versão)

**Fase 2**
- PDF do planejamento com a identidade da marca
- Simulação em cenários (conservador, base, favorável) lado a lado
- Planejamento sucessório e de aposentadoria detalhados

## Estrutura de um planejamento

| Bloco | Conteúdo |
|---|---|
| **1. Ponto de partida** | Resumo do diagnóstico ([14](14-diagnostico-financeiro.md)): sobra mensal, patrimônio, dívidas, reserva atual × ideal, capacidade de investimento |
| **2. Objetivos** | Lista: nome (ex.: "Aposentadoria", "Entrada do apartamento"), valor-alvo, prazo, prioridade, quanto já está guardado |
| **3. Plano de ação financeiro** | Metas de comportamento: reduzir gastos, quitar dívidas, montar reserva, aumentar o aporte |
| **4. Estratégia de investimento** | Alocação alvo por classe de ativo, aporte mensal recomendado, observações do consultor |
| **5. Simulação** | Para cada objetivo: em quanto tempo ele seria atingido, **nas premissas informadas pelo consultor** |
| **6. Recomendações** | Ações combinadas com o cliente, com prazo |

## Fluxo: criar o primeiro planejamento

1. Com o diagnóstico concluído, a tarefa "Montar planejamento" leva à aba Planejamento do cliente.
2. O sistema traz o ponto de partida do diagnóstico, sem redigitar nada.
3. Consultor cadastra os objetivos e o plano de ação financeiro.
4. Define a alocação alvo. O sistema sugere um ponto de partida conforme o perfil de investidor, e o consultor ajusta.
5. Para simular, o consultor informa a premissa de cada caso (ex.: taxa real anual estimada). O sistema mostra o resultado como **simulação**.
6. Consultor registra as recomendações e **publica** o planejamento (versão 1).

## Fluxo: revisão

1. A cada **6 meses**, o sistema cria a tarefa e sugere uma reunião de revisão ([07](07-reunioes-e-agenda.md)).
2. Consultor abre o planejamento, que é copiado para uma nova versão em rascunho.
3. Atualiza o que mudou e publica a versão seguinte. A anterior continua consultável.
4. O sistema mostra o comparativo entre as versões (patrimônio, objetivos atingidos, metas do plano de ação, mudanças na alocação).

## Regras de negócio

- Só um planejamento **vigente** por cliente ou núcleo familiar. Os anteriores ficam no histórico.
- Planejamento familiar: renda, gastos e objetivos do núcleo somados; cada membro mantém o próprio perfil de investidor, e a alocação de cada carteira respeita o perfil do dono dela.
- A alocação alvo precisa somar **100%**.
- A alocação alvo precisa ser compatível com o perfil do cliente. Se o consultor colocar mais risco que o perfil permite, o sistema **avisa e pede justificativa** (registro para suitability).
- **O sistema não tem premissa de rentabilidade padrão.** Mercado financeiro é volátil, e prometer rentabilidade é antiético. Por isso:
  - toda simulação usa uma premissa digitada pelo consultor naquele planejamento, e ela aparece junto do resultado;
  - o resultado é sempre chamado de **simulação**, nunca de "projeção" ou "retorno esperado";
  - o aviso "Simulação ilustrativa. Rentabilidade não é garantida e investimentos podem ter perdas." aparece na tela e em qualquer documento gerado.

## Dados

- `planejamentos`: id, cliente_id ou nucleo_familiar_id, diagnostico_id, versao, status (rascunho | vigente | arquivado), aporte_mensal, justificativa_perfil, observacoes, publicado_em, publicado_por
- `planejamento_objetivos`: id, planejamento_id, nome, valor_alvo, prazo, prioridade, valor_atual, premissa_taxa_real
- `planejamento_alocacao`: id, planejamento_id, classe_ativo, percentual
- `planejamento_acoes`: id, planejamento_id, tipo (gasto | divida | reserva | renda | aporte), descricao, meta, prazo, status
- `planejamento_recomendacoes`: id, planejamento_id, descricao, prazo, concluida

## Critérios de aceite

- [ ] Planejamento só começa com diagnóstico concluído e traz os números dele sem redigitação
- [ ] Planejamento individual ou do núcleo familiar
- [ ] Alocação não salva se não somar 100%
- [ ] Alerta quando a alocação é incompatível com o perfil, com justificativa obrigatória
- [ ] Simulação só roda com premissa informada pelo consultor, sempre com o aviso
- [ ] Revisão a cada 6 meses gera nova versão sem perder a anterior
- [ ] Comparativo entre versões funciona

## Perguntas em aberto

1. PDF mensal do Erick como referência para o relatório ([08](08-relatorios.md)): Gabriel vai pedir a ele.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: revisão a cada 6 meses; planejamento pode ser familiar; sem premissa de rentabilidade padrão (simulação só com premissa do consultor e aviso obrigatório); diagnóstico vira fluxo próprio ([14](14-diagnostico-financeiro.md)); pesquisa de ativos vira fluxo próprio ([13](13-pesquisa-de-ativos.md)); referência atual: carteiras no Investidor10 + PDF mensal do Erick.
- 21/11/2026: Gabriel vai pedir ao Erick o PDF mensal como referência.
