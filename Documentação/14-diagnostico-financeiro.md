# 14 · Diagnóstico

## Objetivo

Registrar o que o cliente contou na reunião de diagnóstico: **objetivos, dores, sonhos, projetos (carro, imóvel…) e aposentadoria**. É a base do planejamento ([05](05-planejamento-financeiro.md)) e o primeiro documento que o cliente recebe da consultoria.

Reflete como o Erick trabalha hoje: ele transcreve a reunião do Meet e monta o diagnóstico em cima das dores e dos objetivos do cliente. No Atreides, o diagnóstico é um **texto em markdown**: o consultor escreve (ou sobe o arquivo que já montou) e o texto já sai com o formato da apresentação.

## Quem usa

Consultores, na fase de lead (reunião de diagnóstico) e no onboarding do cliente. Admin acompanha.

## Lugar no atendimento

```
Lead (reunião de diagnóstico) → 14 Diagnóstico → conversão em cliente → 05 Planejamento → 06 Carteira → 08 Relatórios
```

## Escopo

**MVP**
- Um diagnóstico por lead/cliente, em markdown, que já começa com o modelo de seções
- Editor com barra de formatação (título, negrito, itálico, lista), visualização formatada e envio de arquivo `.md` ou `.txt`
- Dois campos estruturados: **despesa mensal** (vai para o card Marco zero da carteira) e **idade pretendida para se aposentar** (vai para o Planejamento)
- Histórico: cada vez que o consultor salva, a versão anterior fica guardada
- Nasce na ficha do lead e segue para o cliente na conversão, sem redigitar
- **Modo apresentação** na tela (para mostrar na reunião) e **PDF com a identidade da Atreides**

**Depois** (ver [AJUSTES.md](../AJUSTES.md))
- Levantamento numérico completo (rendas, gastos, dívidas, patrimônio, indicadores como taxa de poupança e reserva de emergência), que era o escopo original deste documento
- Gerar o rascunho do diagnóstico a partir da transcrição da reunião com IA (exige decisão de compliance: hoje a regra do projeto é não enviar dados de clientes a serviços externos)

## Modelo de seções

O diagnóstico novo começa com este texto, que o consultor apaga, completa ou reorganiza:

```markdown
## Objetivos
## Dores
## Sonhos
## Planejamento
_Compras e projetos (carro, imóvel, viagem…), com valor e prazo._
## Aposentadoria
_Com quantos anos pretende se aposentar e com qual renda._
```

## Fluxo

1. Na ficha do lead (etapa Diagnóstico do funil), o consultor abre o cartão **Diagnóstico** e clica em **Escrever diagnóstico**.
2. Escreve no editor ou clica em **Subir arquivo** (`.md` ou `.txt`, até 1 MB). O conteúdo do arquivo entra no editor; se já houver texto, o sistema pergunta antes de substituir.
3. Preenche, se souber, a despesa mensal e a idade pretendida para se aposentar.
4. Clica em **Salvar**. A versão anterior vai para o histórico.
5. Na conversão do lead em cliente, o diagnóstico passa para a aba **Diagnóstico** do cliente, e a etapa "Concluir o diagnóstico" do onboarding se conclui sozinha.
6. Para apresentar: **Apresentar** abre o texto em tela cheia, com tipografia grande; **Baixar PDF** gera o documento com a marca.
7. Cliente sem diagnóstico vindo do lead (ex.: cliente migrado) escreve direto na aba Diagnóstico.

## Regras de negócio

- Um diagnóstico por lead e por cliente.
- Salvar com texto conclui a etapa "Concluir o diagnóstico" do processo do cliente.
- Cada salvamento guarda a versão anterior (texto e campos), com data e autor. Versões antigas não são editadas.
- Despesa mensal: valor em reais, maior ou igual a zero. Idade de aposentadoria: entre 30 e 100 anos.
- O PDF não é guardado: é gerado na hora, a partir da versão atual.
- O PDF e o modo apresentação nunca mostram o perfil de investidor (regra de [03](03-clientes.md)).
- Dados sensíveis: mesmas regras de acesso e LGPD do cliente. Entra na exportação LGPD e acompanha o cliente numa transferência de workspace.
- Lead excluído sem ter virado cliente leva o diagnóstico junto.
- Markdown sem HTML: o texto é exibido com segurança (sem executar código colado).

