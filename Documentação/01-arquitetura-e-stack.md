# 01 · Arquitetura e stack

## Objetivo

Definir com o que o Atreides será construído, como o código se organiza e como os dados ficam protegidos. As escolhas priorizam: equipe pequena, entrega rápida, baixo custo e segurança.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação web | **Next.js** (App Router) + **TypeScript** | Um projeto só para telas e servidor; padrão de mercado, fácil achar ajuda e devs |
| Banco de dados | **Supabase** (PostgreSQL) | Banco relacional robusto, autenticação pronta, armazenamento de arquivos, segurança por linha (RLS). O Supabase já está conectado ao Claude, o que acelera o desenvolvimento |
| Autenticação | **Supabase Auth** com **login Google** | Entrada pela conta Google Workspace da AI Invest, sem construir login do zero |
| Arquivos | **Supabase Storage** | Documentos de clientes e PDFs de relatórios, com acesso controlado |
| Interface | **Tailwind CSS** + componentes próprios (base shadcn/ui) | Aplicação rápida do design system da marca |
| Validação | **Zod** | Mesmas regras de validação no formulário e no servidor |
| Gráficos | **Recharts** | Alocação e evolução patrimonial |
| PDF | Geração no servidor (React PDF) | Relatórios e planejamentos com a identidade da marca |
| Hospedagem | **Vercel** | Deploy automático a cada push, ambiente de teste por branch |
| Idiomas | **next-intl** | Interface em português e inglês, com troca de idioma pelo usuário |
| Integrações Google | **Google Calendar API** + **Meet** | Agenda sincronizada e link de reunião automático ([07](07-reunioes-e-agenda.md)). Chamadas REST direto do servidor, sem SDK; token de cada consultor cifrado antes de ir ao banco |
| Calendário na tela | **FullCalendar 7** (`@fullcalendar/react`, licença MIT) | Visões de dia, semana, mês e lista, com arrastar para remarcar |
| Dados de mercado | **Yahoo Finance** (`yahoo-finance2`) agora; **brapi.dev** depois | Cotações, gráficos e indicadores. Acesso sempre por uma camada de provedor, para a troca ser simples (ver [13](13-pesquisa-de-ativos.md)) |

Stack confirmada como alinhada à da plataforma de IA da AI Invest.

## Responsável e organização

- **Responsável técnico:** Gabriel.
- **Código:** dentro deste workspace, na pasta `app/` (não é repositório separado).
- **Idioma do código e do banco:** inglês (nomes de tabelas, colunas, variáveis). É o padrão de mercado, facilita a unificação com a plataforma de IA e combina com a interface bilíngue. Os documentos continuam em português.
- **Planos:** Supabase e Vercel no **plano gratuito durante o desenvolvimento**. A assinatura será decidida pelo Gabriel antes de entrar em produção.

> ⚠️ **Atenção ao plano gratuito do Supabase.** Ele não tem backup diário automático, e projetos gratuitos são pausados depois de alguns dias sem uso. Enquanto não houver dados reais de clientes, tudo bem. **Antes do primeiro cliente real entrar no sistema, migrar para o plano pago** (ou montar um backup diário próprio). Perder dados financeiros de cliente não tem volta.

## Ambientes

| Ambiente | Para quê | Banco |
|---|---|---|
| Local | Desenvolvimento | Supabase local (CLI) |
| Teste (preview) | Validar cada mudança antes de entrar | Branch do Supabase, dados fictícios |
| Produção | Uso real da equipe | Supabase produção, dados reais |

**Projeto Supabase criado:** `Atreides` · ref `xuogpyscsznypkxydunr` · região São Paulo (`sa-east-1`) · plano gratuito · organização Lima404's Org. Por enquanto é o único projeto (desenvolvimento). O ambiente de produção será separado quando a assinatura for decidida.

Dados reais de clientes **nunca** vão para os ambientes local e de teste.

## Estrutura do código

Projeto criado em 21/11/2026 em `app/` (Next.js 16, App Router, Turbopack, `src/`). Detalhes e comandos em [`app/README.md`](../app/README.md).

```
app/
├── src/
│   ├── app/
│   │   ├── (app)/          # telas internas (exigem login)
│   │   │   ├── painel/
│   │   │   ├── clientes/   # (a construir)
│   │   │   ├── leads/      # (a construir)
│   │   │   └── ...
│   │   ├── login/
│   │   └── auth/           # callback do Google e logout
│   ├── components/         # design system
│   ├── i18n/               # idiomas
│   ├── lib/                # regras de negócio, Supabase, provedor de dados de mercado
│   └── proxy.ts            # sessão e proteção de rotas (no Next 16, "middleware" virou "proxy")
├── messages/               # traduções pt-BR / en
├── supabase/migrations/    # (a criar) mudanças de banco versionadas
└── public/marca/
```

