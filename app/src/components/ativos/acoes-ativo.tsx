"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookmarkCheck, BookmarkPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, SelectItem } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { FormLancamento } from "@/components/carteira/formularios";
import { alternarLista } from "@/lib/ativos/acoes";
import type { OpcaoAtivo } from "@/lib/carteira/acoes";

type Props = { ativo: OpcaoAtivo; naLista: boolean; clientes: { id: string; full_name: string }[] };

/** Acompanhar (lista pessoal) e adicionar à carteira de um cliente. */
export function AcoesAtivo({ ativo, naLista, clientes }: Props) {
  const t = useTranslations("ativos.acoes");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [escolhendo, setEscolhendo] = useState(false);
  const [cliente, setCliente] = useState(clientes[0]?.id ?? "");
  const [lancando, setLancando] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            await alternarLista(ativo.ticker!, ativo.nome, !naLista);
            router.refresh();
          })
        }
      >
        {naLista ? <BookmarkCheck className="!text-ok" /> : <BookmarkPlus />}
        {naLista ? t("naLista") : t("acompanhar")}
      </Button>
      <Button onClick={() => setEscolhendo(true)} disabled={!clientes.length}>
        <Plus />
        {t("adicionar")}
      </Button>

      <Dialog open={escolhendo} onOpenChange={setEscolhendo}>
        <DialogContent titulo={t("escolherTitulo", { ticker: ativo.ticker ?? "" })} descricao={t("escolherDescricao")}>
          <div className="flex flex-col gap-4 px-5 py-4">
            <Field rotulo={t("cliente")}>
              {(p) => (
                <Select {...p} value={cliente} onValueChange={setCliente}>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEscolhendo(false)}>
                {t("cancelar")}
              </Button>
              <Button
                disabled={!cliente}
                onClick={() => {
                  setEscolhendo(false);
                  setLancando(cliente);
                }}
              >
                {t("continuar")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {lancando ? <FormLancamento clienteId={lancando} ativoInicial={ativo} aoFechar={() => setLancando(null)} /> : null}
    </>
  );
}
