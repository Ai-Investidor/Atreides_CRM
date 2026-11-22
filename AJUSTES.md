# Ajustes e revisões pós-construção

Lista do que precisa ser ajustado, revisado ou completado depois que todos os fluxos do Atreides estiverem construídos. Cada item diz **o que é**, **por que ficou para depois** e **o que destrava**.

> Atualizado em 21/11/2026. Itens novos entram no fim da seção certa. Item resolvido: marcar `[x]` com a data.

## Compliance e regulatório

- [ ] **Suitability da consultoria (CVM 30).** Desde 22/11/2026 o Atreides não diagnostica o perfil: registra o perfil definido pela corretora, para uso no planejamento. Confirmar com advogado ou compliance se isso basta: a Resolução CVM 30/2021 também se aplica a **consultores de valores mobiliários**, que podem ter obrigação própria de verificar a adequação das recomendações. Se for preciso diagnóstico próprio, o questionário removido está no histórico do git (commit `cd77801`).
- [ ] **Adequação das recomendações ao perfil:** classificar o risco de cada ativo e avisar (ou exigir justificativa) quando o planejamento ou a carteira recomendar algo acima do perfil registrado.
- [ ] **Material de análise de ativos para clientes.** Antes de levar indicadores de ativos para relatórios enviados a clientes, validar com compliance (Resoluções CVM 19/2021 e 20/2021).
- [ ] **Documentos obrigatórios do onboarding.** A lista padrão (contrato, documento com foto, comprovante de residência, aceite LGPD) é provisória: confirmar com o Erick e ajustar em Configurações › Clientes.

## Clientes e carteira

- [x] **Despesa mensal do cliente** (22/11/2026): vem do campo "despesa mensal" do Diagnóstico (doc 14) e aparece no card Marco zero.
- [ ] **Diagnóstico numérico completo:** levantamento de rendas, gastos, dívidas e patrimônio, com indicadores (taxa de poupança, comprometimento com dívidas, reserva de emergência), que era o escopo original do doc 14. Hoje o diagnóstico é texto em markdown + despesa mensal + idade de aposentadoria.
- [ ] **Diagnóstico a partir da transcrição com IA:** subir a transcrição do Meet e gerar o rascunho do diagnóstico. Antes, decidir com compliance o envio de dados de clientes a um serviço de IA (hoje a regra do projeto proíbe enviar dados de clientes a serviços externos; o Erick já faz isso fora do sistema).
- [ ] **Patrimônio sob consultoria no núcleo familiar.** Hoje o núcleo soma o patrimônio declarado. Trocar pela soma das carteiras quando todos os membros tiverem carteira.
- [ ] **Importação da carteira dos clientes do Erick.** O Atreides importa planilha no modelo dele. Quando o Erick enviar um arquivo exportado do Investidor10 (se o Investidor10 exportar), adaptar o leitor para esse formato.
- [ ] **Importação de extratos das corretoras** (fase 2 da carteira): Rico, XP, BTG, Inter, Nubank. Falta definir a ordem de prioridade.
- [ ] **Carteira, fase 2:** atualização automática diária das cotações, rentabilidade comparada a CDI, IPCA e Ibovespa, e proventos (dividendos e rendimentos) entrando como lançamento.
- [ ] **Alerta de perfil ao comprar ativo** (suitability): ao lançar ou planejar um ativo acima do perfil do cliente, pedir justificativa. Depende da classificação de risco dos ativos (ver Compliance).
- [ ] **Alertas de desvio no painel:** levar as carteiras com desvio e as desatualizadas para o card "Atenção" do Painel (módulo 10).
- [ ] **Teste real da carteira** com dados de um cliente (lançamentos, saldos, aporte, fotografia, importação).
- [ ] **Alocação alvo.** Hoje é definida na própria carteira. Quando o Planejamento (doc 05) existir, ele vira a fonte do alvo e a carteira passa a só ler.
- [ ] **Transferência de cliente entre workspaces.** Construída e testada só em parte (não havia um segundo workspace). Testar quando um consultor entrar.
- [ ] **Teste de ponta a ponta logado** de Clientes, Tarefas e Carteira (cadastro, registro de perfil, documentos, importação, conversão de lead).

## Ativos e relatórios

- [ ] **Indicadores do Erick.** A página do ativo usa o conjunto do documento 13; ajustar quando o Erick disser quais indicadores usa no Investidor10.
- [ ] **Adicionar à carteira com impacto e alerta de perfil:** mostrar como a alocação fica e avisar quando o ativo foge do perfil do cliente (depende da classificação de risco, ver Compliance).
- [ ] **Envio automático do relatório** por e-mail (serviço de envio) e WhatsApp Business. Hoje é manual: baixar o PDF e anexar na mensagem pronta.
- [ ] **Seção de objetivos no relatório**, quando o Planejamento (doc 05) existir.
- [ ] **Validar com compliance** os textos fixos do relatório (aviso legal, títulos) antes do primeiro envio a cliente.
- [ ] **Teste real dos relatórios** com uma carteira com fotografias (gerar, aprovar, baixar, enviar, nova versão).

