# 05 · Planejamento financeiro e de investimentos

## Objetivo

Transformar o diagnóstico em plano: a partir das **dores** e dos **sonhos** do cliente ([14](14-diagnostico-financeiro.md)), montar as **metas e objetivos**, a **estratégia** e a **proporção da carteira** entre renda fixa e renda variável, adequada ao perfil de investidor.

## Quem usa

Consultores. Admin acompanha.

## Como funciona hoje

Hoje só o Erick tem clientes. Ele monta as carteiras dos clientes no **Investidor10** e todo mês envia um **PDF** com o planejamento de investimento do mês. O Atreides substitui esse processo: planejamento aqui, carteira aqui ([06](06-carteiras-e-acompanhamento.md)) e PDF saindo do sistema.

## Lugar no atendimento

```
14 Diagnóstico (dores, sonhos)  →  05 Planejamento (metas, estratégia, alocação)  →  06 Carteira  →  08 Relatórios
```

## Princípio: sem promessa de rentabilidade

O sistema **não traz rentabilidade pronta** e não promete retorno. A lógica da consultoria é que a carteira tem partes com referências diferentes (algumas acima da inflação, outras acima do CDI) e partes de renda variável, com mais risco e potencial maior. **O que muda o resultado é a proporção** entre renda fixa e renda variável, adequada ao perfil de investidor.

Por isso:
- a premissa de cada classe é escrita pelo consultor, no formato do mercado: **% do CDI**, **IPCA + x%** ou **prefixado x%**;
- o CDI e o IPCA de referência vêm do **Banco Central** (acumulados dos últimos 12 meses) e podem ser ajustados pelo consultor;
- o sistema combina as premissas pela proporção e mostra a **rentabilidade simulada da carteira** (ex.: "IPCA + 4,1% ao ano · 108% do CDI");
- todo número calculado é chamado de **simulação**, nunca de "projeção" ou "retorno esperado", e vem com o aviso: "Simulação ilustrativa, com premissas do consultor. Rentabilidade não é garantida e investimentos podem ter perdas.";
- as contas são feitas **em reais de hoje** (acima da inflação), para o cliente entender o poder de compra.

## Escopo

**MVP**
- Texto em markdown, como o diagnóstico, que já começa com o modelo de seções; o diagnóstico fica visível ao lado enquanto o consultor escreve
- **Objetivos**: nome, valor (em reais de hoje), prazo e quanto já está guardado. Para cada um, o sistema mostra o **aporte mensal necessário** na rentabilidade simulada da carteira
- **Aporte mensal** combinado com o cliente e **simulação da aposentadoria**: patrimônio na idade pretendida (do diagnóstico), partindo da última fotografia da carteira
- **Alocação alvo por classe** (as 9 classes da carteira), com os totais de **renda fixa**, **renda variável** e **outros**, a premissa de cada classe e o perfil de investidor do cliente ao lado
- A alocação do planejamento **vira o alvo da carteira** do cliente
- Histórico: salvar guarda a versão anterior
- Modo apresentação e **PDF com a identidade da Atreides** (texto, objetivos, alocação, simulação e aviso)
- Tarefa "Revisar planejamento" 6 meses depois do último salvamento

**Depois** (ver [AJUSTES.md](../AJUSTES.md))
- Faixas de renda variável por perfil de investidor com alerta e justificativa (depende da política de suitability)
- Planejamento do núcleo familiar
- Comparativo visual entre versões

## Modelo de seções

```markdown
## Metas e objetivos
## Estratégia
## Plano de ação
## Recomendações
```

## Fluxo

1. A tarefa "Montar planejamento" do onboarding leva à aba **Planejamento** do cliente. Sem diagnóstico, a tela avisa, mas não bloqueia (ex.: cliente migrado com planejamento já existente).
2. **Escrever planejamento** abre o editor, com o diagnóstico ao lado (botão "Ver diagnóstico") para consultar as dores e os sonhos.
3. O consultor escreve as metas, a estratégia, o plano de ação e as recomendações (ou sobe um `.md`/`.txt`).
4. Cadastra os objetivos (nome, valor, prazo, já guardado).
5. Define a alocação: o % de cada classe (precisa somar 100%) e a premissa de cada classe com %. Confere os totais RF × RV ao lado do perfil de investidor.
6. Informa o aporte mensal. Confere o CDI e o IPCA de referência.
7. O sistema mostra a rentabilidade simulada da carteira, o aporte necessário de cada objetivo e o patrimônio simulado na aposentadoria.
8. **Salvar**: a versão anterior vai para o histórico, o alvo da carteira é atualizado, a etapa "Montar planejamento" se conclui e a revisão fica agendada para daqui a 6 meses.
9. **Apresentar** e **Baixar PDF** como no diagnóstico.

## Cálculos (simulação)

- Taxa nominal de cada classe: **% do CDI** = CDI × %; **IPCA + x%** = (1 + IPCA) × (1 + x) − 1; **prefixado x%** = x.
- Taxa da carteira = soma de (proporção × taxa nominal) das classes com %. Todas as classes com % precisam ter premissa para a simulação aparecer.
- Taxa real (acima da inflação) = (1 + taxa da carteira) / (1 + IPCA) − 1. Também mostrada como % do CDI.
- Mensal: (1 + taxa real)^(1/12) − 1.
- **Aporte necessário** de um objetivo: valor que, aplicado todo mês até o prazo, somado ao que já está guardado, chega ao valor do objetivo. Se o já guardado basta, mostra "coberto pelo valor guardado".
- **Aposentadoria:** patrimônio da última fotografia da carteira + aporte mensal, até a idade pretendida (data de nascimento da ficha + idade do diagnóstico). Sem data de nascimento ou idade, a tela diz o que falta.

