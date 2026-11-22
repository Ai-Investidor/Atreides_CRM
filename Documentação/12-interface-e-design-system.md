# 12 · Interface e design system

> O guia de como o Atreides se parece e se comporta. Toda tela nova é montada com os componentes daqui, seguindo estes padrões. Se uma tela precisar de algo que não existe, o componente é criado aqui primeiro (código + este documento), e só depois usado.

**Referências**
- Marca: [`identidade/design-guide.md`](../identidade/design-guide.md)
- Código dos componentes: [`app/src/components/ui/`](../app/src/components/ui/)
- Tokens: [`app/src/app/globals.css`](../app/src/app/globals.css)
- **Referência viva:** a rota `/componentes` dentro do sistema mostra cada componente funcionando
- Quadro de marca: https://claude.ai/artifact/73J4xKdeiu3JDiDCGoTXAu

---

## 1. Princípios

1. **Sóbrio, firme, confiável.** A interface transmite o mesmo que a marca: segurança, firmeza e confiança. Nada de efeito por efeito.
2. **A marca vive no marinho, o trabalho vive no claro.** Menu lateral marinho; área de trabalho em fundo claro e quente; conteúdo em cards brancos.
3. **Latão é raro.** Aparece no símbolo, no item ativo do menu, no filete do indicador principal e nos sobretítulos. Nunca em botões ou blocos grandes.
4. **Densidade de trabalho.** Os consultores passam o dia no sistema: informação compacta, ações a um clique, sem rolagem desnecessária.
5. **Clareza nos números.** Números alinhados (tabulares), sempre com unidade e data de referência.
6. **Nenhuma área em branco.** Toda lista sem dados mostra um estado vazio que explica o que vai aparecer ali e qual o próximo passo.
7. **Consistência acima de criatividade.** O mesmo problema tem sempre a mesma solução visual em todas as telas.
8. **Responsivo e bilíngue desde o primeiro dia.** Toda tela funciona no celular e todo texto passa pelas traduções (PT-BR/EN).
9. **Acessível por padrão.** Contraste mínimo, navegação por teclado, status nunca só por cor.

---

## 2. Tokens

Use sempre os tokens (classes do Tailwind geradas a partir deles). **Nunca** escreva cores em hexadecimal direto nas telas.

### Cores

| Token | Valor | Classe | Uso |
|---|---|---|---|
| marinho | `#0E1A2B` | `bg-marinho`, `text-marinho` | Menu lateral, botão primário, texto principal |
| marinho-2 | `#16263B` | `bg-marinho-2` | Superfícies sobre o marinho |
| marinho-3 | `#1F3149` | `bg-marinho-3` | Hover do botão primário |
| latao | `#B8925A` | `bg-latao`, `text-latao` | Acento sobre fundo escuro |
| latao-escuro | `#8A6A3A` | `text-latao-escuro` | Acento em texto sobre fundo claro (sobretítulos) |
| latao-claro | `#F3EAD9` | `bg-latao-claro` | Fundo de avatar e etiqueta "marca" |
| osso | `#F3EFE6` | `text-osso` | Texto sobre marinho; fundo de peças de marca |
| fundo | `#F7F5F0` | `bg-fundo` | Fundo da área de trabalho |
| superficie | `#FFFFFF` | `bg-superficie` | Cards, campos, menus |
| superficie-2 | `#FBFAF7` | `bg-superficie-2` | Cabeçalho de tabela, hover, áreas recuadas |
| borda | `#E6E1D6` | `border-borda` | Bordas de cards e campos |
| borda-forte | `#CFC7B6` | `border-borda-forte` | Hover de campos, ícones inativos |
| divisoria | `#EFEBE3` | `border-divisoria` | Linhas internas (tabelas, cabeçalhos de card) |
| texto | `#0E1A2B` | `text-texto` | Texto principal |
| texto-2 | `#4A5566` | `text-texto-2` | Texto secundário, descrições |
| texto-3 | `#6B7584` | `text-texto-3` | Texto terciário, dicas, placeholders |
| nevoa | `#A9B3C1` | `text-nevoa` | Texto secundário sobre marinho |

