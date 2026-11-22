"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, Menu as MenuIcone, Plus, Search, Target, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/feedback";
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlay";
import type { Sessao } from "@/lib/sessao";
import { MenuLateral } from "./menu-lateral";

/** Barra do topo: menu (celular), busca global, criação rápida. */
export function BarraSuperior({ sessao }: { sessao: Sessao }) {
  const t = useTranslations("topo");
  const [gaveta, setGaveta] = useState(false);
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K foca a busca.
  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campo.current?.focus();
      }
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borda bg-fundo/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      {/* Menu no celular */}
      <Dialog open={gaveta} onOpenChange={setGaveta}>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label={t("abrirMenu")} onClick={() => setGaveta(true)}>
          <MenuIcone />
        </Button>
        <DialogContent titulo={t("abrirMenu")} posicao="esquerda" className="border-0 bg-marinho">
          <MenuLateral sessao={sessao} aoNavegar={() => setGaveta(false)} />
        </DialogContent>
      </Dialog>

      {/* Busca global: clientes por nome, CPF, e-mail ou celular */}
      <form
        role="search"
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-marca border border-borda bg-superficie px-3 text-sm shadow-card focus-within:border-marinho"
        onSubmit={(e) => {
          e.preventDefault();
          const q = campo.current?.value.trim();
          if (q) router.push(`/clientes?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search className="size-4 shrink-0 text-texto-3" aria-hidden="true" />
        <input
          ref={campo}
          type="search"
          name="q"
          placeholder={t("buscar")}
          aria-label={t("buscar")}
          className="h-full min-w-0 flex-1 bg-transparent text-texto outline-none placeholder:text-texto-3"
        />
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Menu>
          <MenuTrigger asChild>
            <Button size="md">
              <Plus />
              <span className="hidden sm:inline">{t("novo")}</span>
            </Button>
          </MenuTrigger>
          <MenuContent align="end" className="w-60">
            <MenuItem asChild>
              <Link href="/leads?novo=1">
                <Target />
                <span className="flex-1">{t("novoLead")}</span>
              </Link>
            </MenuItem>
            <MenuItem asChild>
              <Link href="/clientes?novo=1">
                <UserPlus />
                <span className="flex-1">{t("novoCliente")}</span>
              </Link>
            </MenuItem>
            <MenuItem asChild>
              <Link href="/agenda?novo=1">
                <CalendarPlus />
                <span className="flex-1">{t("novaReuniao")}</span>
              </Link>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