## Dados

- `diagnoses`: id, workspace_id, lead_id, client_id, content_md, monthly_expense, retirement_age, version, created_by, updated_by, created_at, updated_at
- `diagnosis_versions`: id, diagnosis_id, version, content_md, monthly_expense, retirement_age, saved_by, saved_at

## Integrações

- **Carteira ([06](06-carteiras-e-acompanhamento.md)):** o card Marco zero mostra a despesa mensal do diagnóstico.
- **Planejamento ([05](05-planejamento-financeiro.md)):** parte do diagnóstico (texto, despesa mensal e idade de aposentadoria).
- **Linha do tempo:** salvar o diagnóstico do cliente gera o evento "Diagnóstico atualizado".

## Implementação (22/11/2026)

- **Banco:** migration `app/supabase/migrations/20261122040000_diagnostico.sql`: `diagnoses` (um por lead e por cliente) e `diagnosis_versions` (gravada só pelo banco a cada salvamento). Gatilhos: workspace, autor e versão definidos pelo banco; conversão do lead liga o diagnóstico ao cliente e conclui a etapa do onboarding; salvar no cliente gera o evento "Diagnóstico atualizado"; lead excluído sem virar cliente leva o diagnóstico; transferência de workspace inclui o diagnóstico. Etapas renomeadas para "Concluir o diagnóstico" / "Fazer o diagnóstico".
- **Telas:** cartão Diagnóstico na ficha do lead e aba Diagnóstico do cliente (`src/components/diagnostico/card-diagnostico.tsx`): leitura formatada, editor com barra de formatação, envio de `.md`/`.txt`, visualização lado a lado (abas em telas menores), despesa mensal e idade de aposentadoria, histórico de versões e modo apresentação em tela cheia.
- **PDF:** `src/lib/diagnostico/pdf.tsx` e rota `/api/diagnostico/[id]/pdf` (gerado na hora, não guardado), com a identidade compartilhada com os relatórios em `src/lib/pdf/marca.tsx`.
- **Integrações:** card Marco zero da carteira mostra a despesa mensal; exportação LGPD do cliente inclui o diagnóstico e as versões.
- **Pendente:** teste das regras no banco (o teste automático com cliente e lead fictícios foi bloqueado pelo filtro de segurança) e teste logado.

## Critérios de aceite

- [x] Editor de markdown com modelo de seções, visualização formatada e envio de `.md`/`.txt`
- [x] Despesa mensal e idade de aposentadoria salvas e validadas
- [ ] Diagnóstico escrito no lead aparece no cliente após a conversão, com a etapa do onboarding concluída
- [x] Histórico de versões
- [x] Modo apresentação e PDF com a identidade da marca
- [x] Marco zero da carteira mostra a despesa mensal

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado a partir da orientação: a consultoria começa pelo planejamento financeiro (controle de gastos, otimização de ganhos, potencial de investimento).
- 21/11/2026: categorias de gasto confirmadas; batem com o método da consultoria.
- 22/11/2026: redefinido a partir do método do Erick (transcrição da reunião + diagnóstico sobre dores e objetivos). O diagnóstico vira um texto em markdown com modelo de seções (objetivos, dores, sonhos, planejamento, aposentadoria), mais despesa mensal e idade de aposentadoria; nasce no lead e segue para o cliente; histórico de versões; modo apresentação e PDF com a marca. O levantamento numérico completo e a geração com IA ficam para depois. As perguntas em aberto anteriores (referências dos indicadores, PDF no MVP) deixam de se aplicar ou foram resolvidas (PDF entra).
- 22/11/2026: implementado (banco, editor, apresentação, PDF, histórico, ligação com lead, cliente, onboarding e carteira).
