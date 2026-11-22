# 04 · Leads e funil

## Objetivo

Organizar quem está interessado na consultoria e garantir que **nenhum lead fique sem retorno**. Do primeiro contato ao contrato assinado.

## Quem usa

Consultores e admin.

## Problema que resolve

"Cobrar retorno de leads": hoje o follow-up depende de memória e de rolar o WhatsApp.

## Escopo

**MVP**
- Cadastro rápido de lead
- Funil em quadro (kanban) com etapas
- Próximo contato obrigatório, com data
- Fila "Retornos de hoje"
- Registro de contatos (ligação, WhatsApp, reunião, e-mail)
- Conversão em cliente
- Motivo de perda

**Origens de lead (lista fixa):** Instagram, Prospecção ativa, Indicação, AI Invest, Outro. As duas primeiras são as principais.

**Depois**
- Proposta comercial em PDF gerada pelo sistema (ainda não existe modelo)
- Formulário público de captação (site / Instagram) que cria o lead sozinho
- Mensagens de WhatsApp sugeridas para cada etapa
- Integração com a plataforma de IA da AI Invest (usuários da IA que pedem consultoria viram lead)

## Etapas do funil

| Etapa | Significado | Sai quando |
|---|---|---|
| **Novo** | Acabou de chegar | Primeiro contato feito |
| **Em contato** | Conversa iniciada | Reunião de diagnóstico marcada |
| **Diagnóstico** | Reunião inicial marcada ou feita | Proposta enviada |
| **Proposta** | Proposta de consultoria enviada | Aceite ou recusa |
| **Ganho** | Contrato fechado | Vira cliente |
| **Perdido** | Não seguiu | Registrar motivo |

## Fluxo: do lead ao cliente

1. Consultor cadastra o lead em segundos: nome, celular, origem. O resto é opcional.
2. Sistema pede o **próximo contato** (data + o que fazer). Lead sem próximo contato não pode ficar em etapa aberta.
3. Todo dia, o consultor abre **Retornos de hoje**: a lista dos leads com contato marcado para hoje ou atrasado.
4. Após cada contato, registra em uma linha o que aconteceu e marca o próximo.
5. Arrasta o card no quadro conforme avança.
6. Em **Ganho**, o sistema pergunta: "Converter em cliente?" Os dados vão para o cadastro de cliente ([03](03-clientes.md)) e o onboarding começa.
7. Em **Perdido**, motivo obrigatório: preço, sem perfil, sem retorno, escolheu outra consultoria, outro.

## Telas

- **Quadro do funil:** colunas por etapa, cards com nome, origem, dias na etapa e próximo contato (vermelho se atrasado)
- **Retornos de hoje:** lista simples, ordenada por atraso, com botão de registrar contato
- **Ficha do lead:** dados, histórico de contatos, próximo contato, botão converter
- **Cadastro rápido:** modal com 3 campos

## Regras de negócio

- Lead sempre tem consultor responsável (quem cadastrou, se não for informado outro).
- Lead parado mais de **7 dias** sem contato registrado aparece destacado (confirmado).
- Celular único entre leads abertos: avisar duplicidade (pode ser alguém que voltou).
- Lead perdido pode ser reaberto. O histórico continua.
- A conversão preserva o histórico: os contatos do lead aparecem na linha do tempo do cliente.

## Dados

- `leads`: id, nome, celular, email, origem, indicado_por, etapa, consultor_id, proximo_contato_em, proximo_contato_descricao, motivo_perda, cliente_id (após conversão), criado_em
- `lead_contatos`: id, lead_id, tipo (ligação, WhatsApp, reunião, e-mail), resumo, usuario_id, criado_em

## Implementação (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261121120000_leads.sql` (tabelas `leads` e `lead_contacts`). Regras garantidas pelo próprio banco: próximo contato obrigatório em etapa aberta, motivo obrigatório na perda, histórico automático de cadastro e mudança de etapa, histórico imutável, auditoria de edição em workspace alheio.
- **Telas:** `/leads` (quadro com arrastar e soltar + aba "Retornos de hoje" + indicadores) e `/leads/[id]` (ficha com histórico, próximo contato, dados e ações). Cadastro rápido em painel lateral, também acessível pelo botão "Novo" da barra superior e pelo painel.
- **Painel:** indicador de leads em aberto e card "Retornos de leads" com os 5 mais urgentes.
- **Extras:** aviso de celular duplicado com opção de ver o lead existente; atalho para o WhatsApp; atalhos de data (Hoje, Amanhã, +3 dias, +1 semana); leads encerrados há mais de 90 dias saem do quadro.
- **Pendente:** "Converter em cliente" aparece como "Em breve" até o módulo Clientes (03) existir.

## Critérios de aceite

- [x] Lead cadastrado em menos de 15 segundos (3 campos obrigatórios; próximo contato já vem preenchido com "hoje · Primeiro contato")
- [x] Impossível deixar lead aberto sem próximo contato (regra no banco)
- [x] "Retornos de hoje" mostra os de hoje e os atrasados
- [x] Arrastar card muda a etapa e registra no histórico
- [ ] Conversão cria o cliente com os dados e o histórico do lead (depende do módulo Clientes)
- [x] Perda exige motivo (regra no banco)

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: etapas do funil confirmadas; origens principais são Instagram e prospecção ativa; lead parado após 7 dias; proposta comercial em PDF fica para depois (ainda não há modelo).
- 21/11/2026: módulo implementado (banco, quadro, retornos, ficha, cadastro rápido, painel). Conversão em cliente aguarda o módulo Clientes.
