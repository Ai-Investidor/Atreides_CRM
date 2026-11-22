# 07 · Reuniões e agenda

## Objetivo

Chegar a cada reunião preparado em um clique e sair dela com tudo registrado: o que foi decidido, o que cada um vai fazer e quando é a próxima.

## Quem usa

Consultores e admin.

## Problema que resolve

"Preparar reuniões": hoje o consultor junta planilha, WhatsApp e anotações antes de cada conversa.

## Escopo

**MVP**
- Agendar reunião vinculada a cliente ou lead
- Tipos de reunião com pauta padrão
- **Pauta automática** com o contexto do cliente
- Ata com decisões e próximos passos
- Próximos passos viram tarefas
- Agenda do consultor (dia e semana)
- **Sincronização com o Google Calendar** do consultor (nos dois sentidos)
- **Link do Google Meet** criado automaticamente (as reuniões são por Meet)
- **Resumo da reunião enviado ao cliente por e-mail**, após revisão do consultor

**Fase 2**
- Lembrete para o cliente por e-mail/WhatsApp antes da reunião
- Resumo também por WhatsApp

## Etapas de construção

**Etapa 1 (agora): Agenda + Google Calendar + Meet**
- Tela **Agenda** com FullCalendar (v7): visões de dia, semana, mês e lista; arrastar ou esticar uma reunião do Atreides remarca o horário
- **Conectar Google Agenda** (uma vez por consultor): autorização do Google para ler e criar eventos na agenda dele
- A agenda mostra **todos os eventos** do Google Calendar do dono do workspace. Reuniões do Atreides aparecem destacadas e editáveis; os demais eventos só podem ser vistos (com atalho "Abrir no Google Agenda")
- No workspace de um colega, os eventos pessoais dele aparecem só como **"Ocupado"**, sem título nem detalhes
- **Nova reunião:** título, tipo, vínculo (lead ou nenhum), data, hora, duração, formato (Meet ou presencial), **e-mails dos participantes**, descrição. Ao salvar, o evento é criado no Google Calendar com a **sala do Meet** já gerada e os convites enviados aos participantes por e-mail (pelo próprio Google)
- Editar, remarcar e cancelar refletem no Google (os participantes recebem a atualização)
- **Do Google para o Atreides:** ao abrir a agenda, o sistema lê os eventos do período e atualiza as reuniões do Atreides que mudaram ou foram canceladas no Google. Sincronização em tempo real (notificações do Google) fica para depois que o sistema estiver publicado na internet
- **Calendário usado:** sempre o do **dono do workspace** (o consultor responsável). Quem agenda no workspace de um colega entra como participante, e a ação fica na auditoria
- Ficha do lead ganha o botão **Agendar reunião**, já com o lead vinculado

**Etapa 2 (depois de Clientes e Processos):** pauta automática, ata, próximos passos virando tarefas, linha do tempo do cliente, resumo para o cliente por e-mail e lembrete de reunião sem ata.

## Tipos de reunião

| Tipo | Quando | Pauta padrão |
|---|---|---|
| Diagnóstico | Lead novo | Situação atual, objetivos, apresentação da consultoria |
| Onboarding | Cliente novo | Questionário de perfil, documentos, diagnóstico financeiro |
| Apresentação do planejamento | Após montar o plano | Objetivos, estratégia, alocação, recomendações |
| Revisão periódica | A cada 6 meses (padrão) | Evolução, objetivos, desvios da carteira, mudanças de vida |
| Acompanhamento | Quando necessário | Livre |
| Outra | Reunião interna ou sem vínculo | Livre |

## Fluxo: preparar e conduzir

1. Consultor agenda: cliente, tipo, data e hora. O sistema cria o evento no Google Calendar do consultor, convida o cliente e gera o link do Meet.
2. Antes da reunião, abre a reunião e vê a **pauta automática**, montada pelo sistema:
   - Resumo do cliente: perfil, patrimônio, objetivos
   - O que mudou desde a última reunião: evolução da carteira, desvios, aportes
   - Pendências: recomendações em aberto, tarefas atrasadas, perfil vencendo
   - Próximos passos combinados na reunião anterior, com status
   - A pauta padrão do tipo de reunião
3. Durante ou logo depois, o consultor preenche a **ata**: resumo, decisões e próximos passos (o quê, quem, até quando).
4. Ao concluir, cada próximo passo vira **tarefa** ([09](09-processos-e-tarefas.md)) e a reunião entra na linha do tempo do cliente.
5. O sistema monta um **resumo para o cliente** (decisões e próximos passos, sem as anotações internas). O consultor revisa e envia por e-mail.
6. O sistema sugere marcar a próxima reunião.

## Telas

- **Agenda:** visão de dia e de semana, com as reuniões do consultor (o admin vê todos)
- **Reunião:** cabeçalho (cliente, tipo, data), pauta automática, ata, próximos passos
- **Nova reunião:** modal

## Regras de negócio

