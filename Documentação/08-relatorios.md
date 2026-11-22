# 08 · Relatórios para o cliente

## Objetivo

Gerar o relatório periódico do cliente a partir dos dados que já estão no sistema. O consultor revisa, comenta e envia. De horas para minutos.

## Quem usa

Consultores (gerar e enviar). Admin (modelos e acompanhamento).

## Problema que resolve

"Montar relatório para o cliente": hoje é feito à mão, copiando de planilhas.

## Escopo

**Fase 2** (depende de carteiras e planejamentos alimentados)
- Relatório em PDF com a identidade da marca, na **periodicidade definida por cliente**
- Comentário do consultor
- Histórico de relatórios enviados

- Envio por **e-mail e WhatsApp**

**Depois**
- Geração em lote (todos os clientes de uma vez)
- Texto de análise sugerido por IA, revisado pelo consultor

## Decisões de construção (21/11/2026)

- **Envio:** depois de aprovar, o consultor baixa o PDF e abre o WhatsApp ou o e-mail dele com uma mensagem pronta; anexa o PDF e clica em **Marcar como enviado** (canal registrado na linha do tempo). Nada de link público para o PDF. Envio automático (serviço de e-mail e WhatsApp Business) fica no [AJUSTES.md](../AJUSTES.md).
- **CDI e IPCA** já entram, pela API pública e oficial do Banco Central (SGS: CDI série 12, IPCA série 433), com cache no banco. Aparecem no relatório e no Marco zero da carteira.
- **Rentabilidade do período:** variação entre a fotografia do início e a do fim, descontados aportes e resgates do período. Acumulada: desde o Marco zero.
- **Objetivos do planejamento:** a seção entra quando o Planejamento (05) existir; até lá o relatório não a mostra.
- **Periodicidade por cliente:** mensal (padrão), trimestral ou semestral, na aba Dados. A tarefa "Gerar relatório" nasce no 1º dia após o fim do período.
- **PDF gerado no servidor** (`@react-pdf/renderer`), com as fontes e a identidade da marca, guardado em armazenamento privado.

## Conteúdo do relatório

| Seção | Fonte |
|---|---|
| Capa | Nome do cliente, período, logo, faixa de meandro |
| Resumo do período | Patrimônio inicial e final, aportes, resgates, variação |
| Evolução patrimonial | Gráfico das fotografias da carteira ([06](06-carteiras-e-acompanhamento.md)) |
| Alocação | Atual × alvo, com explicação dos desvios |
| Rentabilidade | Do período e acumulada, comparada a CDI e IPCA (fase 2 de carteiras) |
| Objetivos | Progresso de cada objetivo do planejamento ([05](05-planejamento-financeiro.md)) |
| Comentário do consultor | Texto livre: leitura do período e próximos passos |
| Aviso legal | Rentabilidade passada não garante rentabilidade futura; material informativo |
| Selo | Selo dracma da Atreides, como marca de documento oficial |

## Fluxo

1. Na data prevista pela periodicidade do cliente, o sistema cria a tarefa "Gerar relatório". O consultor abre o cliente › Relatórios › **Gerar relatório** (o período já vem preenchido).
2. Sistema confere se a carteira tem fotografia no início e no fim do período. Se faltar, avisa.
3. Sistema monta a prévia com todos os números.
4. Consultor escreve o comentário e revisa.
5. Clica em **Aprovar**: o PDF é gerado e guardado no histórico do cliente.
6. Consultor envia por e-mail e/ou WhatsApp. O envio fica registrado na linha do tempo.

## Regras de negócio

- Cada cliente tem a própria periodicidade de relatório (ex.: mensal, trimestral), definida no cadastro.
- Não existe modelo de relatório hoje: o modelo será criado do zero no Atreides, seguindo o design guide. Referência útil: o PDF mensal que o Erick envia hoje ([05](05-planejamento-financeiro.md)).
- Relatório aprovado não muda. Se houver erro, gera uma nova versão e a anterior fica marcada como substituída.
- O comentário do consultor é obrigatório: o relatório nunca sai só com números.
- Sem promessas: o texto padrão e os títulos seguem o tom da marca (firme, sereno, sem hype) e nunca prometem retorno.
- Identidade visual conforme `identidade/design-guide.md`: capa marinho, miolo osso/branco, latão só como acento.

## Dados

- `relatorios`: id, cliente_id, periodo_inicio, periodo_fim, comentario, status (rascunho | aprovado | substituido), arquivo_pdf, aprovado_por, aprovado_em, enviado_em

## Implementação (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261122020000_ativos_relatorios.sql`: `reports` (rascunho, aprovado, substituído; versão; números congelados em `data`; PDF em armazenamento privado `client-reports`), `benchmark_rates` (CDI e IPCA do Banco Central), `clients.report_frequency` e rotina diária (pg_cron) que cria a tarefa "Gerar relatório" no dia 1 após o fim do período.
- **Regras no banco:** comentário obrigatório para aprovar; aprovado não muda (só registra envio); nova versão aprovada marca a anterior como substituída; aprovação e envio na linha do tempo; aprovar conclui a tarefa do período. Testadas 7 regras.
- **PDF:** `src/lib/relatorios/pdf.tsx` (`@react-pdf/renderer`, Inter e Schibsted Grotesk embutidas, selo dracma em `app/assets/pdf/selo.png`): capa marinho com símbolo e meandro, resumo, rentabilidade × CDI e IPCA, evolução, alocação × alvo, principais posições, comentário assinado, selo e aviso legal.
- **Telas:** aba Relatórios na ficha do cliente (histórico + Gerar relatório com período sugerido), `/relatorios/[id]` (prévia com os números, avisos de fotografia faltando, comentário, aprovar, baixar PDF, WhatsApp/e-mail com mensagem pronta, marcar como enviado, nova versão) e `/relatorios` (a gerar + recentes). Periodicidade na aba Dados.
- **Carteira:** o card Marco zero passou a mostrar CDI e IPCA no mesmo período.

## Critérios de aceite

- [x] Relatório gerado com dados reais da carteira (os objetivos do planejamento entram com o módulo 05)
- [x] Aviso quando faltam fotografias no período
- [x] Comentário obrigatório antes de aprovar
- [x] PDF com a identidade da marca
- [x] Histórico por cliente, com relatórios substituídos marcados
- [x] Tarefa criada na periodicidade de cada cliente
- [x] Envio por e-mail e WhatsApp registrado na linha do tempo (envio manual com mensagem pronta)

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: periodicidade definida por cliente; sem modelo atual (criar do zero); envio por e-mail e WhatsApp.
- 21/11/2026: envio por PDF + mensagem pronta (marcar como enviado); CDI e IPCA via Banco Central; seção de objetivos aguarda o Planejamento; periodicidade mensal, trimestral ou semestral.
- 21/11/2026: implementado (banco, PDF, prévia, aprovação, envio, histórico, tarefa por periodicidade, CDI e IPCA).
