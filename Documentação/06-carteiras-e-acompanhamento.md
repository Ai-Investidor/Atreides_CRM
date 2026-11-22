# 06 · Carteiras e acompanhamento

## Objetivo

Saber, a qualquer momento, o que cada cliente tem investido, como está distribuído, quanto rendeu e onde a carteira se afastou do planejado.

## Quem usa

Consultores e admin.

## Problema que resolve

"Acompanhar as carteiras dos clientes": hoje as carteiras são montadas no **Investidor10** e atualizadas à mão, cliente por cliente.

## Escopo

**MVP**
- Montar a carteira buscando ativos ([13 Pesquisa de ativos](13-pesquisa-de-ativos.md)), no estilo da criação de carteiras do Investidor10
- Cadastro de posições (ativo, quantidade, preço médio, instituição)
- Importação de posições por planilha (CSV/Excel) no modelo do Atreides
- Atualização de valores por data (fotografia da carteira), com frequência **mensal ou semanal por cliente**
- Cotação atual dos ativos de bolsa (ações, FIIs, ETFs, BDRs) pelo provedor de dados de mercado (Yahoo Finance no início, ver [13](13-pesquisa-de-ativos.md))
- Alocação atual × alocação alvo do planejamento
- Alertas de desvio
- Evolução patrimonial mês a mês

**Fase 2**
- Atualização automática diária dos valores de bolsa
- Rentabilidade comparada a benchmarks (CDI, IPCA, Ibovespa)
- Importação de extratos das corretoras usadas pelos clientes, nesta ordem de prioridade a definir: **Rico, XP, BTG, Inter, Nubank**

**Fase 3**
- Integração automática de posições (ex.: APIs da B3, com autorização do cliente)
- Recomendações vindas da plataforma de IA da AI Invest

## Decisões de construção (21/11/2026)

- **Modelo por lançamentos** (como o Investidor10): ativos de bolsa entram por compras e vendas (data, quantidade, preço pago, total, instituição). O sistema calcula quantidade, preço médio, valor investido e valor atual pela cotação. Renda fixa, fundos e previdência entram por aplicação e resgate, e o saldo é atualizado à mão com data.
- **Plano de aportes do período** (mês ou semana, conforme a frequência do cliente): lista dos ativos que o cliente vai comprar, com ticker (o nome vem sozinho), preço por ação, quantidade e total. Ao executar, cada item vira uma compra na carteira, ligada ao aporte. Isso permite comparar o que foi comprado em cada aporte com o valor atual ao longo da consultoria. Cada plano gera um **PDF para o cliente** no modelo único ([12](12-interface-e-design-system.md), seção 7.1): números-chave (valor do aporte, ativos, período, situação), compras do período (ativo, classe, quantidade, preço de referência, valor e % do aporte), distribuição por classe com a carteira atual, depois do aporte (só no planejado) e o alvo do planejamento, observações e aviso.
- **Busca e cotação** pelo Yahoo Finance, sempre pela camada `MarketDataProvider`, com cache no banco e fonte/horário visíveis. A página completa do ativo é o módulo 13.
- **Fotografias:** "Registrar fotografia" congela o patrimônio da data (total, por classe e por posição). A evolução patrimonial usa as fotografias; a primeira é o **Marco zero** (patrimônio no início da consultoria).
- **Card Marco zero** em vez de formulário próprio: patrimônio inicial (primeira fotografia), renda mensal (ficha do cliente) e despesa mensal (Diagnóstico, doc 14, quando existir). Cada dado tem uma fonte só.
- **Alocação alvo definida na carteira** até o Planejamento (doc 05) existir; depois o Planejamento vira a fonte.
- **Importação** por planilha no modelo do Atreides; adaptador do Investidor10 quando houver arquivo de exemplo. Corretoras (fase 2) ficam para depois.
- **Aba Carteira como dashboard completo** e ficha do cliente ocupando a largura toda da tela.

## Conceitos

- **Ativo:** um investimento (ex.: Tesouro IPCA+ 2035, PETR4, CDB Banco X 110% CDI, fundo Y).
- **Classe de ativo:** agrupamento usado na alocação. Lista padrão:
  - Pós-fixado / Caixa
  - Inflação
  - Prefixado
  - Multimercado
  - Ações Brasil
  - Fundos Imobiliários
  - Internacional / BDR's
  - Alternativos / Cripto
  - Previdência
- **Posição:** quanto o cliente tem de um ativo, numa instituição, numa data.
- **Fotografia:** o conjunto de posições numa data. A evolução patrimonial compara fotografias.

> Lista confirmada: bate com a usada hoje e com a da plataforma de IA da AI Invest.

## Fluxo: registrar a carteira

1. Na aba Carteira do cliente, o consultor escolhe: **buscar e adicionar ativos** (pesquisa com cotação, gráfico e indicadores, ver [13](13-pesquisa-de-ativos.md)), **adicionar manualmente** (renda fixa, previdência, fundos fora da bolsa) ou **importar planilha**.
2. Na importação, baixa o modelo do Atreides, preenche e sobe. O sistema mostra uma prévia, aponta erros e só grava após confirmação.
3. Cada posição tem: ativo, classe, instituição, quantidade, valor atual, data de referência.
4. O sistema salva como uma fotografia na data informada.

## Fluxo: acompanhamento (mensal ou semanal)

Cada cliente tem uma **frequência de acompanhamento**: mensal (padrão) ou semanal, conforme o ritmo de aportes dele.