- Reunião pode pertencer a um lead, a um cliente (quando o módulo Clientes existir) ou a nenhum (reunião interna ou outra).
- Reunião passada sem ata fica marcada como **pendente de registro** e gera lembrete no dia seguinte.
- Cliente ativo sem reunião há mais de 6 meses aparece como alerta no painel.
- A pauta automática é uma "foto" no momento em que a reunião é aberta, e pode ser editada.
- Reuniões são por **Google Meet** por padrão; presencial é exceção, escolhida no agendamento.
- Mudanças feitas no Google Calendar (horário, cancelamento) refletem no Atreides, e vice-versa.
- O resumo enviado ao cliente nunca inclui anotações internas da ata. Só sai depois da revisão do consultor.

## Dados

- `reunioes` (`meetings`): id, workspace_id, lead_id (opcional), cliente_id (quando existir), titulo, tipo, inicio, fim, formato (meet | presencial), local, link_meet, participantes (e-mails), descricao, google_event_id, calendario_de (dono da agenda), status (agendada | realizada | cancelada), criado_por; na etapa 2: resumo, decisoes, resumo_cliente_enviado_em
- `conexoes_google` (`private.google_connections`, fora da API): usuario_id, e-mail Google, token de atualização **criptografado** pelo servidor (a chave nunca vai para o navegador nem para o banco), conectado_em
- `reuniao_proximos_passos`: id, reuniao_id, descricao, responsavel (consultor | cliente), prazo, tarefa_id

## Implementação da etapa 1 (21/11/2026)

- **Banco:** migration `app/supabase/migrations/20261121180000_agenda.sql`. Tabela `meetings` com as regras no próprio banco: dono da agenda e autor definidos pelo banco, lead precisa ser do mesmo workspace, e-mails dos participantes normalizados, período válido (até 12 h), histórico "Reunião agendada" na ficha do lead, auditoria de edição em workspace alheio. Conexão com o Google em `private.google_connections` (fora da API), acessada só por três funções que conferem se a pessoa é da equipe ativa.
- **Token do Google:** o token de atualização é criptografado no servidor (AES-256-GCM, chave `GOOGLE_TOKEN_KEY` em `app/.env.local`) antes de ir para o banco. O banco e o navegador só veem o texto cifrado.
- **Telas:** `/agenda` com FullCalendar 7 (tema classic com a paleta Fortaleza, barra de ferramentas própria), "Nova reunião" em painel lateral (clicar ou arrastar num horário vazio também abre), detalhes da reunião com "Entrar no Meet", editar e cancelar. Arrastar ou esticar uma reunião do Atreides remarca no Google.
- **Sincronização:** `GET /api/agenda/eventos` lê o período no Google e atualiza horário, cancelamento e link do Meet das reuniões do Atreides.
- **Integrações:** botão "Agendar reunião" na ficha do lead (lead já vinculado e e-mail dele sugerido como participante); painel com "Reuniões hoje", próximos 7 dias e card "Agenda de hoje" com atalho para o Meet.
- **Configuração necessária no Google Cloud:** ver `app/README.md` › Google Agenda.

## Critérios de aceite

- [x] Agendar reunião em menos de 30 segundos (tipo, vínculo e título já preenchidos; horário vem do clique na agenda)
- [ ] Pauta automática traz perfil, carteira, pendências e próximos passos anteriores
- [ ] Próximos passos viram tarefas ao concluir a ata
- [ ] Reunião sem ata gera lembrete
- [ ] Reunião aparece na linha do tempo do cliente
- [x] Agendar cria o evento no Google Calendar com link do Meet e convida os participantes por e-mail (falta o teste com a conta real)
- [x] Alteração no Google Calendar reflete no Atreides (ao abrir a agenda; tempo real depois da publicação)
- [ ] Resumo revisado é enviado ao cliente por e-mail, sem anotações internas

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: Google Calendar e Meet entram no MVP; reuniões por Meet; resumo enviado ao cliente por e-mail após revisão.
- 21/11/2026: Agenda construída antes de Clientes, em duas etapas. Etapa 1: FullCalendar + Google Calendar + Meet + participantes por e-mail. Agenda mostra todos os eventos do Google (no workspace de um colega, só "Ocupado"); reunião pode ser ligada a lead ou a nada; evento sempre na agenda do dono do workspace; sincronização do Google ao abrir a agenda (tempo real depois da publicação).
- 21/11/2026: etapa 1 implementada (banco, conexão Google com token cifrado, agenda FullCalendar, Meet, participantes, sincronização ao abrir, ficha do lead e painel).
- 21/11/2026: corrigido loop de requisições na agenda (a fonte de eventos do FullCalendar era recriada a cada render e disparava nova busca sem parar).
- 21/11/2026: app OAuth do Google segue em modo Teste até o deploy (produção exige URLs públicas de página inicial e política de privacidade). Consequência: reconectar a agenda a cada 7 dias; consultores entram como usuários de teste. Pendência para o deploy: criar as páginas de início e de privacidade e publicar o app.
- 21/11/2026: reunião pode ser vinculada a cliente (além de lead); agendar a partir da ficha do cliente entra na linha do tempo dele.