**Estados** (sempre com texto junto, nunca só a cor):

| Estado | Texto | Fundo | Uso |
|---|---|---|---|
| ok | `#1F5A3E` | `#E5F0EA` | Em dia, concluído, sucesso |
| atencao | `#6B4E1E` | `#F6ECD9` | Revisar, aviso, fora do alvo |
| erro | `#8A2E22` | `#F7E4E0` | Atrasado, erro, ação destrutiva |
| info | `#1E4A7A` | `#E4EDF7` | Informação neutra, status de processo |

### Tipografia

| Papel | Fonte | Tamanho / peso | Onde |
|---|---|---|---|
| Título de página | Schibsted Grotesk | 28–32px, 700, tracking -0.02em | `PageHeader` |
| Sobretítulo | Inter | 12px, 500, caixa alta, tracking 0.14em, latão-escuro | Acima do título (data, módulo) |
| Título de card | Inter | 15px, 600 | `CardTitle` |
| Corpo | Inter | 14–15px, 400 | Textos e tabelas |
| Texto auxiliar | Inter | 12–13px, 400, texto-3 | Dicas, descrições de card |
| Rótulo de seção | Inter | 11–12px, 600, caixa alta, tracking 0.14em | Seções do menu, grupos |
| Número de indicador | Inter | 28px, 600, tabular, tracking -0.025em | `StatCard` |

- **Schibsted Grotesk só em títulos de página e peças de marca.** Dentro dos cards e tabelas, tudo é Inter.
- **Números** em tabelas e indicadores usam a classe `numero` (algarismos tabulares).

### Espaçamento, raio e sombra

| Token | Valor | Uso |
|---|---|---|
| Escala de espaço | múltiplos de 4px | `gap-2` (8), `gap-3` (12), `gap-4` (16), `gap-6` (24), `gap-8` (32) |
| `rounded-marca` | 6px | Botões, campos, itens de menu, alertas |
| `rounded-card` | 10px | Cards, menus suspensos, diálogos |
| `rounded-full` | — | Avatares, etiquetas de status |
| `shadow-card` | quase imperceptível | Cards, botões, campos (separa da página) |
| `shadow-elevado` | média | Só para o que flutua: menus, diálogos, dicas |

Ritmo vertical: 32px entre blocos de página, 24px entre cards, 16px dentro de cards.

### Ícones

- Biblioteca: **Lucide** (`lucide-react`), traço de 2px.
- Tamanhos: 16px em botões e menus, 17–18px no menu lateral e estados vazios.
- Ícone sozinho (sem texto) exige `aria-label` e, se possível, uma `Dica`.
- Nunca emoji.

---

## 3. Componentes

Todos em `app/src/components/ui/`. Importar sempre daqui; não recriar estilos nas telas.

### Ações

| Componente | Variações | Regras |
|---|---|---|
| **`Button`** | `primary`, `secondary`, `ghost`, `danger`, `link` · tamanhos `sm` (32px), `md` (40px), `lg` (44px), `icon`, `icon-sm` · `carregando` | **Um único `primary` por área.** Destrutivo sempre `danger` e com confirmação. Durante o salvamento, `carregando` mostra o indicador sem mudar de cor. Com `asChild`, envolve um `<Link>` com o visual de botão. |

### Estrutura de página

