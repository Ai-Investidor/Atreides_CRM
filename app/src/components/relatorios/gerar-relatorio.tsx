"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { criarRascunho } from "@/lib/relatorios/acoes";

/** "Gerar relatório": período já preenchido pela periodicidade do cliente (editável). */
export function GerarRelatorio({ clienteId, inicio, fim, variante = "primary" }: { clienteId: string; inicio: string; fim: string; variante?: "primary" | "secondary" }) {
  const t = useTranslations("relatorios.gerar");
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [periodo, setPeriodo] = useState({ inicio, fim });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button variant={variante} onClick={() => setAberto(true)}>
        <FilePlus2 />
        {t("botao")}
      </Button>
      <DialogContent titulo={t("titulo")} descricao={t("descricao")}>
        <form
          className="flex flex-col gap-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await criarRascunho(clienteId, periodo.inicio, periodo.fim);
              if (!r.ok) return setErro(r.mensagem);
              router.push(`/relatorios/${r.id}`);
            });
          }}
        >
          {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
          <div className="grid grid-cols-2 gap-3">
            <Field rotulo={t("inicio")}>{(p) => <Input {...p} type="date" value={periodo.inicio} onChange={(e) => setPeriodo((x) => ({ ...x, inicio: e.target.value }))} />}</Field>
            <Field rotulo={t("fim")}>{(p) => <Input {...p} type="date" value={periodo.fim} onChange={(e) => setPeriodo((x) => ({ ...x, fim: e.target.value }))} />}</Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("criar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
