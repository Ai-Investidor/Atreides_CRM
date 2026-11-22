# Atreides · aplicação

CRM da consultoria Atreides. Planejamento completo em [`../Documentação/`](../Documentação/README.md).

## Rodar localmente

```bash
cd app
cp .env.example .env.local   # preencher com a URL e a chave publicável do Supabase
npm install
npm run dev                  # http://localhost:3000
```

## Google Agenda (Documentação/07)

A agenda usa o mesmo cliente OAuth do login com Google. Passos no [Google Cloud Console](https://console.cloud.google.com/), no projeto desse cliente:

1. **APIs e serviços › Biblioteca:** ativar a **Google Calendar API**.
2. **Google Auth Platform › Acesso a dados:** adicionar o escopo `https://www.googleapis.com/auth/calendar.events`.
3. **Público:** enquanto o Atreides não estiver publicado na internet, o app fica em **Teste**. Para ir a produção, o Google exige URLs públicas de página inicial e política de privacidade (serão criadas no deploy). Em Teste: o dono do projeto entra sem cadastro; os consultores precisam estar em **Usuários de teste**; a conexão da agenda expira a cada 7 dias (o Atreides avisa e oferece "Conectar de novo").
4. **Clientes:** copiar o **ID do cliente** e a **Chave secreta** para `app/.env.local` (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`). Nunca com `NEXT_PUBLIC_`.
5. Reiniciar o `npm run dev`, abrir **Agenda** e clicar em **Conectar Google Agenda** (cada consultor faz isso uma vez).

`GOOGLE_TOKEN_KEY` (chave que cifra os tokens antes de irem ao banco) já está gerada no `.env.local`. Se for trocada, cada consultor precisa conectar de novo.

## Dados de mercado (brapi.dev)

Com `BRAPI_TOKEN` em `app/.env.local` (só servidor, nunca com `NEXT_PUBLIC_`), a brapi.dev é a fonte principal de busca, cotações, indicadores, histórico e proventos. O que o plano da conta não libera vem do Yahoo Finance, automaticamente, e a tela mostra a fonte de cada dado. Sem a chave, tudo vem do Yahoo. Trocar de plano não exige mudança no código (ver Documentação/13).

Indicadores (P/L, P/VP, DY, ROE…) seguem uma cadeia grátis, por indicador: Dados B3 (`DADOSB3_API_KEY`, opcional) → bolsai (`BOLSAI_API_KEY`) → Yahoo. Se a brapi estiver num plano que libera indicadores, ela vem antes.

## Acesso pelo celular (desenvolvimento)

Com o `npm run dev` rodando, `ngrok http 3000` publica o sistema num endereço `https://…ngrok-free.dev`. Para o login com Google funcionar por esse endereço, ele precisa estar em Supabase › Authentication › URL Configuration › Redirect URLs (`https://SEU-DOMINIO/**`). O `next.config.ts` já libera os domínios do ngrok para o hot reload.

## Deploy (Vercel)

Produção: **https://atreides-crm.vercel.app** (projeto `atreides-crm` na Vercel).

- **Publicar:** `npx vercel deploy --prod` dentro de `app/` (o `.vercelignore` impede o envio do `.env.local`).
- **Publicar sozinho a cada push (pendente):** instalar o app da Vercel na organização `Ai-Investidor` do GitHub, rodar `npx vercel git connect` e definir **Root Directory = `app`** no projeto (o repositório tem o workspace inteiro; o sistema fica em `app/`).
- **Variáveis de ambiente** (Settings › Environment Variables, ambiente Production): as mesmas do `.env.local`, ou seja, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (a mesma do desenvolvimento, senão as agendas conectadas param), `BRAPI_TOKEN`, `BOLSAI_API_KEY` e `DADOSB3_API_KEY` (opcional).
- **Supabase › Authentication › URL Configuration:** Site URL = endereço da Vercel; em Redirect URLs, `https://ENDERECO-DA-VERCEL/**`. Sem isso o login com Google volta para o localhost.
- O Google não precisa de mudança: o retorno do login passa pelo Supabase.
- Rotinas agendadas (tarefas, relatórios) rodam no próprio Supabase (pg_cron), não na Vercel.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (`@supabase/ssr`) · next-intl (PT-BR/EN) · Zod · FullCalendar 7 · brapi.dev + yahoo-finance2 como reserva (dados de mercado, exige Node 22+) · @react-pdf/renderer (PDF dos relatórios; fontes e selo em `assets/pdf/`)

> Next.js 16 tem mudanças em relação às versões anteriores (ex.: `middleware` agora é `proxy`). Antes de escrever código, consultar `node_modules/next/dist/docs/`.

## Estrutura

```
src/
├── app/
│   ├── (app)/            # telas internas (exigem login): layout com menu lateral
│   │   └── painel/
│   ├── login/            # tela de login (Entrar com Google)
│   ├── auth/callback/    # retorno do login Google
│   ├── globals.css       # tokens da marca (cores, fontes, raio)
│   └── icon.svg          # favicon (símbolo da marca)
├── components/           # componentes de interface (Simbolo, Meandro, MenuLateral)
├── i18n/                 # configuração de idiomas
├── lib/supabase/         # clientes Supabase (navegador, servidor, proxy)
└── proxy.ts              # renova a sessão e protege as rotas
messages/                 # textos da interface: pt-BR.json, en.json
public/marca/             # SVGs da marca
```

## Regras

- Nenhum texto fixo nas telas: tudo em `messages/pt-BR.json` e `messages/en.json`.
- Cores, fontes e raio só pelos tokens de `globals.css` (`bg-marinho`, `text-latao`, `font-titulo`, `rounded-marca`…).
- Permissão real sobre os dados é do banco (RLS). O proxy só faz o redirecionamento para o login.