| Componente | Para quê |
|---|---|
| **`Page`** | Contêiner da página: largura máxima 1320px e respiro lateral responsivo |
| **`PageHeader`** | Sobretítulo + título + descrição + ações (a principal por último, à direita) |
| **`Card`** + `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Bloco de conteúdo. O cabeçalho tem título à esquerda e ações ou etiqueta à direita; o rodapé tem os botões do formulário |
| **`StatCard`** | Indicador numérico com rótulo, ícone e detalhe. `destaque` adiciona o filete de latão (só no indicador mais importante da linha) |
| **`Separator`** | Linha divisória |

### Dados

| Componente | Para quê |
|---|---|
| **`Table`**, `THead`, `TBody`, `TR`, `TH`, `TD` | Tabelas. Cabeçalho em caixa alta pequena; linhas com hover; números alinhados à direita; última coluna para o menu de ações (⋯). Em telas estreitas, a tabela rola dentro do contêiner |
| **`Badge`** | Status e categorias: tons `ok`, `atencao`, `erro`, `info`, `marca`, `neutro`, `escuro`; `ponto` para status |
| **`Avatar`** | Iniciais de uma pessoa; tom `claro` (sobre branco) ou `escuro` (sobre marinho) |

### Formulários

| Componente | Para quê |
|---|---|
| **`Field`** | Rótulo + controle + dica ou erro, já ligados para leitores de tela. Asterisco em obrigatórios |
| **`Input`**, **`Textarea`** | Controles de texto (altura 40px). O erro aparece com borda vermelha e mensagem abaixo, nunca só a cor |
| **`Select`** + `SelectItem`, `SelectGroup`, `SelectSeparator` | Seleção para listas curtas e fixas (origem, etapa, perfil, status). Construído sobre o Radix Select: a lista abre logo abaixo do campo, com a aparência do sistema, e funciona com teclado. `placeholder` para obrigar uma escolha; `tamanho="sm"` em barras de filtro. Para listas longas ou com busca (clientes, ativos), usar a futura **seleção com busca** |
| **`Label`** | Rótulo avulso |

Regras de formulário:
- Uma coluna no celular, duas no desktop quando os campos forem curtos.
- Rótulo sempre visível (placeholder não substitui o rótulo).
- Erros aparecem ao sair do campo ou ao enviar, em linguagem clara ("Informe um e-mail válido").
- Botões no `CardFooter` (ou no rodapé do diálogo): Cancelar (`ghost`) à esquerda, ação principal à direita.
- Valores: moeda com `R$` e separador brasileiro; datas no formato `dd/mm/aaaa`; celular com DDD.

### Feedback

| Componente | Para quê |
|---|---|
| **`Alert`** | Mensagem dentro da tela: `info`, `ok`, `atencao`, `erro`, com título opcional |
| **`EmptyState`** | Ícone + título + descrição + ação. Versão `compacto` para cards laterais |
| **`Skeleton`** | Carregamento com a forma do conteúdo final (nunca um spinner solto no meio da tela) |
| **`Kbd`** | Atalho de teclado (ex.: ⌘K) |

### Sobreposições (`overlay.tsx`)

| Componente | Para quê |
|---|---|
| **`Menu`** + `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuLabel`, `MenuSeparator` | Menus suspensos: ações de linha (⋯), seletor de workspace, menu do usuário, botão "Novo" |
| **`Dialog`** + `DialogTrigger`, `DialogContent`, `DialogClose` | `posicao="centro"`: confirmações e formulários curtos. `posicao="lateral"`: cadastros e detalhes rápidos sem sair da tela. `posicao="esquerda"`: menu no celular |
| **`Tabs`** + `TabList`, `Tab`, `TabContent` | Abas (ex.: ficha do cliente) |
| **`Dica`** | Tooltip para ícones e itens desabilitados |

### Componentes de marca

| Componente | Para quê |
|---|---|
| `Simbolo` | Símbolo "pedra angular" (variantes clara/negativa, marca d'água) |
| `Assinatura` | Símbolo + ATREIDES + tagline |
| `Meandro` | Faixa grega: só em login, capas e rodapés de documentos |
| `CitacaoDigitada` | Citação de Homero com efeito de digitação (login) |

---

## 4. Estrutura do aplicativo

```
┌────────────┬───────────────────────────────────────────────┐
│ ATREIDES   │ [🔍 Buscar clientes, leads, ativos…  ⌘K]  [+ Novo]│
│            ├───────────────────────────────────────────────┤
│ [Workspace]│ ⚠ Você está no workspace de Erick  (se aplicável)│
│            ├───────────────────────────────────────────────┤
│ GERAL      │ SOBRETÍTULO                                   │
│  Painel    │ Título da página               [Sec.] [Princ.]│
│  Agenda    │ Descrição                                     │
│  Tarefas   │                                               │
│ RELACION.  │ [Indicador] [Indicador] [Indicador] [Indic.]  │
│  Leads     │                                               │
│  Clientes  │ ┌ Card principal ──────────┐ ┌ Card lateral ┐ │
│ INVESTIM.  │ │                          │ │              │ │
│  Carteiras │ └──────────────────────────┘ └──────────────┘ │
│  Ativos    │                                               │
│  Relatórios│                                               │
│ ────────── │                                               │
│ [Usuário ▾]│                                               │
└────────────┴───────────────────────────────────────────────┘
```

- **Menu lateral** (256px, marinho, fixo): assinatura, seletor de workspace, navegação agrupada por área (Geral, Relacionamento, Investimentos; Administração só para o admin), menu do usuário no rodapé (idioma, configurações, sair). Item ativo: fundo levemente claro, ícone em latão e filete de latão à esquerda. Módulos ainda não construídos aparecem esmaecidos com "Em breve". A navegação vive em `components/app/navegacao.ts`.
- **Barra superior** (64px, fixa, com desfoque): busca global (⌘K) e botão **Novo** (criação rápida de lead, cliente e reunião).
- **Faixa de workspace alheio:** cor de atenção, com botão "Voltar ao meu workspace" ([02](02-acesso-e-permissoes.md)).
- **Celular** (abaixo de 1024px): o menu vira gaveta (botão ☰ na barra superior); indicadores em 2 colunas; cards em 1 coluna; o rótulo do botão "Novo" vira só o ícone.

Pontos de quebra: `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px.

