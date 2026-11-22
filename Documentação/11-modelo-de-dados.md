# 11 · Modelo de dados

## Objetivo

Reunir num lugar só todas as tabelas do Atreides e como elas se relacionam. Cada documento de módulo descreve os seus dados; aqui fica a visão completa, que vira as migrations do Supabase.

## Convenções

- **Nos documentos**, tabelas e colunas aparecem em português, para todos entenderem.
- **No código e no banco**, os nomes são em **inglês**, minúsculos, com `_` (ex.: `clientes` → `clients`, `cliente_id` → `client_id`). A tradução é feita na hora de escrever as migrations e fica registrada num dicionário no topo do arquivo de migration inicial.
- Textos que aparecem na interface nunca ficam no banco em um idioma fixo: listas fixas (status, etapas, classes de ativo) guardam um código (`active`, `onboarding`) e a interface traduz para PT ou EN.
- Toda tabela tem `id` (UUID), `criado_em` e `atualizado_em`.
- Chaves estrangeiras terminam em `_id`.
- Valores em dinheiro: `numeric(14,2)`, em reais.
- Percentuais: `numeric(5,2)` (ex.: `35.00` = 35%).
- Datas com fuso: `timestamptz`.
- Status como `text` com `check` (lista fixa de valores).
- RLS ativo em todas as tabelas ([02](02-acesso-e-permissoes.md)).

## Diagrama

```
usuarios ── workspaces ─┬─< clientes ─┬─< planejamentos ─┬─< planejamento_objetivos
          │             │                  ├─< planejamento_alocacao
          │             │                  └─< planejamento_recomendacoes
          │             ├─< diagnosticos ──< diagnostico_gastos / diagnostico_dividas
          │             ├─< perfis_investidor
          │             ├─< carteira_fotografias ──< carteira_posicoes >── ativos
          │             ├─< carteira_movimentacoes
          │             ├─< reunioes ──< reuniao_proximos_passos
          │             ├─< relatorios
          │             ├─< documentos
          │             ├─< anotacoes
          │             ├─< processos ──< tarefas
          │             └─< eventos_linha_tempo
          ├─< leads ──< lead_contatos        (lead → cliente na conversão)
          ├─< tarefas
          └─< auditoria

processos_modelo ──< processo_modelo_etapas
nucleos_familiares ──< clientes
ativos ──< ativo_cotacoes / ativo_indicadores   (cache de dados de mercado, ver 13)
```

`A ─< B` = um A tem muitos B.

## Tabelas

### Acesso
| Tabela | Campos principais |
|---|---|
| `usuarios` | id (= id do Supabase Auth), nome, email, papel, idioma, ativo |
| `workspaces` | consultor_id (dono), nome |
| `auditoria` | usuario_id, acao, tabela, registro_id, antes (jsonb), depois (jsonb) |

### Clientes
| Tabela | Campos principais |
|---|---|
| `nucleos_familiares` | nome (ex.: "Família Souza"), workspace_id |
| `clientes` | encerrado_em, reter_ate (encerramento + 5 anos), nome, cpf (único), nascimento, estado_civil, profissao, celular, email, cidade, uf, workspace_id, nucleo_familiar_id, papel_no_nucleo, frequencia_acompanhamento, periodicidade_relatorio, origem, indicado_por, status, inicio_contrato, renda_mensal, patrimonio_declarado, lgpd_aceite_em |
| `perfis_investidor` | cliente_id, respostas (jsonb), pontuacao, perfil, aplicado_em, valido_ate, aplicado_por |
| `documentos` | cliente_id, tipo, nome_arquivo, caminho_storage, enviado_por |
| `anotacoes` | cliente_id, texto, fixada, autor_id |
| `eventos_linha_tempo` | cliente_id, tipo, titulo, referencia_tabela, referencia_id, usuario_id, ocorrido_em |

### Diagnóstico financeiro ([14](14-diagnostico-financeiro.md))
| Tabela | Campos principais |
|---|---|
| `diagnosticos` | cliente_id ou nucleo_familiar_id, status, renda_total, gastos_total, sobra_mensal, patrimonio, dividas_total, reserva_atual, reserva_ideal, capacidade_investimento, concluido_em |
| `diagnostico_rendas` | diagnostico_id, fonte, valor, recorrencia |
| `diagnostico_gastos` | diagnostico_id, categoria, descricao, valor, tipo (fixo, variável, eventual), essencial |
| `diagnostico_dividas` | diagnostico_id, credor, saldo, parcela, juros_mensal, prazo |
| `diagnostico_oportunidades` | diagnostico_id, tipo (corte de gasto, renegociação, aumento de renda), descricao, impacto_mensal |

### Leads
| Tabela | Campos principais |
|---|---|
| `leads` | nome, celular, email, origem, indicado_por, etapa, consultor_id, proximo_contato_em, proximo_contato_descricao, motivo_perda, cliente_id |
| `lead_contatos` | lead_id, tipo, resumo, usuario_id |

