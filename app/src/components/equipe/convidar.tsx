"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { convidarConsultor, type ResultadoEquipe } from "@/lib/equipe/acoes";
import { BotoesConvite, useMensagemConvite } from "./mensagem-convite";

/** Painel "Convidar consultor": nome + e-mail Google; depois mostra a mensagem pronta para enviar. */
export function Convidar() {
  const t = useTranslations("equipe");
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({ full_name: "", email: "" });
  const [resultado, setResultado] = useState<ResultadoEquipe | null>(null);
  const [enviado, setEnviado] = useState<{ nome: string; email: string } | null>(null);

  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (campo: string) => (erros[campo] ? t(`erros.${erros[campo]}`) : undefined);

  function fechar(v: boolean) {
    setAberto(v);
    if (!v) {
      setForm({ full_name: "", email: "" });
      setResultado(null);
      setEnviado(null);
    }
  }

  function salvar() {
    iniciar(async () => {
      const r = await convidarConsultor(form);
      setResultado(r);
      if (r.ok) setEnviado({ nome: form.full_name.trim(), email: form.email.trim().toLowerCase() });
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <Button onClick={() => setAberto(true)}>
        <UserPlus />
        {t("convidar")}
      </Button>
      <DialogContent posicao="lateral" titulo={t("convite.titulo")} descricao={t("convite.descricao")}>
        {enviado ? (
          <Enviado nome={enviado.nome} email={enviado.email} aoConcluir={() => fechar(false)} />
        ) : (
          <form
            className="flex flex-1 flex-col overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
              {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}
              <Field rotulo={t("campos.nome")} obrigatorio erro={erro("full_name")}>
                {(p) => <Input {...p} autoFocus autoComplete="off" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />}
              </Field>
              <Field rotulo={t("campos.email")} obrigatorio dica={t("campos.emailDica")} erro={erro("email")}>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    autoComplete="off"
                    placeholder="nome@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                )}
              </Field>
              <div className="rounded-card border border-borda bg-superficie-2 p-4 text-[13px] text-texto-2">
                <p className="font-semibold text-texto">{t("convite.comoFunciona")}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>{t("convite.passo1")}</li>
                  <li>{t("convite.passo2")}</li>
                  <li>{t("convite.passo3")}</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
              <Button type="button" variant="ghost" onClick={() => fechar(false)}>
                {t("acoes.cancelar")}
              </Button>
              <Button type="submit" carregando={pendente}>
                {t("convite.salvar")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Enviado({ nome, email, aoConcluir }: { nome: string; email: string; aoConcluir: () => void }) {
  const t = useTranslations("equipe");
  const { texto } = useMensagemConvite({ nome, email });
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <Alert tom="ok" titulo={t("convite.criadoTitulo")}>
          {t("convite.criadoTexto", { nome })}
        </Alert>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-texto">{t("convite.mensagem")}</p>
          <p className="whitespace-pre-line rounded-card border border-borda bg-superficie-2 p-4 text-[13px] leading-relaxed text-texto-2">{texto}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotoesConvite nome={nome} email={email} tamanho="md" />
        </div>
      </div>
      <div className="flex justify-end border-t border-divisoria px-5 py-3">
        <Button type="button" onClick={aoConcluir}>
          <CircleCheck />
          {t("acoes.concluir")}
        </Button>
      </div>
    </div>
  );
}
