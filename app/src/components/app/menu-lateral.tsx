"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Languages, LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { Simbolo } from "@/components/simbolo";
import { sair } from "@/lib/auth";
import { trocarIdioma } from "@/lib/idioma";
import { trocarWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { Sessao } from "@/lib/sessao";
import { NAVEGACAO } from "./navegacao";

type MenuLateralProps = { sessao: Sessao; aoNavegar?: () => void };

/** Conteúdo do menu lateral (usado fixo no desktop e em gaveta no celular). */
export function MenuLateral({ sessao, aoNavegar }: MenuLateralProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-marinho text-osso">
      {/* Assinatura */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <Simbolo tamanho={30} />
        <span className="font-titulo text-[17px] font-bold tracking-[0.16em]">ATREIDES</span>
      </div>

      <div className="px-3">
        <SeletorWorkspace sessao={sessao} />
      </div>

      {/* Navegação */}
      <nav aria-label={t("label")} className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        {NAVEGACAO.filter((secao) => !secao.soAdmin || sessao.perfil.role === "admin").map((secao) => (
          <div key={secao.chave} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-nevoa/70">
              {t(`secoes.${secao.chave}`)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {secao.itens.map(({ chave, href, Icone, pronto }) => {
                const ativo = pathname === href || pathname.startsWith(`${href}/`);
                const base = "group flex h-9 items-center gap-3 rounded-marca px-2.5 text-[13.5px] transition-colors";
                if (!pronto) {
                  return (
                    <li key={chave}>
                      <span aria-disabled="true" className={cn(base, "cursor-default text-nevoa/55")}>
                        <Icone className="size-[17px] shrink-0" aria-hidden="true" />
                        <span className="flex-1">{t(chave)}</span>
                        <span className="text-[10px] font-medium text-nevoa/45">
                          {t("soon")}
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={chave}>
                    <Link
                      href={href}
                      onClick={aoNavegar}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        base,
                        ativo
                          ? "bg-white/[0.07] font-medium text-osso shadow-[inset_2px_0_0_var(--color-latao)]"
                          : "text-menu-texto hover:bg-white/[0.04] hover:text-osso",
                      )}
                    >
                      <Icone className={cn("size-[17px] shrink-0", ativo ? "text-latao" : "text-nevoa group-hover:text-osso")} aria-hidden="true" />
                      {t(chave)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <MenuUsuario sessao={sessao} />
      </div>
    </div>
  );
}

function SeletorWorkspace({ sessao }: { sessao: Sessao }) {
  const t = useTranslations("workspace");
  const [pendente, iniciar] = useTransition();
  const { atual, workspaces, perfil } = sessao;
  const dono = (w: { owner_id: string }) => w.owner_id === perfil.id;

  return (
    <Menu>
      <MenuTrigger
        className="flex w-full items-center gap-2.5 rounded-marca border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] data-[state=open]:bg-white/[0.06]"
        aria-busy={pendente}
      >
        <Avatar nome={atual.name} tamanho="sm" tom="escuro" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-osso">{atual.name}</span>
          <span className="block truncate text-[11px] text-nevoa">{dono(atual) ? t("meu") : t("colega")}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-nevoa" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60">
        <MenuLabel>{t("titulo")}</MenuLabel>
        {workspaces.map((w) => (
          <MenuItem key={w.id} onSelect={() => iniciar(() => trocarWorkspace(w.id))}>
            <Avatar nome={w.name} tamanho="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{w.name}</span>
              <span className="block text-xs text-texto-3">{dono(w) ? t("meu") : t("colega")}</span>
            </span>
            {w.id === atual.id ? <Check className="!text-texto" aria-label={t("atual")} /> : null}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function MenuUsuario({ sessao }: { sessao: Sessao }) {
  const t = useTranslations("usuario");
  const locale = useLocale();
  const { perfil } = sessao;
  const [saindo, iniciarSaida] = useTransition();

  return (
    <Menu>
      <MenuTrigger className="flex w-full items-center gap-2.5 rounded-marca px-2 py-2 text-left transition-colors hover:bg-white/[0.05] data-[state=open]:bg-white/[0.05]">
        <Avatar nome={perfil.full_name || perfil.email} tamanho="md" tom="escuro" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-osso">{perfil.full_name}</span>
          <span className="block truncate text-[11px] text-nevoa">{t(`papel.${perfil.role}`)}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-nevoa" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent side="top" align="start" className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{perfil.full_name}</p>
          <p className="truncate text-xs text-texto-3">{perfil.email}</p>
        </div>
        <MenuSeparator />
        {perfil.role === "admin" ? (
          <MenuItem asChild>
            <Link href="/configuracoes/equipe">
              <Settings />
              {t("configuracoes")}
            </Link>
          </MenuItem>
        ) : null}
        <MenuLabel className="flex items-center gap-2">
          <Languages className="size-3.5" aria-hidden="true" />
          {t("idioma")}
        </MenuLabel>
        {(["pt-BR", "en"] as const).map((l) => (
          <MenuItem
            key={l}
            onSelect={() => {
              const fd = new FormData();
              fd.set("locale", l);
              void trocarIdioma(fd);
            }}
          >
            <span className="w-4" aria-hidden="true">{l === locale ? <Check className="!text-texto" /> : null}</span>
            {l === "pt-BR" ? "Português" : "English"}
          </MenuItem>
        ))}
        <MenuSeparator />
        {/* Ação direta: um <form> dentro do menu some antes de enviar (o menu fecha ao selecionar). */}
        <MenuItem
          disabled={saindo}
          onSelect={(e) => {
            e.preventDefault();
            iniciarSaida(() => sair());
          }}
          className="text-erro [&_svg]:!text-erro"
        >
          <LogOut />
          {t("sair")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
