# Identidade visual: Atreides

> Como a marca Atreides aparece em tudo que o MazyOS gera.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.
> Edite quando a marca evoluir.

**Direção:** Fortaleza, escolhida em 21/11/2026. Uma casa sólida que guarda o que importa: instituição de longa data, valor que dura, sem ostentação.
**Atributos:** segurança, firmeza, força, confiança.
**Raiz conceitual:** Grécia antiga e Homero. Ἀτρείδης = os filhos de Atreu (Agamêmnon e Menelau, *Ilíada*). Também a Casa Atreides de *Duna*: liderança, honra, lealdade, responsabilidade. A linguagem visual vem da arquitetura micênica e grega (pedra angular, pilares, Porta dos Leões), do meandro e das moedas antigas, sempre em execução moderna e plana.
**Quadro de marca (referência visual):** https://claude.ai/artifact/73J4xKdeiu3JDiDCGoTXAu

---

## Cores

- **Fundo principal:** Marinho `#0E1A2B` (marca, menus, capas) · Osso `#F3EFE6` (fundo da interface do CRM e de documentos)

- **Cor de destaque / CTA:** Latão `#B8925A`, usado como acento: barra do símbolo, filetes, número em destaque. O botão principal é **marinho** com texto osso. Latão não é cor de botão nem de texto corrido.

- **Texto principal:** Marinho `#0E1A2B` sobre claro · Osso `#F3EFE6` sobre marinho · Secundário `#4A5566` sobre claro, `#A9B3C1` sobre marinho

- **Fundo alternativo / cards:** Branco `#FFFFFF` com borda `#DDD6C8` (sobre osso) · Marinho 2 `#16263B` (sobre marinho) · divisórias internas `#ECE6DA`

- **Estados (só na interface):** Em dia: texto `#1F5A3E` sobre `#E3EFE8` · Atenção: `#6B4E1E` sobre `#F4E9D6` · Atrasado/negativo: `#8A2E22` sobre `#F5E1DD`. Sempre com rótulo em texto, nunca só a cor.

- **Cor proibida:** preto + lime (`#E1FF06`), a identidade da AI Invest. Também nada de dourado brilhante, neon, gradientes ou paletas quentes saturadas.

---

## Tipografia

- **Títulos e destaques:** Schibsted Grotesk (Google Fonts), 700–800, tracking -0.02em. O logotipo usa Bold 700 em caixa alta com tracking +0.14em.

- **Corpo, subtítulos e botões:** Inter (Google Fonts), 400 / 500 / 600. Números em tabelas com `font-variant-numeric: tabular-nums`.

- **Peso do título:** 700 na interface, 800 em peças de marca e capas.

- **Rótulos/sobretítulos:** Inter 13px, caixa alta, tracking +0.16em.

---

## Estilo geral

Sóbrio, institucional, sólido. Muito espaço, poucos elementos, grade firme. A marca vive no marinho; a interface de trabalho vive no osso/branco, para leitura longa sem cansaço. O latão aparece pouco, e por isso tem valor. Força vem do contraste e do peso tipográfico, não de efeitos.

---

## Elementos-chave

- Bordas: 1px `#E6E1D6` em cards e campos; linhas internas `#EFEBE3`
- Border-radius: 6px em botões e campos, 10px em cards e menus (firmeza sem rigidez). Pílulas de status: totalmente arredondadas
- Botões: primário marinho com texto osso; secundário branco com borda fina; altura 40px (44px nas ações principais no celular)
- Sombras: quase imperceptíveis nos cards (só para separar da página); sombra média apenas no que flutua (menus, diálogos)
- Filete de latão (3px × 32px) para marcar o dado mais importante de um bloco

---

## O que NUNCA fazer

