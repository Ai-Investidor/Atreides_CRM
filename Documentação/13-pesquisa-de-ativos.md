# 13 · Pesquisa de ativos

## Objetivo

Dar aos consultores dados técnicos e fundamentalistas dos ativos dentro do Atreides: buscar um ativo, ver gráficos e os indicadores que pesam na decisão, e adicioná-lo direto à carteira de um cliente. A referência é a experiência de criação de carteiras do **Investidor10**, que o Erick usa hoje.

## Quem usa

Consultores e admin.

## Problema que resolve

Hoje a análise de ativos e a montagem de carteiras acontecem fora (Investidor10), e os dados são copiados para planilhas e PDFs. Trazer isso para o Atreides fecha o ciclo: pesquisar → decidir → montar carteira → acompanhar → reportar, tudo num lugar.

## Escopo

**MVP**
- Busca de ativos da B3 por ticker ou nome (ações, FIIs, ETFs, BDRs)
- Página do ativo: cotação, gráfico de preço, principais indicadores fundamentalistas, histórico de proventos
- Botão **Adicionar à carteira** de um cliente ([06](06-carteiras-e-acompanhamento.md))
- Lista de acompanhamento (watchlist) por consultor

**Fase 2**
- Indicadores técnicos no gráfico (médias móveis, IFR, volume)
- Comparar ativos lado a lado
- Filtro de ativos por indicadores (ex.: DY acima de 8%, P/VP abaixo de 1)
- Renda fixa e Tesouro Direto (taxas atuais)
- Fundos de investimento (dados da CVM)

**Fase 3**
- Sinais e análises da plataforma de IA da AI Invest dentro da página do ativo

## Página do ativo

| Bloco | Ações | FIIs |
|---|---|---|
| Cabeçalho | Ticker, nome, setor, cotação, variação do dia | Ticker, nome, segmento, cotação, variação do dia |

> Com o Yahoo Finance, alguns campos abaixo podem vir vazios (principalmente de FIIs). Eles ficam completos com o brapi.

| Bloco | Ações | FIIs |
|---|---|---|
| Gráfico | Preço com períodos (1M, 6M, 1A, 5A, máx.) | Igual |
| Valuation | P/L, P/VP, EV/EBITDA, DY | P/VP, DY, valor patrimonial por cota |
| Rentabilidade | ROE, ROIC, margem líquida | Rendimento mensal médio |
| Endividamento | Dívida líquida/EBITDA, dívida líquida/patrimônio | Vacância (quando disponível) |
| Proventos | Histórico de dividendos e JCP | Histórico de rendimentos |
| Liquidez | Volume médio diário | Volume médio diário, número de cotistas |
| Uso no Atreides | Quais clientes do workspace têm o ativo e quanto | Igual |

## Fluxo: montar uma carteira

1. Na aba Carteira do cliente (ou na pesquisa), o consultor busca o ativo pelo ticker ou nome.
2. Abre a página do ativo e analisa gráfico e indicadores.
3. Clica em **Adicionar à carteira**, escolhe o cliente, informa quantidade, preço médio e instituição.
4. O sistema mostra como fica a alocação da carteira em relação à alvo do planejamento, e avisa se o ativo foge do perfil de investidor do cliente.
5. Confirma. A posição entra na carteira ([06](06-carteiras-e-acompanhamento.md)).

## Fonte dos dados de mercado

O Atreides **não produz** dados de mercado: depende de um provedor externo.

**Decisão:** começar com o **Yahoo Finance** e migrar para o **brapi.dev** (plano mais completo) quando houver orçamento.

**Atualização (22/11/2026):** a brapi.dev já é a fonte principal (chave `BRAPI_TOKEN`, só no servidor), com o Yahoo Finance como **reserva automática** para o que o plano contratado não libera e para falhas da brapi. Cada dado guarda a fonte de onde veio, e a tela mostra essa fonte.

| Recurso | brapi Gratuito (plano atual) | brapi Startup | brapi Pro |
|---|---|---|---|
| Busca, cotação, setor e perfil da empresa | brapi | brapi | brapi |
| Indicadores de ações (P/L, P/VP, EV/EBITDA, DY, margem) | Yahoo (reserva) | brapi | brapi |
| ROE e dívida/patrimônio | Yahoo (reserva) | Yahoo (reserva) | brapi |
| Proventos de ações | Yahoo (reserva) | brapi | brapi |
| FIIs (P/VP, DY, valor patrimonial, segmento, rendimentos) | Yahoo (reserva) | Yahoo (reserva) | brapi |
| Histórico de 5 anos | Yahoo (reserva) | Yahoo (reserva; Startup vai até 1 ano) | brapi |

**Indicadores em cadeia, sem custo (22/11/2026):** enquanto a brapi estiver no plano Gratuito, os indicadores vêm de duas APIs brasileiras gratuitas, calculadas a partir dos balanços da CVM, nesta ordem:

1. **Dados B3** (dadosb3.com): 200 consultas/dia com chave grátis (150/dia sem chave). Ações: P/L e P/VP recalculados com a cotação do dia (lucro e patrimônio do último trimestre), EV/EBITDA, DY 12 meses, ROE e margem líquida do último exercício. FIIs: P/VP, valor patrimonial da cota e DY 12 meses (informe mensal da CVM).
2. **bolsai** (usebolsai.com): 200 consultas/dia com chave grátis. Completa o que a primeira não trouxe (ex.: dívida/patrimônio, que a Dados B3 não publica). Não traz DY de ações (só payout); FIIs: P/VP, DY 12 meses e valor patrimonial da cota.
3. **Yahoo Finance**: última reserva.

A cadeia é **por indicador**: cada campo vem da primeira fonte que o tiver, e a tela lista as fontes usadas. Se uma fonte esgotar a cota do dia ou falhar, o sistema pula para a próxima e não volta a ela até o dia seguinte (cota esgotada) ou por 1 hora (falha). Se a brapi passar a liberar indicadores (plano pago), ela entra antes das duas.

> ⚠️ Termos: o plano grátis da Dados B3 é para "uso próprio: consulta e análise"; montar produto ou serviço sobre os dados exige o plano Empresarial. A bolsai não publica termos de uso. Antes de levar esses números a relatórios de clientes, confirmar com os fornecedores (ver [AJUSTES.md](../AJUSTES.md)).

**Dívida/patrimônio** é dívida bruta ÷ patrimônio líquido, como múltiplo (0,92 = dívida de 92% do patrimônio). Não se aplica a bancos.

Mudar de plano não exige mudança no código: o sistema lê o plano da conta e passa a usar a brapi no que ele liberar. A brapi deixa usar sem plano os tickers de teste PETR4, VALE3, ITUB4, MGLU3, MXRF11 e HGLG11, por isso eles já vêm completos.

| Fase | Provedor | Observação |
|---|---|---|
| Agora (desenvolvimento e início do uso) | **Yahoo Finance**, via biblioteca `yahoo-finance2` (Node) | Gratuito. Ativos da B3 usam o sufixo `.SA` (ex.: `PETR4.SA`). Bom para cotação, histórico de preços e proventos; indicadores fundamentalistas de empresas brasileiras são parciais |
| Depois | **brapi.dev**, plano mais completo | Fonte brasileira, com fundamentos mais completos da B3 |

> ⚠️ **Limites do Yahoo Finance que precisam estar claros:**
> - **Não é uma API oficial.** O Yahoo não oferece API pública documentada; as bibliotecas usam endpoints internos, que podem mudar ou parar sem aviso.
> - **Termos de uso:** os termos do Yahoo restringem o uso comercial dos dados sem autorização. Para uma ferramenta interna em fase inicial o risco é baixo, mas é mais um motivo para migrar para um provedor contratado antes de crescer.
> - **Cobertura:** cotação e histórico funcionam bem; indicadores como ROIC, dívida líquida/EBITDA e dados de FIIs (vacância, número de cotistas) podem faltar. Quando faltar, a tela mostra "indisponível", nunca um número inventado.

**Camada de provedor (obrigatória):** o código nunca chama o Yahoo diretamente das telas. Tudo passa por uma interface única de dados de mercado (`MarketDataProvider`), com funções como `buscarAtivo`, `cotacao`, `historico`, `indicadores` e `proventos`. Trocar o Yahoo pelo brapi depois deve ser trocar só o adaptador, sem mexer em telas nem no banco.

> Investidor10 e Status Invest **não têm API pública**. Copiar dados deles de forma automática (scraping) viola os termos de uso e não deve ser feito.

Regras para a fonte:
- Os dados ficam em **cache** no banco (cotações e indicadores do dia), para a tela abrir rápido e não estourar o limite do provedor.
- Toda tela mostra a **fonte e o horário** do dado (ex.: "Cotação com atraso de 15 min · brapi · 14:32").
- Se o provedor falhar, o sistema mostra o último dado salvo, com a data, e nunca um número sem referência.

## Regras de negócio

- A pesquisa é **ferramenta interna de apoio**: o sistema mostra dados, não emite recomendação de compra ou venda. A decisão é do consultor.
- Material com análise de ativos enviado a clientes segue as regras da CVM para a atividade (consultoria: Resolução CVM 19/2021; relatórios de análise têm regras próprias, Resolução CVM 20/2021). Validar com compliance antes de levar indicadores de ativos para relatórios de clientes.
- Ao adicionar um ativo que foge do perfil do cliente, o sistema avisa e pede justificativa (suitability), como no planejamento ([05](05-planejamento-financeiro.md)).

## Dados

