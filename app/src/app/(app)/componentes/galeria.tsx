"use client";

import { Download, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2, Users, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, Kbd, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, SelectGroup, SelectItem, Textarea } from "@/components/ui/form";
import { Page, PageHeader, StatCard } from "@/components/ui/layout";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Dica,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tab,
  TabContent,
  TabList,
  Tabs,
} from "@/components/ui/overlay";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

/*
 * Página interna de referência: mostra cada componente com dados de exemplo.
 * Os nomes abaixo são fictícios e servem só para demonstrar o visual.
 */

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-texto-3">{titulo}</h2>
      {children}
    </section>
  );
}

export function Galeria() {
  return (
    <Page className="flex flex-col gap-12">
      <PageHeader
        sobretitulo="Design system"
        titulo="Componentes"
        descricao="Referência viva dos componentes do Atreides. Toda tela é montada com estas peças."
        acoes={
          <>
            <Button variant="secondary"><Download />Exportar</Button>
            <Button><Plus />Ação principal</Button>
          </>
        }
      />

      <Secao titulo="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger"><Trash2 />Excluir</Button>
          <Button variant="link">Link</Button>
          <Button carregando>Salvando</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
          <Dica texto="Editar"><Button variant="secondary" size="icon" aria-label="Editar"><Pencil /></Button></Dica>
          <Dica texto="Mais ações"><Button variant="ghost" size="icon-sm" aria-label="Mais ações"><MoreHorizontal /></Button></Dica>
        </div>
      </Secao>

      <Secao titulo="Etiquetas de status">
        <div className="flex flex-wrap gap-2">
          <Badge tom="ok" ponto>Em dia</Badge>
          <Badge tom="atencao" ponto>Revisar</Badge>
          <Badge tom="erro" ponto>Atrasado</Badge>
          <Badge tom="info">Onboarding</Badge>
          <Badge tom="marca">Arrojado</Badge>
          <Badge>Neutro</Badge>
          <Badge tom="escuro">Admin</Badge>
        </div>
      </Secao>

      <Secao titulo="Indicadores">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard destaque rotulo="Patrimônio sob consultoria" valor="R$ 1.250.000" Icone={Wallet} detalhe="Referência: 21/11/2026" />
          <StatCard rotulo="Clientes ativos" valor="18" Icone={Users} detalhe="+2 no mês" />
          <div className="flex flex-col gap-3 rounded-card border border-borda bg-superficie p-5 shadow-card" aria-label="Carregando"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-7 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      </Secao>

      <Secao titulo="Formulário">
        <Card className="max-w-2xl">
          <CardHeader>
            <div>
              <CardTitle>Novo lead</CardTitle>
              <CardDescription>Campos com * são obrigatórios.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field rotulo="Nome" obrigatorio>{(p) => <Input {...p} placeholder="Nome completo" />}</Field>
            <Field rotulo="Celular" obrigatorio dica="Com DDD.">{(p) => <Input {...p} placeholder="(11) 99999-9999" inputMode="tel" />}</Field>
            <Field rotulo="Origem">
              {(p) => (
                <Select {...p} defaultValue="instagram">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="prospeccao">Prospecção ativa</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </Select>
              )}
            </Field>
            <Field rotulo="E-mail" erro="Informe um e-mail válido.">{(p) => <Input {...p} defaultValue="contato@" type="email" />}</Field>
            <Field rotulo="Observações" className="sm:col-span-2">{(p) => <Textarea {...p} placeholder="Contexto do primeiro contato" />}</Field>
          </CardContent>
          <CardFooter>
            <Button variant="ghost">Cancelar</Button>
            <Button>Salvar lead</Button>
          </CardFooter>
        </Card>
      </Secao>

      <Secao titulo="Seleção (Select)">
        <p className="-mt-2 max-w-2xl text-sm text-texto-2">
          Para listas curtas e fixas (origem, etapa, perfil, status). A lista abre logo abaixo do campo; navegue com as setas e confirme com Enter.
        </p>
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field rotulo="Padrão">
            {(p) => (
              <Select {...p} defaultValue="moderado">
                <SelectItem value="conservador">Conservador</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="arrojado">Arrojado</SelectItem>
              </Select>
            )}
          </Field>
          <Field rotulo="Com instrução inicial" dica="Obriga uma escolha consciente.">
            {(p) => (
              <Select {...p} placeholder="Selecione a etapa">
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contato">Em contato</SelectItem>
                <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
              </Select>
            )}
          </Field>
          <Field rotulo="Com grupos">
            {(p) => (
              <Select {...p} defaultValue="acoes">
                <SelectGroup rotulo="Renda variável">
                  <SelectItem value="acoes">Ações Brasil</SelectItem>
                  <SelectItem value="fiis">Fundos Imobiliários</SelectItem>
                  <SelectItem value="internacional">Internacional / BDR&apos;s</SelectItem>
                </SelectGroup>
                <SelectGroup rotulo="Renda fixa">
                  <SelectItem value="pos">Pós-fixado / Caixa</SelectItem>
                  <SelectItem value="inflacao">Inflação</SelectItem>
                  <SelectItem value="pre">Prefixado</SelectItem>
                </SelectGroup>
              </Select>
            )}
          </Field>
          <Field rotulo="Com erro" erro="Escolha a origem do lead." obrigatorio>
            {(p) => (
              <Select {...p} placeholder="Selecione a origem">
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="prospeccao">Prospecção ativa</SelectItem>
              </Select>
            )}
          </Field>
          <Field rotulo="Desabilitado">
            {(p) => (
              <Select {...p} defaultValue="gabriel" disabled>
                <SelectItem value="gabriel">Gabriel Lima</SelectItem>
              </Select>
            )}
          </Field>
          <Field rotulo="Pequeno (barras de filtro)">
            {(p) => (
              <Select {...p} defaultValue="todos" tamanho="sm">
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="pausa">Em pausa</SelectItem>
                <SelectItem value="encerrados" disabled>Encerrados (só admin)</SelectItem>
              </Select>
            )}
          </Field>
        </div>
      </Secao>

      <Secao titulo="Tabela">
        <Card>
          <CardHeader className="items-center">
            <CardTitle>Clientes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" aria-hidden="true" />
                <Input className="h-8 w-56 pl-9 text-[13px]" placeholder="Buscar" aria-label="Buscar clientes" />
              </div>
              <Button variant="secondary" size="sm"><Filter />Filtros</Button>
            </div>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Cliente</TH>
                <TH>Perfil</TH>
                <TH className="text-right">Patrimônio</TH>
                <TH>Próxima revisão</TH>
                <TH>Status</TH>
                <TH className="w-12"><span className="sr-only">Ações</span></TH>
              </tr>
            </THead>
            <TBody>
              {[
                { nome: "Ana Exemplo", perfil: "Moderado", valor: "R$ 84.000", data: "12/01", status: <Badge tom="ok" ponto>Em dia</Badge> },
                { nome: "Bruno Exemplo", perfil: "Conservador", valor: "R$ 152.300", data: "03/12", status: <Badge tom="atencao" ponto>Revisar</Badge> },
                { nome: "Carla Exemplo", perfil: "Arrojado", valor: "R$ 47.900", data: "18/11", status: <Badge tom="erro" ponto>Atrasado</Badge> },
              ].map((l) => (
                <TR key={l.nome}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar nome={l.nome} tamanho="sm" />
                      <span className="font-medium">{l.nome}</span>
                    </div>
                  </TD>
                  <TD className="text-texto-2">{l.perfil}</TD>
                  <TD className="numero text-right">{l.valor}</TD>
                  <TD className="numero text-texto-2">{l.data}</TD>
                  <TD>{l.status}</TD>
                  <TD>
                    <Menu>
                      <MenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${l.nome}`}><MoreHorizontal /></Button>
                      </MenuTrigger>
                      <MenuContent align="end">
                        <MenuItem><Pencil />Editar</MenuItem>
                        <MenuSeparator />
                        <MenuItem className="text-erro [&_svg]:!text-erro"><Trash2 />Excluir</MenuItem>
                      </MenuContent>
                    </Menu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </Secao>

      <Secao titulo="Abas">
        <Tabs defaultValue="resumo">
          <TabList>
            <Tab value="resumo">Resumo</Tab>
            <Tab value="linha">Linha do tempo</Tab>
            <Tab value="carteira">Carteira</Tab>
          </TabList>
          <TabContent value="resumo" className="pt-4 text-sm text-texto-2">Conteúdo da aba Resumo.</TabContent>
          <TabContent value="linha" className="pt-4 text-sm text-texto-2">Conteúdo da aba Linha do tempo.</TabContent>
          <TabContent value="carteira" className="pt-4 text-sm text-texto-2">Conteúdo da aba Carteira.</TabContent>
        </Tabs>
      </Secao>

      <Secao titulo="Alertas">
        <div className="grid max-w-2xl gap-3">
          <Alert tom="info" titulo="Carteira desatualizada">A última atualização foi há 38 dias.</Alert>
          <Alert tom="ok">Lead convertido em cliente.</Alert>
          <Alert tom="atencao" titulo="Alocação fora do perfil">Ações Brasil está 7 p.p. acima do alvo.</Alert>
          <Alert tom="erro">Não foi possível salvar. Tente novamente.</Alert>
        </div>
      </Secao>

      <Secao titulo="Estado vazio e carregamento">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card><CardContent><EmptyState Icone={Users} titulo="Nenhum cliente ainda" descricao="Converta um lead ou cadastre um cliente para começar." acao={<Button size="sm"><Plus />Novo cliente</Button>} /></CardContent></Card>
          <Card>
            <CardContent className="flex flex-col gap-3 py-6">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </CardContent>
          </Card>
        </div>
      </Secao>

      <Secao titulo="Diálogo, painel lateral e atalhos">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Abrir diálogo</Button></DialogTrigger>
            <DialogContent titulo="Encerrar cliente" descricao="Os dados ficam guardados pelo prazo da CVM.">
              <div className="px-5 py-4 text-sm text-texto-2">Confirme o encerramento do contrato.</div>
              <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
                <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                <Button variant="danger">Encerrar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Abrir painel lateral</Button></DialogTrigger>
            <DialogContent posicao="lateral" titulo="Detalhes do lead" descricao="Painel para cadastros e detalhes rápidos.">
              <div className="flex-1 px-5 py-4 text-sm text-texto-2">Conteúdo do painel.</div>
            </DialogContent>
          </Dialog>
          <span className="text-sm text-texto-2">Busca global: <Kbd>⌘K</Kbd></span>
        </div>
      </Secao>
    </Page>
  );
}