---

## 5. Padrões de tela

### Lista (Leads, Clientes, Carteiras…)
1. `PageHeader` com o título do módulo e a ação principal ("Novo lead").
2. Linha de indicadores do módulo (opcional, até 4 `StatCard`).
3. `Card` com barra de ferramentas no cabeçalho: busca, filtros, alternador de visualização (lista/quadro).
4. `Table` com ações por linha no menu ⋯. Clicar na linha abre o detalhe.
5. Sem dados: `EmptyState` com a ação principal. Carregando: `Skeleton` com a forma da tabela.

### Detalhe (ficha do cliente, ficha do lead)
1. Cabeçalho com `Avatar`, nome, etiquetas de status e ações.
2. `Tabs` para as seções (Resumo, Linha do tempo, Perfil, Diagnóstico, Planejamento, Carteira, Documentos).
3. Layout em duas colunas no desktop: conteúdo principal (2/3) e resumo lateral (1/3).

### Cadastro e edição
- **Cadastro rápido** (lead, tarefa, anotação): `Dialog` lateral, poucos campos, sem sair da tela.
- **Cadastro completo** (cliente, planejamento): página própria, com seções em `Card`.
- Depois de salvar: fechar o painel, mostrar o item novo na lista e uma confirmação discreta.

### Quadro (funil de leads)
- Colunas por etapa com contagem no topo; cards compactos (nome, origem, dias na etapa, próximo contato).
- Próximo contato atrasado em tom `erro`, com texto ("Atrasado há 2 dias").

### Painel
- Saudação pelo horário e data por extenso no sobretítulo.
- Indicadores no topo, com o principal destacado (patrimônio sob consultoria).
- Coluna principal: agenda do dia e retornos de leads. Coluna lateral: primeiros passos, atenção e a citação do dia.