1. No início de cada mês (e toda segunda-feira, para os semanais), o sistema cria a tarefa "Atualizar carteiras" para cada consultor, listando os clientes daquela frequência.
2. Consultor atualiza os valores (manual ou importação). Uma nova fotografia é criada.
3. O sistema recalcula a alocação e compara com a alvo do planejamento.
4. Desvio acima do limite gera **alerta** no cliente e no painel.

## Telas

**Aba Carteira do cliente**
- Patrimônio total e variação no mês
- Tabela de posições agrupada por classe
- Gráfico de alocação atual × alvo, lado a lado
- Gráfico de evolução patrimonial
- Alertas de desvio

**Visão geral de carteiras** (todos os clientes do consultor)
- Lista com patrimônio, variação, desvio máximo e data da última atualização
- Filtro "desatualizadas há mais de 30 dias"

## Regras de negócio

- **Limite de desvio:** alerta quando uma classe se afasta mais de **5 pontos percentuais** da alvo (configurável).
- Carteira desatualizada: mais de 35 dias sem fotografia (mensal) ou mais de 9 dias (semanal).
- Ativos de bolsa usam a cotação do provedor; renda fixa, fundos e previdência são atualizados à mão ou por importação.
- Valores sempre com a data de referência visível. Nunca mostrar valor sem data.
- Rentabilidade no MVP: variação do patrimônio entre fotografias, descontados aportes e resgates informados.
- Uma fotografia publicada não é editada: corrigir gera uma nova versão, registrada na auditoria.

## Dados

- `ativos`: id, nome, ticker, classe_ativo, tipo, emissor
- `carteira_fotografias`: id, cliente_id, data_referencia, patrimonio_total, criado_por
- `carteira_posicoes`: id, fotografia_id, ativo_id, instituicao, quantidade, preco_medio, valor
- `carteira_movimentacoes`: id, cliente_id, tipo (aporte | resgate), valor, data
- `clientes.frequencia_acompanhamento`: mensal | semanal

## Implementação (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261122010000_carteiras.sql`. Tabelas `assets` (catálogo único), `asset_quotes` (cache de cotação), `portfolio_transactions`, `portfolio_valuations`, `portfolio_snapshots`, `portfolio_targets`, `contributions` + `contribution_items`; colunas `portfolio_frequency` e `deviation_limit` em `clients`; função `contribution_execute`; rotinas (pg_cron) da tarefa "Atualizar carteiras" no dia 1 (mensal) e às segundas (semanal).
- **Regras no banco:** ativo de bolsa exige ticker e usa só compra/venda; workspace e autor definidos pelo banco; aporte executado vira compras e fica travado; exclusões de lançamento, saldo e fotografia vão para a auditoria; fotografia na linha do tempo do cliente (a primeira marcada como Marco zero); tarefa de atualização sem duplicar no mesmo período.
- **Dados de mercado:** camada `src/lib/mercado` (`MarketDataProvider`) com adaptador do Yahoo Finance (`yahoo-finance2` 4.0.5), filtro de tickers da B3, cache de 15 minutos e fonte/horário na tela; falha do provedor mostra a última cotação salva.
- **Telas:** aba Carteira da ficha (tela cheia) com indicadores, evolução patrimonial, Marco zero, alocação atual × alvo, aportes do período (pago × vale hoje), posições por classe e lançamentos; formulários de lançamento, saldo, plano de aportes, execução, fotografia, frequência/limite e importação por planilha; `/carteiras` com a visão geral e o filtro de desatualizadas.
- **Testado no banco:** 8 regras (ticker obrigatório, tipo por ativo, aporte executado e travado, Marco zero, auditoria, tarefa sem duplicar).

## Critérios de aceite

- [x] Montar carteira buscando ativos, com cotação atual dos ativos de bolsa
- [x] Cadastro manual e importação com prévia e validação
- [x] Frequência mensal ou semanal por cliente, com tarefas no ritmo certo
- [x] Alocação atual comparada com a alvo (definida na carteira até o Planejamento existir)
- [x] Alerta de desvio acima do limite
- [x] Evolução patrimonial com pelo menos 2 fotografias
- [x] Tarefa mensal de atualização criada automaticamente
- [x] Carteiras desatualizadas destacadas

## Perguntas em aberto

Nenhuma que bloqueie o MVP. Ficam no [AJUSTES.md](../AJUSTES.md): ordem das corretoras (fase 2) e formato de exportação do Investidor10.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: classes de ativo confirmadas (com "Internacional / BDR's"); limite de desvio de 5 p.p.; acompanhamento mensal ou semanal por cliente; corretoras dos clientes: Rico, XP, Nubank, Inter, BTG; montagem de carteira com pesquisa de ativos e cotação de bolsa entra no MVP.
- 21/11/2026: cotações via Yahoo Finance no início.
- 21/11/2026: carteira por lançamentos (estilo Investidor10) + plano de aportes do período + fotografias; card Marco zero (sem formulário próprio); alvo definido na carteira até o Planejamento existir; busca e cotação pelo Yahoo Finance; dashboard completo em tela cheia.
- 21/11/2026: implementado (banco, provedor de mercado, dashboard da carteira, plano de aportes, fotografias, importação, visão geral).
- 22/11/2026: o card Marco zero passa a mostrar a despesa mensal registrada no Diagnóstico (14).
- 22/11/2026: a alocação alvo passa a vir do Planejamento (05); com planejamento salvo, o alvo não é editado na carteira.
- 22/11/2026: plano de aportes ganha PDF para o cliente, no modelo único de PDF (12, seção 7.1). Gerado na hora, não fica guardado.