- Usar a identidade da AI Invest (preto + lime, Barques Heavy)
- Promessa visual de "fica rico": cifrões dourados, gráficos só pra cima, moedas, foguetes
- Latão em blocos grandes, em texto corrido ou como cor de botão
- Gradientes, sombras pesadas, emoji, clip-art, ilustração genérica de IA
- Distorcer, girar ou recolorir o símbolo, separar os pilares ou tirar a pedra angular
- Iconografia de Duna (falcão, brasões): a referência a Duna fica no nome e nos valores, não no visual
- Grécia "de souvenir": estátuas, capacetes, mármore texturizado, louros dourados, fontes "gregas" falsas (Σ no lugar de E)
- Meandro como textura de fundo ou em mais de uma faixa por peça

---

## Logo

- **Conceito:** "a pedra angular". Dois pilares formam o "A" e só ficam de pé porque a pedra angular os trava no alto. A pedra é a confiança, a peça que sustenta tudo.
- **Símbolo:** `identidade/simbolo.svg` (marinho, para fundo claro) · `identidade/simbolo-negativo.svg` (osso + latão, para fundo marinho)
- **Assinatura horizontal:** `identidade/logo-horizontal.svg` (o texto depende da fonte Schibsted Grotesk; converter em contornos antes de levar para gráfica ou apresentação)
- **Favicon / ícone de app:** `identidade/favicon.svg`
- **Construção:** grade 120×120; dois pilares com capitel e base; arco entre eles; pedra angular trapezoidal em latão no topo
- **Área de proteção:** a largura da pedra angular em volta de todo o logo
- **Tamanho mínimo:** símbolo 24px · assinatura horizontal 140px de largura
- **Origem:** conceito escolhido entre explorações geradas no Higgsfield e redesenhado em vetor. Imagem de referência original: `identidade/referencia-pedra-angular.png` (só referência, nunca usar como logo).

## Elementos gregos de apoio

- **Selo dracma** (`identidade/selo.svg`): disco de latão, símbolo marinho, anel com "ATREIDES · ΑΤΡΕΙΔΗΣ". Uso: relatórios aprovados, documentos oficiais, carimbo de "planejamento entregue", ícone alternativo.
- **Meandro grego** (`identidade/meandro.svg`): faixa em latão. Uso: divisória de capas, rodapé de documentos, topo da tela de login. Uma faixa por peça.
- **Citações de Homero (Ilíada e Odisseia):** o banco oficial, com 14 citações sobre bravura, nobreza, sabedoria e confiança (original grego, tradução PT/EN e referência), fica em `app/src/lib/citacoes.ts`. A tela de login sorteia uma a cada visita, com efeito de digitação. Lista inicial abaixo, como referência.
- **Citações da Ilíada (lista inicial):** frase curta em Schibsted Grotesk, o original grego em itálico menor e a referência (livro, verso). Uso: tela de login, telas vazias, capas de relatório. Banco inicial:
  - "Odioso me é, como as portas do Hades, quem esconde uma coisa no peito e diz outra." · ἐχθρὸς γάρ μοι κεῖνος ὁμῶς Ἀΐδαο πύλῃσιν · *Ilíada* IX, 312–313 (confiança, transparência)
  - "Ser sempre o melhor e estar acima dos demais." · αἰὲν ἀριστεύειν καὶ ὑπείροχον ἔμμεναι ἄλλων · *Ilíada* VI, 208 (excelência)
  - "Como a geração das folhas, assim é a dos homens." · οἵη περ φύλλων γενεὴ τοίη δὲ καὶ ἀνδρῶν · *Ilíada* VI, 146 (gerações, legado)
  - Traduções próprias. Ao acrescentar citações, conferir livro e verso numa edição de referência.
- **Onde usar:** menu lateral do CRM, relatórios para clientes, capas de apresentação, assinatura de e-mail
- **Tamanho sugerido:** largura entre 120-200px nos HTMLs

---

## Observações adicionais

- Aplicação na interface do sistema (tokens, componentes, padrões de tela): ver `Documentação/12-interface-e-design-system.md`.

- Pendências: logo final vetorizado com texto em contornos; teste de impressão; checar o registro do nome "Atreides" no INPI antes de usar com clientes (o nome vem de Duna).
- A interface do CRM segue o "Kit de interface" do quadro de marca: menu lateral marinho, área de trabalho osso, cards brancos.