### Confirmações destrutivas
- Sempre um `Dialog` centralizado, com título que diz a ação ("Encerrar cliente"), consequência na descrição e botão `danger` com o verbo da ação.

---

## 6. Escrita na interface

- Tom da marca: firme, sereno, direto. Sem exclamações, sem "Oops!", sem emoji.
- Botões com verbo: "Salvar lead", "Agendar reunião", "Converter em cliente".
- Estados vazios explicam o que vai aparecer e o próximo passo.
- Erros dizem o que aconteceu e o que fazer ("Não foi possível salvar. Tente novamente.").
- Nenhum texto fixo no código: tudo em `app/messages/pt-BR.json` e `en.json`.
- Datas, moedas e números formatados pelo idioma do usuário (`Intl`).

---

## 7. Elementos gregos na interface

- **Login:** assinatura discreta, símbolo em marca d'água, meandro no rodapé e uma citação de Homero sorteada a cada visita (nunca a mesma da anterior), com efeito de digitação. Banco em `app/src/lib/citacoes.ts`.
- **Painel:** "Citação do dia" em card marinho (muda uma vez por dia, igual para toda a equipe).
- **Estados vazios importantes:** podem usar uma citação curta no lugar da descrição.
- **Selo dracma:** marca de documento oficial nos PDFs (relatórios, planejamentos) e em "Onboarding concluído".
- **Meandro:** só em login, capas e rodapés de PDF. Nunca dentro das telas de trabalho.

---

## 8. Acessibilidade

- Contraste mínimo de 4.5:1 para texto (todas as combinações de tokens passam).
- Status nunca só por cor: sempre com texto (e ponto, nas etiquetas).
- Tudo navegável por teclado, com foco visível (contorno em latão).
- Alvos de toque de pelo menos 40px (44px em ações principais no celular).
- Botões só com ícone têm `aria-label`; elementos decorativos têm `aria-hidden`.
- Quem prefere menos movimento (`prefers-reduced-motion`) não vê animações.
- Componentes interativos usam primitivas acessíveis (Radix): menus, diálogos, abas e dicas já vêm com teclado e leitor de tela.

---

## 9. Como criar um componente novo

1. Verificar se algum componente existente resolve (com uma variação, se for o caso).
2. Criar em `app/src/components/ui/`, usando só tokens, com comentário de uso no topo.
3. Adicionar um exemplo na rota `/componentes`.
4. Documentar aqui, na seção 3.

---

## Critérios de aceite

- [x] Tokens configurados no Tailwind (`globals.css`)
- [x] Componentes base construídos e reunidos na referência `/componentes`
- [x] Layout padrão com menu lateral funcionando no desktop e no celular
- [x] Tela de login com os elementos da marca
- [x] Contraste verificado nas combinações dos tokens
- [ ] Todas as telas de módulos usam só componentes desta biblioteca (verificar a cada módulo)
- [ ] Troca de idioma PT/EN funciona em todas as telas, inclusive datas e moedas (verificar a cada módulo)

## Perguntas em aberto

Nenhuma no momento.

## Histórico de decisões

- 21/11/2026: documento criado.
- 21/11/2026: sem modo escuro no MVP; responsivo desde o início; interface bilíngue (PT/EN).
- 21/11/2026: tela de login redesenhada; citações de Homero sorteadas com efeito de digitação.
- 21/11/2026: design system completo: tokens revistos (fundo de trabalho, superfícies, estado "info"), raio 6px/10px e sombra discreta em vez de cantos de 4px sem sombra; biblioteca de componentes (Radix + Lucide + CVA); nova estrutura com menu agrupado, seletor de workspace, barra superior e painel redesenhado; referência viva em `/componentes`.
- 21/11/2026: `Select` nativo substituído por componente sobre o Radix Select (a lista nativa abria fora de posição e sem a aparência do sistema); estilos globais movidos para a camada `base` do Tailwind (o contorno de foco global sobrepunha os componentes).
