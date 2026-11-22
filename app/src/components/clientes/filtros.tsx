"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/form";
import { PERFIS, STATUS } from "@/lib/clientes/regras";

/** Busca e filtros da lista de clientes (guardados na URL). */
export function FiltrosClientes() {
  const t = useTranslations("clientes");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, iniciar] = useTransition();
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const primeiro = useRef(true);

  function aplicar(chave: string, valor: string | null) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    p.delete("novo");
    iniciar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`));
  }

  // Busca com pequena espera enquanto digita.
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    const id = setTimeout(() => aplicar("q", busca.trim() || null), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const ativos = ["status", "perfil", "q"].some((k) => params.get(k));

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-marca border border-borda-forte bg-superficie px-3 focus-within:border-marinho focus-within:ring-3 focus-within:ring-marinho/10">
        <Search className="size-4 shrink-0 text-texto-3" aria-hidden="true" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("filtros.busca")}
          aria-label={t("filtros.busca")}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-texto outline-none placeholder:text-texto-3"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select value={params.get("status") ?? "abertos"} onValueChange={(v) => aplicar("status", v === "abertos" ? null : v)} aria-label={t("filtros.status")} className="sm:w-44">
          <SelectItem value="abertos">{t("filtros.abertos")}</SelectItem>
          {STATUS.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`status.${s}`)}
            </SelectItem>
          ))}
        </Select>
        <Select value={params.get("perfil") ?? "todos"} onValueChange={(v) => aplicar("perfil", v === "todos" ? null : v)} aria-label={t("filtros.perfil")} className="sm:w-44">
          <SelectItem value="todos">{t("filtros.todosPerfis")}</SelectItem>
          {PERFIS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`perfil.perfis.${p}`)}
            </SelectItem>
          ))}
          <SelectItem value="sem">{t("perfil.sem")}</SelectItem>
        </Select>
        {ativos ? (
          <Button
            variant="ghost"
            onClick={() => {
              setBusca("");
              iniciar(() => router.replace(pathname));
            }}
          >
            <X />
            {t("filtros.limpar")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
