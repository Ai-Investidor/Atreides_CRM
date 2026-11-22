"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRightLeft, CalendarPlus, Download, MoreHorizontal, Pause, Play, Trash2, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { excluirCliente, exportarCliente, mudarStatus, transferirCliente, type ResultadoCliente } from "@/lib/clientes/acoes";
import type { Cliente } from "@/lib/clientes/regras";
import { formatarData } from "@/lib/formatos";
import { EtiquetaPerfil, EtiquetaStatus } from "./etiquetas";

type Props = {
  cliente: Cliente;
  workspaceNome: string;
  admin: boolean;
  workspaces: { id: string; name: string }[];
};

type Acao = "encerrar" | "transferir" | "excluir" | null;

/** Cabeçalho da ficha: identidade, situação e ações do cliente. */
export function CabecalhoCliente({ cliente, workspaceNome, admin, workspaces }: Props) {
  const t = useTranslations("clientes");
  const locale = useLocale();
  const router = useRouter();
  const [acao, setAcao] = useState<Acao>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const encerrado = cliente.status === "closed";

  function executar(fn: () => Promise<ResultadoCliente>, depois?: (r: Extract<ResultadoCliente, { ok: true }>) => void) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        setErro(r.mensagem === "retencao" && r.data ? t("erros.retencaoAte", { data: formatarData(r.data, locale) }) : t(`erros.${r.mensagem ?? Object.values(r.erros ?? {})[0] ?? "salvar"}`));
        return;
      }
      setAcao(null);
      if (depois) depois(r);
      else router.refresh();
    });
  }

  function exportar() {
    executar(
      () => exportarCliente(cliente.id),
      (r) => {
        const blob = new Blob([r.dados ?? "{}"], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cliente-${cliente.full_name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    );
  }

  return (
    <header className="flex flex-col gap-4">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-3 hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("titulo")}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nome={cliente.full_name} tamanho="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-titulo text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-texto">{cliente.full_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <EtiquetaStatus status={cliente.status} />
              <EtiquetaPerfil cliente={cliente} />
              {cliente.migrated ? <Badge tom="neutro">{t("migrado")}</Badge> : null}
              <span className="text-xs text-texto-3">· {workspaceNome}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!encerrado ? (
            <Button asChild variant="secondary">
              <Link href={`/agenda?novo=1&cliente=${cliente.id}`}>
                <CalendarPlus />
                {t("acoes.agendar")}
              </Link>
            </Button>
          ) : null}
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label={t("acoes.mais", { nome: cliente.full_name })}>
                <MoreHorizontal />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" className="w-64">
              {cliente.status === "active" || cliente.status === "onboarding" ? (
                <MenuItem onSelect={() => executar(() => mudarStatus(cliente.id, "paused"))}>
                  <Pause />
                  {t("acoes.pausar")}
                </MenuItem>
              ) : null}
              {cliente.status === "paused" ? (
                <MenuItem onSelect={() => executar(() => mudarStatus(cliente.id, "active"))}>
                  <Play />
                  {t("acoes.reativar")}
                </MenuItem>
              ) : null}
              {!encerrado ? (
                <MenuItem onSelect={() => setAcao("encerrar")} className="text-erro [&_svg]:!text-erro">
                  <XCircle />
                  {t("acoes.encerrar")}
                </MenuItem>
              ) : null}
              {admin ? (
                <>
                  <MenuSeparator />
                  <MenuLabel>{t("acoes.admin")}</MenuLabel>
                  {!encerrado && workspaces.length > 1 ? (
                    <MenuItem onSelect={() => setAcao("transferir")}>
                      <ArrowRightLeft />
                      {t("acoes.transferir")}
                    </MenuItem>
                  ) : null}
                  <MenuItem onSelect={exportar}>
                    <Download />
                    {t("acoes.exportar")}
                  </MenuItem>
                  <MenuItem onSelect={() => setAcao("excluir")} className="text-erro [&_svg]:!text-erro">
                    <Trash2 />
                    {t("acoes.excluir")}
                  </MenuItem>
                </>
              ) : null}
            </MenuContent>
          </Menu>
        </div>
      </div>

      {erro && !acao ? <Alert tom="erro">{erro}</Alert> : null}
      {encerrado ? (
        <Alert tom="info" titulo={t("encerrado.titulo", { data: cliente.closed_at ? formatarData(cliente.closed_at.slice(0, 10), locale) : "—" })}>
          {t("encerrado.texto", { motivo: cliente.closing_reason ?? "—", data: cliente.retain_until ? formatarData(cliente.retain_until, locale) : "—" })}
        </Alert>
      ) : null}

      <Encerrar aberto={acao === "encerrar"} aoFechar={() => setAcao(null)} pendente={pendente} erro={erro} aoConfirmar={(m) => executar(() => mudarStatus(cliente.id, "closed", m))} />
      <Transferir
        aberto={acao === "transferir"}
        aoFechar={() => setAcao(null)}
        pendente={pendente}
        erro={erro}
        workspaces={workspaces.filter((w) => w.id !== cliente.workspace_id)}
        aoConfirmar={(w) => executar(() => transferirCliente(cliente.id, w))}
      />
      <Excluir
        aberto={acao === "excluir"}
        aoFechar={() => {
          setAcao(null);
          setErro(null);
        }}
        pendente={pendente}
        erro={erro}
        nome={cliente.full_name}
        aoConfirmar={() => executar(() => excluirCliente(cliente.id), () => router.push("/clientes"))}
      />
    </header>
  );
}

type Dlg = { aberto: boolean; aoFechar: () => void; pendente: boolean; erro: string | null };

function Encerrar({ aberto, aoFechar, pendente, erro, aoConfirmar }: Dlg & { aoConfirmar: (motivo: string) => void }) {
  const t = useTranslations("clientes");
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("encerrar.titulo")} descricao={t("encerrar.descricao")}>
        <div className="flex flex-col gap-4 px-5 py-4">
          {erro ? <Alert tom="erro">{erro}</Alert> : null}
          <Field rotulo={t("encerrar.motivo")} obrigatorio>
            {(p) => <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={aoFechar}>
              {t("acoes.cancelar")}
            </Button>
            <Button variant="danger" carregando={pendente} disabled={motivo.trim().length < 3} onClick={() => aoConfirmar(motivo)}>
              {t("encerrar.confirmar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Transferir({ aberto, aoFechar, pendente, erro, workspaces, aoConfirmar }: Dlg & { workspaces: { id: string; name: string }[]; aoConfirmar: (w: string) => void }) {
  const t = useTranslations("clientes");
  const [destino, setDestino] = useState(workspaces[0]?.id ?? "");
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("transferir.titulo")} descricao={t("transferir.descricao")}>
        <div className="flex flex-col gap-4 px-5 py-4">
          {erro ? <Alert tom="erro">{erro}</Alert> : null}
          <Field rotulo={t("transferir.destino")} obrigatorio>
            {(p) => (
              <Select {...p} value={destino} onValueChange={setDestino}>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={aoFechar}>
              {t("acoes.cancelar")}
            </Button>
            <Button carregando={pendente} disabled={!destino} onClick={() => aoConfirmar(destino)}>
              {t("transferir.confirmar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmação dupla: digitar o nome do cliente. */
function Excluir({ aberto, aoFechar, pendente, erro, nome, aoConfirmar }: Dlg & { nome: string; aoConfirmar: () => void }) {
  const t = useTranslations("clientes");
  const [digitado, setDigitado] = useState("");
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("excluir.titulo")} descricao={t("excluir.descricao")}>
        <div className="flex flex-col gap-4 px-5 py-4">
          {erro ? <Alert tom="erro">{erro}</Alert> : null}
          <Field rotulo={t("excluir.digite", { nome })}>
            {(p) => <Input {...p} autoComplete="off" value={digitado} onChange={(e) => setDigitado(e.target.value)} />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={aoFechar}>
              {t("acoes.cancelar")}
            </Button>
            <Button variant="danger" carregando={pendente} disabled={digitado.trim() !== nome.trim()} onClick={aoConfirmar}>
              {t("excluir.confirmar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