## Equipe e acesso

- [ ] **Desativar consultor.** Falta a ação de desativar usuário (a transferência de clientes, pré-requisito, já existe).
- [ ] **Convite por e-mail automático.** Hoje o admin copia a mensagem pronta. Entra junto com um serviço de envio de e-mails (o mesmo dos relatórios).

## Agenda e Google

- [ ] **Publicar o app do Google em produção.** Em modo Teste a conexão da agenda cai a cada 7 dias e os consultores precisam estar em "Usuários de teste". Produção exige página inicial e política de privacidade públicas: criar no deploy.
- [ ] **Trocar a chave secreta do cliente Google.** A chave atual foi colada no chat. Criar uma nova, atualizar `app/.env.local` e o Supabase, e apagar a antiga.
- [ ] **Sincronização em tempo real com o Google Calendar** (notificações do Google). Hoje sincroniza ao abrir a agenda. Depende do sistema publicado na internet.
- [ ] **Teste real da agenda** (criar, remarcar, cancelar, Meet, convites) com a conta conectada.
- [ ] **Etapa 2 das reuniões:** pauta automática, ata, próximos passos virando tarefas, resumo para o cliente por e-mail, lembrete de reunião sem ata.

## Dados de mercado

- [x] **Ligar o brapi.dev** (22/11/2026): fonte principal, com o Yahoo Finance como reserva automática.
- [ ] **Assinar o plano Pro da brapi** (R$ 1.399,90/ano) antes de entrar dados reais. No Gratuito, indicadores de ações, proventos, FIIs e o histórico de 5 anos ainda vêm do Yahoo, que não é API oficial e restringe uso comercial. Ao trocar de plano não muda código: conferir na página de um ativo que a fonte passou a ser só "brapi.dev" e que DY, ROE e margem batem com o Investidor10 (a brapi entrega esses valores como fração e o sistema converte para %).
- [ ] **Termos das fontes grátis de indicadores.** Os indicadores vêm da Dados B3 e da bolsai (planos grátis). Os termos da Dados B3 dizem "uso próprio: consulta e análise"; a bolsai não publica termos. Confirmar por e-mail com as duas que um CRM interno de consultoria pode usar o plano grátis, e não levar esses números a relatórios de clientes antes disso.
- [ ] **Chaves grátis da Dados B3 e da bolsai.** O cadastro da chave da Dados B3 falhou do lado deles em 22/11/2026 ("provedor de pagamento"). Sem chave ela funciona com 150 consultas/dia; tentar de novo e colocar `DADOSB3_API_KEY` no `.env.local`. A da bolsai já está no `.env.local` (22/11/2026). As duas também vão para o deploy.
- [ ] **Conferir os indicadores com o Investidor10** em 5 a 10 ativos (ação, banco, unit, FII). No teste de 22/11/2026 a bolsai divergiu na TAEE11 (P/L 38 e ROE 4,4% contra 8,5 e 21,7% da Dados B3); como a Dados B3 vem primeiro, a tela usa os números dela.
- [ ] **"Não se aplica" para bancos.** EV/EBITDA e dívida/patrimônio não existem para bancos e hoje aparecem como "indisponível". A Dados B3 informa o tipo da empresa ("banco"): usar isso para mostrar "não se aplica".
- [ ] **Consumo de cota da brapi:** no Gratuito são 15.000 requisições por mês e 1 ativo por requisição (atualizar a carteira de um cliente com 15 ativos gasta 15). Acompanhar o uso no painel da brapi no primeiro mês.

## Infraestrutura

- [ ] **Plano pago e backup do Supabase** antes de entrar dados reais de clientes (hoje é o plano gratuito).
- [ ] **Deploy na Vercel** (no ar em 22/11/2026: https://atreides-crm.vercel.app, plano Hobby). Falta:
  - **assinar o plano Pro da Vercel (US$ 20/mês) antes do uso real**: o Hobby é só para uso pessoal e não comercial;
  - publicar sozinho a cada push: instalar o app da Vercel na organização `Ai-Investidor` do GitHub e definir Root Directory = `app` (hoje se publica pelo CLI);
  - domínio próprio (ex.: crm.atreides.com.br);
  - ambiente de produção separado do de desenvolvimento (hoje os dois usam o mesmo projeto Supabase).
- [x] **Commit e repositório** (22/11/2026): código no GitHub privado `Ai-Investidor/Atreides_CRM`, branch `main`.

## Marca

- [ ] **Converter o texto do logo em contornos** e **checar o registro do nome no INPI**.
