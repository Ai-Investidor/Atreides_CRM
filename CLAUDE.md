# Atreides: MazyOS

> Molde de **solopreneur**, adaptado para um projeto enxuto da AI Invest:
> o Gabriel e dois consultores construindo o CRM interno da consultoria.

## O que é esse workspace

Projeto Atreides: o CRM próprio da consultoria financeira e de planejamento de investimentos da AI Invest. Aqui ficam o branding da marca nova, o produto (CRM) e a operação que ele vai centralizar.

**Estrutura de pastas:**
- `_memoria/`: o que é o projeto, como ele fala, o que está em foco
- `identidade/`: cores, fontes, logo, padrão visual da marca Atreides
- `marketing/`: materiais de marca e comunicação (saída das skills)
- `saidas/`: análises, e-mails, documentos pontuais
- `dados/`: arquivos a analisar (CSV, PDF, planilha), sem versionamento
- `scripts/`: utilitários
- `app/`: código do sistema (Next.js 16 + Supabase). Ver `app/README.md`
- `Documentação/`: planejamento do sistema, um arquivo por fluxo. É escrito **antes** do código e atualizado junto com ele

## Quem somos

Gabriel (CEO da AI Invest) e dois consultores de investimentos. A consultoria atende pessoa física, do iniciante a quem já investe mas não tem tempo de acompanhar o mercado (patrimônio de R$15 mil a R$300 mil).

## O que estamos construindo

- Um CRM interno que centraliza processos, planejamentos, clientes, resultados, dados e análises da consultoria
- A marca Atreides, com identidade própria, separada da AI Invest
- No horizonte de 1 a 2 anos: unificação com a plataforma de IA da AI Invest

## Tom de voz

Segurança, firmeza e força, com a confiança como base. Afirmativo e sereno, sem hype.

Evitar: promessa de retorno, "vamos juntos!", emoji em excesso, jargão de guru, informal ou formal demais.

## Regras do sistema

- Nunca usar a identidade visual da AI Invest (preto + lime) em material do Atreides
- Dados de clientes da consultoria são sensíveis: nunca versionar em `dados/` nem enviar a serviços externos
- Nenhum módulo é programado sem o documento correspondente em `Documentação/` e sem as "Perguntas em aberto" dele resolvidas. Mudou o comportamento no código, o documento muda junto (com data no "Histórico de decisões")
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [x] Supabase: projeto **Atreides** (ref `xuogpyscsznypkxydunr`, região São Paulo `sa-east-1`, plano gratuito)
- [ ] Figma
- [ ] Notion
- [ ] Google Calendar

*(Marcar conforme for instalando os MCPs)*
