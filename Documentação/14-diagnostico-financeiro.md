# 14 · Diagnóstico financeiro

## Objetivo

Entender a vida financeira do cliente antes de falar de investimentos. A consultoria do Atreides não é só de investimentos: é **planejamento financeiro**. Ela começa criando estratégias para três coisas:

1. **Controlar gastos**: saber para onde o dinheiro vai e cortar o que não faz sentido.
2. **Otimizar ganhos**: organizar as fontes de renda e achar formas de aumentá-las.
3. **Potencializar o poder de investimento**: transformar o que sobra em aporte constante.

O diagnóstico mede isso e entrega um **plano de ação** que alimenta o planejamento ([05](05-planejamento-financeiro.md)).

## Quem usa

Consultores, junto com o cliente (em reunião de onboarding). Admin acompanha.

## Lugar no atendimento

```
Onboarding → 14 Diagnóstico → 05 Planejamento → 06 Carteira → 08 Relatórios
```

Nenhum planejamento é publicado sem diagnóstico concluído.

## Escopo

**MVP**
- Levantamento de rendas, gastos, dívidas e patrimônio
- Indicadores calculados na hora
- Identificação de oportunidades (cortes, renegociações, aumento de renda)
- Capacidade de investimento atual × potencial
- Plano de ação enviado ao planejamento
- Diagnóstico individual ou do núcleo familiar

**Fase 2**
- Importar extrato bancário ou fatura de cartão (CSV/OFX) com categorização automática dos gastos
- Acompanhamento mensal do orçamento: planejado × realizado
- PDF do diagnóstico para o cliente, com a identidade da marca

## Fluxo

### 1. Levantamento (com o cliente)

| Bloco | O que registrar |
|---|---|
| **Rendas** | Cada fonte: salário, pró-labore, aluguel, renda extra, benefícios. Valor líquido e recorrência (mensal, anual, eventual) |
| **Gastos** | Por categoria (moradia, alimentação, transporte, saúde, educação, lazer, assinaturas, cartão, outros; categorias confirmadas pela consultoria). Tipo: fixo, variável ou eventual. Marcar se é **essencial** |
| **Dívidas** | Credor, saldo devedor, parcela, juros ao mês, prazo restante |
| **Patrimônio** | Investimentos, imóveis, veículos, outros bens |
| **Proteção** | Reserva de emergência atual; seguros existentes (vida, saúde) |

O consultor pode preencher por categoria (valor total) ou detalhar item a item. Começar simples e detalhar onde importa.

### 2. Indicadores (calculados pelo sistema)

| Indicador | Cálculo | Referência (configurável) |
|---|---|---|
| Sobra mensal | Rendas − gastos − parcelas de dívidas | Positiva |
| Taxa de poupança | Sobra ÷ renda | 20% ou mais |
| Comprometimento com dívidas | Parcelas ÷ renda | Até 30% |
| Gastos essenciais | Essenciais ÷ renda | Até 50% |
| Reserva de emergência | Reserva atual ÷ gastos mensais | 6 meses (ajustável por perfil e estabilidade de renda) |
| Dívida mais cara | Maior taxa de juros entre as dívidas | Prioridade de quitação |
| Patrimônio líquido | Patrimônio − dívidas | — |

As referências são pontos de partida configuráveis pelo admin, não regras. Cada indicador fica verde, amarelo ou vermelho em relação à referência, **sempre com texto**, não só cor.

### 3. Oportunidades

O consultor registra (e o sistema sugere a partir dos indicadores):

- **Cortes de gastos**: ex.: assinaturas sem uso, categoria acima da referência. Com impacto mensal estimado.
- **Dívidas**: quitar ou renegociar primeiro as de juros mais altos; trocar dívida cara por barata.
- **Aumento de renda**: ex.: renda extra, revisão de benefícios, otimização tributária (a validar caso a caso).
- **Proteção**: montar ou completar a reserva antes de investir com risco.

### 4. Capacidade de investimento

O sistema mostra lado a lado:

- **Hoje:** a sobra mensal atual.
- **Potencial:** a sobra se as oportunidades forem aplicadas (soma dos impactos mensais).

Essa diferença é o ganho que a consultoria entrega antes de qualquer investimento, e um dos números mais fortes para mostrar ao cliente.

### 5. Plano de ação e conclusão

1. As oportunidades aprovadas com o cliente viram **ações** com meta e prazo (ex.: "Reduzir gastos com delivery para R$ 400/mês até março").
2. O consultor conclui o diagnóstico. As ações e os números vão para o planejamento ([05](05-planejamento-financeiro.md)), bloco "Plano de ação financeiro".
3. O diagnóstico entra na linha do tempo do cliente e libera a etapa "Montar planejamento" do onboarding ([09](09-processos-e-tarefas.md)).

## Revisão

O diagnóstico é refeito (como nova versão) a cada revisão de planejamento, ou antes, se a vida do cliente mudar (emprego, casamento, filho). O sistema compara as versões: a sobra aumentou? as dívidas caíram? a reserva cresceu?

## Telas

- **Aba Diagnóstico** na ficha do cliente, em etapas: Rendas › Gastos › Dívidas › Patrimônio › Resultado
- **Resultado:** indicadores, gráfico de para onde vai o dinheiro (por categoria), capacidade de investimento hoje × potencial, oportunidades e plano de ação
- **Comparativo** entre versões

## Regras de negócio

- Diagnóstico pode ser do cliente ou do núcleo familiar (rendas e gastos somados).
- Valores mensais: rendas e gastos anuais ou eventuais são divididos por 12 automaticamente.
- Um diagnóstico concluído não é editado: atualizar gera nova versão.
- Dados de gastos são sensíveis: mesmas regras de acesso e LGPD do cliente ([02](02-acesso-e-permissoes.md), [01](01-arquitetura-e-stack.md)).
- O sistema sugere, o consultor decide: nenhuma oportunidade entra no plano sem aprovação do consultor.

## Dados

- `diagnosticos`: id, cliente_id ou nucleo_familiar_id, versao, status (rascunho | concluido), totais calculados, concluido_em, concluido_por
- `diagnostico_rendas`: id, diagnostico_id, fonte, valor, recorrencia
- `diagnostico_gastos`: id, diagnostico_id, categoria, descricao, valor, tipo, essencial
- `diagnostico_dividas`: id, diagnostico_id, credor, saldo, parcela, juros_mensal, prazo_meses
- `diagnostico_patrimonio`: id, diagnostico_id, tipo, descricao, valor
- `diagnostico_oportunidades`: id, diagnostico_id, tipo, descricao, impacto_mensal, aprovada

## Critérios de aceite

- [ ] Levantamento de rendas, gastos, dívidas e patrimônio, por categoria ou item a item
- [ ] Indicadores calculados na hora, com status em texto e cor
- [ ] Capacidade de investimento hoje × potencial
- [ ] Oportunidades aprovadas viram ações no planejamento, sem redigitar
- [ ] Planejamento bloqueado até o diagnóstico ser concluído
- [ ] Diagnóstico individual ou familiar; versões comparáveis

## Perguntas em aberto

1. As referências dos indicadores (20% de poupança, 30% de dívidas, 50% de essenciais, 6 meses de reserva) batem com o método da consultoria?
2. O diagnóstico deve virar um documento (PDF) entregue ao cliente já no MVP, ou só no fim do onboarding junto com o planejamento?

## Histórico de decisões

- 21/11/2026: documento criado a partir da orientação: a consultoria começa pelo planejamento financeiro (controle de gastos, otimização de ganhos, potencial de investimento).
- 21/11/2026: categorias de gasto confirmadas; batem com o método da consultoria.
