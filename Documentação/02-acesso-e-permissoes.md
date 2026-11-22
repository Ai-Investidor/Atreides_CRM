# 02 · Acesso e permissões

## Objetivo

Garantir que só a equipe da consultoria entre no Atreides, e que cada pessoa veja exatamente o que precisa.

## Quem usa

Todos os usuários. Gabriel configura.

## Papéis

| Papel | Quem | Pode |
|---|---|---|
| **Admin** | Gabriel (único admin) | Tudo: ver todos os workspaces, gerenciar usuários, configurar processos, ver painel completo, exportar dados |
| **Consultor** | Os 2 consultores | Trabalhar no próprio workspace; entrar no workspace de um colega e ver e editar lá; usar todos os módulos de trabalho |

## Workspaces por consultor

Cada consultor tem o **próprio workspace**: os clientes, leads, reuniões, tarefas e carteiras dele. É onde ele cai ao entrar no sistema.

- Um **seletor de workspace** no topo do menu lateral permite navegar até o workspace de um colega.
- Dentro do workspace do colega, o consultor **vê e edita** normalmente (cobre férias, ausências e trabalho conjunto).
- Uma faixa no topo da tela deixa claro onde ele está: "Você está no workspace de [nome]".
- Toda edição feita no workspace de outro consultor fica registrada na auditoria e na linha do tempo do cliente com o nome de quem editou.
- Listas, painel e "Minhas tarefas" mostram só o workspace atual. Nada se mistura.
- O admin pode ver todos os workspaces de uma vez (visão "Consultoria").

## Fluxo de login

1. Usuário abre o Atreides e vê a tela de login (com a citação da *Ilíada* sobre confiança, ver [12 Interface](12-interface-e-design-system.md)).
2. Clica em **Entrar com Google** e usa a conta Google Workspace da AI Invest.
3. O sistema só aceita contas que foram convidadas. Conta Google não convidada é recusada.
4. A verificação em duas etapas é exigida na conta Google (configurada no Google Workspace pelo admin).
5. Entra no Painel do próprio workspace.

**Sessão:** dura **12 horas**. Depois disso, pede login de novo.

## Fluxo de convite de usuário

1. Admin vai em **Administração › Equipe** (menu lateral) e clica em **Convidar consultor**. A seção só aparece para o admin; para os demais, a tela não abre e o banco recusa o convite.
2. Informa nome e e-mail Google. O papel é sempre **consultor** (o admin é único).
3. O sistema registra o convite e mostra uma **mensagem pronta** (link do Atreides + instrução de entrar com Google usando aquele e-mail) para o admin copiar e enviar por WhatsApp ou abrir no e-mail.
4. No primeiro login com aquele e-mail, o banco cria o perfil e o workspace do novo consultor, e o convite sai de "Pendentes".
5. Convite pendente pode ser cancelado. Convite já aceito não pode ser apagado (fica como registro).
6. Não existe cadastro aberto: ninguém cria conta sozinho.

**Envio automático por e-mail:** fica para depois, junto com um serviço de envio de e-mails (o mesmo que os relatórios vão usar).

**Desativar usuário:** o admin desativa (não apaga). Os clientes dessa pessoa precisam ser transferidos para outro consultor antes da desativação.

## Telas

- Login (Entrar com Google)
- Seletor de workspace (menu lateral)
- Administração › Equipe (lista de usuários, convites pendentes, convidar; depois: desativar e transferir clientes, que dependem do módulo Clientes)
- Meu perfil (nome, foto, idioma da interface)

## Regras de negócio

- Todo cliente e todo lead pertence a **um workspace**, o do consultor responsável.
- As permissões são aplicadas **no banco (RLS)**, não só na tela. Esconder um botão não basta.
- Consultores ativos podem ler e editar em qualquer workspace; usuários desativados não acessam nada.
- Só o admin transfere clientes entre workspaces. A transferência fica registrada na linha do tempo do cliente.
- Ações sensíveis ficam na auditoria: login, edição em workspace alheio, exportação de dados, exclusão, mudança de papel.
- **O único admin é o Gabriel.**

## Dados

- `usuarios`: id, nome, email, papel (`admin` | `consultor`), idioma (`pt-BR` | `en`), ativo, criado_em
- `workspaces`: id, consultor_id (dono), nome, criado_em
- `auditoria`: id, usuario_id, workspace_id, acao, tabela, registro_id, antes, depois, criado_em

- `convites` (`invitations` no banco): email, nome, papel, convidado_por, aceito_em. **Só quem está aqui consegue criar conta**: o banco recusa qualquer outro e-mail no momento do primeiro login.

**Convites (21/11/2026):** migration `app/supabase/migrations/20261121150000_convites.sql` (quem convidou gravado pelo banco, e-mail normalizado, bloqueios e auditoria) e tela `/configuracoes/equipe`.

**Implementado em 21/11/2026** na migration `app/supabase/migrations/20261121090000_acesso.sql` (tabelas `profiles`, `workspaces`, `invitations`, `audit_log`). No primeiro login de um convidado, o banco cria o perfil e o workspace dele automaticamente. Um único admin é garantido pelo próprio banco.

Detalhes em [11 Modelo de dados](11-modelo-de-dados.md).

## Critérios de aceite

- [ ] Sem login, nenhuma página nem dado fica acessível
- [ ] Só contas Google convidadas conseguem entrar
- [ ] Cada consultor cai no próprio workspace e consegue navegar para o de um colega
- [ ] Faixa "Você está no workspace de [nome]" sempre visível fora do próprio workspace
- [ ] Edições em workspace alheio aparecem na auditoria com o nome de quem editou
- [ ] Usuário desativado não acessa nada, nem chamando o banco diretamente
- [x] Admin consegue convidar (Administração › Equipe; regras no banco: só admin, e-mail já membro recusado, admin único, convite aceito não se apaga, auditoria)
- [x] Admin consegue transferir clientes (ficha do cliente › Transferir; leva tarefas, processos e histórico)
- [ ] Admin consegue desativar usuário (próximo passo, agora que a transferência existe)
- [ ] Sessão expira em 12 horas

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: cada consultor tem o próprio workspace e pode navegar e editar nos dos colegas; sessão de 12 h; login com Google Workspace; Gabriel é o único admin.
- 21/11/2026: migration de acesso aplicada e testada (convite obrigatório, workspace automático, admin único, consultor não muda o próprio papel).
- 21/11/2026: tela Administração › Equipe (só admin): convidar consultor com mensagem pronta para copiar, convites pendentes, cancelar convite. Envio automático por e-mail fica para depois. Desativar e transferir clientes aguardam o módulo Clientes.
- 21/11/2026: botão Sair corrigido (o formulário dentro do menu sumia antes de enviar; agora é uma ação direta).
- 21/11/2026: o retorno do Google, quando o acesso é por um túnel (ngrok), permanece nesse endereço. O callback lia o host interno do Next (`localhost`) e devolvia o navegador para a máquina local.
- 21/11/2026: transferência de cliente entre workspaces implementada (só admin, na ficha do cliente).