## Regras de negócio

- Um planejamento por cliente.
- Alocação: soma de 100% (tolerância de 0,01 p.p.); cada % entre 0 e 100.
- Premissas: % do CDI entre 0 e 300; IPCA + x% e prefixado entre −20% e 100% ao ano. CDI e IPCA de referência entre 0% e 100% ao ano.
- Salvar o planejamento substitui o alvo da carteira pelas classes com % (classes sem % saem do alvo). Enquanto houver planejamento com alocação, o alvo não é editado na carteira, só no planejamento.
- Cada salvamento guarda a versão anterior completa (texto, objetivos, alocação, premissas, aporte e referências), com data e autor.
- O PDF e o modo apresentação nunca mostram o perfil de investidor (regra de [03](03-clientes.md)); a tela do consultor mostra.
- Dados sensíveis: mesmas regras de acesso e LGPD do cliente. Entra na exportação LGPD e acompanha o cliente na transferência.

## Dados

- `plans`: id, workspace_id, client_id, content_md, monthly_contribution, cdi_ref, ipca_ref, version, created_by, updated_by, created_at, updated_at
- `plan_allocations`: plan_id, asset_class, target_pct, premise_kind (cdi_pct | ipca_plus | prefixed), premise_value
- `plan_goals`: id, plan_id, position, name, target_value, target_date, saved_value
- `plan_versions`: id, plan_id, version, snapshot (jsonb com tudo), saved_by, saved_at

## Implementação (22/11/2026)

- **Banco:** migration `app/supabase/migrations/20261122050000_planejamento.sql`: `plans`, `plan_allocations`, `plan_goals`, `plan_versions`; salvar só pela função `public.plan_save` (valida 100% e premissas, guarda a versão anterior, troca objetivos e alocação, atualiza o alvo da carteira, gera o evento "Planejamento atualizado", conclui a etapa "plan" e fecha a tarefa de revisão); gatilho que impede editar o alvo da carteira quando há planejamento; rotina diária (pg_cron) da tarefa "Revisar planejamento"; transferência de workspace inclui o planejamento.
- **Cálculos:** `src/lib/planejamento/regras.ts` (taxa por premissa, taxa da carteira, totais RF × RV × outros, aporte necessário, patrimônio futuro), conferidos com 12 casos de teste (inclusive ida e volta aporte × patrimônio).
- **Telas:** aba Planejamento do cliente (`src/components/planejamento/card-planejamento.tsx`): leitura (resumo, aviso, texto, objetivos, proporção, aposentadoria), edição (editor com o diagnóstico ao lado, aporte, CDI/IPCA com o valor do Banco Central, alocação das 9 classes com premissa, objetivos com aporte ao vivo), apresentação e histórico. A carteira mostra "Alvo no planejamento" no lugar de editar o alvo.
- **PDF:** `src/lib/planejamento/pdf.tsx` e rota `/api/planejamento/[id]/pdf`, com a identidade compartilhada (`src/lib/pdf/marca.tsx`, `src/lib/pdf/markdown.tsx`).
- **Componentes compartilhados com o diagnóstico:** `src/components/documento/` (markdown, editor, apresentação).
- **Pendente:** aplicar a migration (o filtro de segurança recusou a aplicação automática) e testar logado.

## Critérios de aceite

- [x] Editor de markdown com modelo de seções, diagnóstico visível ao lado e envio de `.md`/`.txt`
- [x] Objetivos com aporte mensal necessário na rentabilidade simulada
- [x] Alocação por classe somando 100%, com totais RF × RV × outros, premissas e perfil ao lado
- [x] Rentabilidade simulada da carteira a partir das premissas e do CDI/IPCA do Banco Central, sempre com o aviso
- [x] Simulação da aposentadoria
- [ ] Alocação do planejamento vira o alvo da carteira
- [x] Histórico de versões, modo apresentação e PDF
- [ ] Tarefa de revisão 6 meses depois

## Perguntas em aberto

Nenhuma no momento. (O PDF mensal do Erick segue como referência futura para os relatórios, doc 08.)

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: revisão a cada 6 meses; planejamento pode ser familiar; sem premissa de rentabilidade padrão (simulação só com premissa do consultor e aviso obrigatório); diagnóstico vira fluxo próprio ([14](14-diagnostico-financeiro.md)); pesquisa de ativos vira fluxo próprio ([13](13-pesquisa-de-ativos.md)); referência atual: carteiras no Investidor10 + PDF mensal do Erick.
- 21/11/2026: Gabriel vai pedir ao Erick o PDF mensal como referência.
- 22/11/2026: o diagnóstico (14) passou a ser um texto em markdown com despesa mensal e idade de aposentadoria; o ponto de partida do planejamento usa esses dados.
- 22/11/2026: redefinido no fluxo do diagnóstico: texto em markdown (metas, estratégia, plano de ação, recomendações) com o diagnóstico ao lado; objetivos com aporte necessário; alocação por classe com totais RF × RV; premissa por classe (% do CDI, IPCA + x%, prefixado) com CDI e IPCA do Banco Central, combinadas pela proporção (sem rentabilidade pronta nem promessa); simulação da aposentadoria; alocação vira o alvo da carteira; histórico, apresentação, PDF e revisão em 6 meses. Diagnóstico deixa de bloquear o planejamento (só avisa). Planejamento familiar, faixas por perfil e comparativo entre versões ficam para depois.
- 22/11/2026: implementado (código, telas, PDF e cálculos); falta aplicar a migration no banco.