### Planejamento
| Tabela | Campos principais |
|---|---|
| `planejamentos` | cliente_id, versao, status, renda, despesas_fixas, despesas_variaveis, patrimonio_investido, patrimonio_imoveis, patrimonio_outros, dividas, reserva_atual, aporte_mensal, justificativa_perfil, observacoes, publicado_em, publicado_por |
| `planejamento_objetivos` | planejamento_id, nome, valor_alvo, prazo, prioridade, valor_atual |
| `planejamento_alocacao` | planejamento_id, classe_ativo, percentual |
| `planejamento_recomendacoes` | planejamento_id, descricao, prazo, concluida |

### Carteiras
| Tabela | Campos principais |
|---|---|
| `ativos` | nome, ticker, isin, classe_ativo, tipo, emissor, setor |
| `ativo_cotacoes` | ativo_id, data, fechamento, abertura, maxima, minima, volume |
| `ativo_indicadores` | ativo_id, data_referencia, indicadores (jsonb: P/L, P/VP, DY, ROE etc.), fonte |
| `listas_acompanhamento` | workspace_id, nome, ativos |
| `carteira_fotografias` | cliente_id, data_referencia, patrimonio_total, criado_por, substitui_id |
| `carteira_posicoes` | fotografia_id, ativo_id, instituicao, quantidade, preco_medio, valor |
| `carteira_movimentacoes` | cliente_id, tipo, valor, data |

### Reuniões, relatórios, processos
| Tabela | Campos principais |
|---|---|
| `reunioes` (`meetings`) | workspace_id, cliente_id (quando existir), lead_id, titulo, tipo, inicio, fim, formato, local, link_meet, participantes, descricao, google_event_id, calendario_de, status, criado_por; etapa 2: pauta (jsonb), resumo, decisoes |
| `conexoes_google` (`private.google_connections`) | usuario_id, email_google, token cifrado, conectado_em (fora da API) |
| `reuniao_proximos_passos` | reuniao_id, descricao, responsavel, prazo, tarefa_id |
| `relatorios` | cliente_id, periodo_inicio, periodo_fim, comentario, status, caminho_pdf, aprovado_por, aprovado_em, enviado_em |
| `processos_modelo` | nome, gatilho, ativo |
| `processo_modelo_etapas` | processo_modelo_id, ordem, titulo, prazo_dias, depende_de |
| `processos` | processo_modelo_id, cliente_id, status, iniciado_em, concluido_em |
| `tarefas` | titulo, descricao, responsavel_id, prazo, cliente_id, lead_id, processo_id, etapa_id, origem, status, concluida_em |

### Configuração
| Tabela | Campos principais |
|---|---|
| `classes_ativo` | codigo, nome, ordem (lista padrão de [06](06-carteiras-e-acompanhamento.md)) |
| `configuracoes` | chave, valor (jsonb): limite de desvio, validade do perfil, periodicidade de revisão, meta de patrimônio |
| `faixas_remuneracao` | patrimonio_min, patrimonio_max, tipo (percentual ou fixo), valor |

## Linha do tempo

A linha do tempo do cliente não é digitada: **gatilhos no banco** (ou funções do servidor) criam um registro em `eventos_linha_tempo` sempre que acontece, para aquele cliente:
reunião realizada, anotação, tarefa concluída, perfil aplicado, planejamento publicado, carteira atualizada, relatório aprovado/enviado, documento enviado, mudança de status, transferência de consultor.

## Pensando na unificação com a AI Invest

- `ativos` e `classes_ativo` são as tabelas que mais vão conversar com a plataforma de IA: manter códigos padronizados (ticker oficial, ISIN quando houver).
- `clientes.cpf` é a chave natural para casar o cliente do Atreides com o usuário da plataforma de IA.

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: código e banco em inglês (documentos seguem em português); interface bilíngue com listas guardadas por código; endereço só cidade/UF; novas tabelas: workspaces, núcleos familiares, diagnóstico, dados de mercado, faixas de remuneração.
- 21/11/2026: campos de retenção (encerrado_em, reter_ate) conforme a CVM.
- 21/11/2026: `meetings` e `private.google_connections` criadas (agenda, etapa 1); reunião pode ficar sem vínculo.
- 21/11/2026: `tasks` criada (tarefas, etapa 1); processos (`process_templates`, `processes`) ficam para a etapa 2.
- 21/11/2026: tabelas de clientes criadas (`clients`, `families`, `client_notes`, `client_documents`, `document_requirements`, `suitability_versions`, `suitability_responses`, `client_events`) e de processos (`process_templates`, `process_template_steps`, `processes`).
- 21/11/2026: tabelas da carteira criadas (`assets`, `asset_quotes`, `portfolio_transactions`, `portfolio_valuations`, `portfolio_snapshots`, `portfolio_targets`, `contributions`, `contribution_items`); modelo por lançamentos no lugar de `carteira_posicoes`.
- 21/11/2026: `market_cache`, `watchlist_items`, `benchmark_rates` e `reports` criadas; `clients.report_frequency`.