- `ativos`: id, ticker, nome, isin, classe_ativo, tipo, setor, segmento
- `ativo_cotacoes`: ativo_id, data, abertura, maxima, minima, fechamento, volume
- `ativo_indicadores`: ativo_id, data_referencia, indicadores (jsonb), fonte
- `ativo_proventos`: ativo_id, data_com, data_pagamento, tipo, valor_por_cota
- `listas_acompanhamento`: id, workspace_id, nome; `lista_ativos`: lista_id, ativo_id

## Implementação (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261122020000_ativos_relatorios.sql`: `market_cache` (perfil, histórico e proventos por ticker) e `watchlist_items` (lista pessoal, cada consultor vê só a sua).
- **Provedor:** `MarketDataProvider` ganhou `perfil`, `historico` e `proventos` no adaptador do Yahoo Finance; cache de 6 h (perfil) e 12 h (histórico e proventos); falha do provedor mostra o último dado salvo com a data.
- **brapi.dev (22/11/2026):** adaptador `src/lib/mercado/brapi.ts` (API v2: `tickers`, `stocks/quote`, `stocks/profile`, `stocks/statistics`, `stocks/financial-data`, `stocks/historical`, `stocks/dividends`, `fii/indicators`, `fii/dividends`) e camada `src/lib/mercado/index.ts`, que escolhe a fonte de cada dado e usa o Yahoo como reserva. Respeita os limites do plano (ativos por requisição e requisições simultâneas, lidos da conta); recurso fora do plano fica memorizado por 1 h, para não repetir a chamada. Tipo do ativo pelo catálogo da brapi (distingue FII de unit, ex.: TAEE11). Proventos pelo valor efetivamente pago; anunciados e ainda não pagos aparecem como "a pagar" e não entram no total de 12 meses.
- **Telas:** `/ativos` (busca por ticker ou nome + minha lista de acompanhamento com cotação) e `/ativos/[ticker]` (cotação com fonte e horário, gráfico 1M/6M/1A/5A, indicadores por tipo de ativo com "indisponível" quando faltar, proventos com total em 12 meses, uso no Atreides e "Adicionar à carteira" de um cliente).

## Critérios de aceite

- [x] Busca por ticker ou nome retorna ações, FIIs, ETFs e BDRs
- [x] Página do ativo com cotação, gráfico, indicadores e proventos, com fonte e horário
- [ ] Adicionar à carteira mostra o impacto na alocação e alerta de perfil (adicionar já existe; impacto e alerta de perfil ficam no AJUSTES)
- [x] Dados em cache; falha do provedor mostra o último dado com data
- [x] Todo acesso a dados de mercado passa pela camada `MarketDataProvider` (troca de provedor sem mexer nas telas)
- [x] Campo indisponível no provedor aparece como "indisponível"
- [x] Lista de acompanhamento por consultor

## Perguntas em aberto

Nenhuma no momento. Decidido em 21/11/2026: indicadores do conjunto da tabela acima (ajustar quando o Erick disser os que usa, ver [AJUSTES.md](../AJUSTES.md)); renda fixa só por cadastro manual na carteira.

## Histórico de decisões

- 21/11/2026: documento criado a partir do pedido de ter dados técnicos e fundamentalistas para busca de ativos, no estilo da criação de carteiras do Investidor10. Pesquisa básica e cotação de bolsa entram no MVP.
- 21/11/2026: provedor inicial é o Yahoo Finance (gratuito, não oficial); migração para o brapi.dev (plano mais completo) quando houver orçamento; camada de provedor obrigatória para a troca ser simples.
- 21/11/2026: parte do MVP entregue junto com a Carteira: camada `MarketDataProvider` (Yahoo Finance), busca de ativos da B3 por ticker ou nome, cotação com cache e fonte/horário. Faltam a página do ativo (gráfico, indicadores, proventos), a lista de acompanhamento e o alerta de perfil ao adicionar ativo.
- 21/11/2026: página do ativo com o conjunto de indicadores do documento (ações: P/L, P/VP, EV/EBITDA, DY, ROE, margem líquida, dívida/patrimônio, volume; FIIs: P/VP, DY, volume), gráfico 1M a 5A e proventos; cache no banco; lista de acompanhamento por consultor; renda fixa só manual. Adicionar à carteira a partir da página do ativo.
- 21/11/2026: implementado (busca, página do ativo, cache, lista de acompanhamento, adicionar à carteira).
- 22/11/2026: brapi.dev passa a ser a fonte principal, com o Yahoo Finance como reserva automática para o que o plano não libera (hoje o plano é o Gratuito). Proventos anunciados aparecem como "a pagar" e ficam fora do total de 12 meses.
- 22/11/2026: indicadores em cadeia gratuita, por indicador: Dados B3 → bolsai → Yahoo (brapi entra primeiro quando o plano liberar). Dívida/patrimônio padronizada como múltiplo.