## Segurança

- **RLS (Row Level Security) em todas as tabelas.** O banco recusa, sozinho, qualquer leitura fora da permissão do usuário. Ver [02 Acesso e permissões](02-acesso-e-permissoes.md).
- **Nenhuma chave secreta no navegador.** A chave de serviço do Supabase só existe no servidor.
- **Arquivos privados.** Documentos de clientes ficam em bucket privado e são acessados por links temporários.
- **Registro de auditoria.** Alterações em dados sensíveis (perfil de investidor, carteira, planejamento) ficam registradas: quem, quando, o que mudou.
- **Backups diários** (padrão do Supabase no plano pago) e teste de restauração a cada trimestre.
- **Senhas fortes e 2FA** para todos os usuários.

## LGPD e regulação

O Atreides guarda dados pessoais e financeiros. Regras desde o primeiro dia:

- **Base legal:** execução de contrato de consultoria. O consentimento do cliente para tratamento de dados entra no contrato. Registrar a data do aceite.
- **Minimização:** só guardar o que a consultoria usa. Nada de copiar documentos "por garantia".
- **Direitos do titular:** o sistema precisa conseguir exportar e apagar todos os dados de um cliente (ver [03 Clientes](03-clientes.md)).
- **Retenção (conforme a CVM):** após o fim do contrato, os documentos e registros da atividade de consultoria (contrato, questionários de perfil, planejamentos, recomendações, relatórios, atas de reunião e comunicações com o cliente) ficam guardados por **no mínimo 5 anos**, como exige a Resolução CVM 19/2021.
  - Durante esse prazo, o cliente encerrado sai das listas de trabalho e os dados ficam **só leitura, com acesso restrito ao admin**.
  - O que não é registro da atividade (anotações informais, documentos pessoais que não sustentam o contrato) é apagado no encerramento.
  - Ao fim dos 5 anos, o sistema avisa o admin e os dados são apagados ou anonimizados.
  - Pedido de exclusão do titular (LGPD) durante o prazo: apaga o que não é obrigatório e mantém o que a CVM exige, informando o motivo ao cliente (a LGPD permite manter dados para cumprir obrigação legal).
- **Regulação da atividade:** consultoria de valores mobiliários é regulada pela CVM (Resolução CVM 19/2021), e o dever de verificar a adequação do produto ao perfil do cliente (suitability) segue a Resolução CVM 30/2021. O Atreides deve facilitar esse cumprimento (questionário de perfil, registro de recomendações, histórico). **Validar com o jurídico/compliance da AI Invest.**

## Integração futura com a AI Invest

Para facilitar a unificação em 2027–2028:

- Identificadores únicos (UUID) em todas as tabelas.
- Classes de ativos e tickers com nomenclatura padronizada (ver [06 Carteiras](06-carteiras-e-acompanhamento.md)).
- Regras de negócio em `lib/`, separadas das telas, para poderem virar API.

## Critérios de aceite

- [ ] Projeto criado, com deploy automático na Vercel
- [ ] Supabase com ambientes separados (teste e produção)
- [ ] RLS ativo em 100% das tabelas (verificado pelos alertas de segurança do Supabase)
- [ ] Migrations versionadas no repositório
- [ ] Nenhuma chave secreta exposta no front-end
- [ ] Backup diário ativo **antes do primeiro cliente real**
- [ ] Interface funciona em português e inglês

## Perguntas em aberto

Nenhuma no momento. Pendências de negócio são resolvidas ao longo do projeto, nos documentos de cada módulo.

## Histórico de decisões

- 21/11/2026: stack confirmada (alinhada à plataforma de IA); código dentro deste workspace em `app/`; Gabriel é o responsável técnico; planos gratuitos por enquanto, com migração obrigatória antes de dados reais; retenção de 2 meses, pendente de conciliação com a CVM; login Google; interface bilíngue (PT/EN); código e banco em inglês.

- 21/11/2026: documento criado com a stack recomendada.
- 21/11/2026: retenção segue a CVM (mínimo de 5 anos para registros da atividade), substituindo o prazo de 2 meses; plano gratuito do Supabase confirmado durante o desenvolvimento.
- 21/11/2026: dados de mercado: Yahoo Finance no início, brapi.dev quando houver orçamento para o plano mais completo.
- 21/11/2026: projeto Supabase "Atreides" criado em São Paulo (sa-east-1), plano gratuito.
- 21/11/2026: projeto Next.js 16 criado em `app/` com Tailwind v4, Supabase SSR, next-intl e Zod; login com Google, proteção de rotas e layout com menu lateral prontos.
- 21/11/2026: FullCalendar 7 escolhido para a agenda; integração com o Google Calendar via REST no servidor.
