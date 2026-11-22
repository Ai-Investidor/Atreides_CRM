"use client";

import { Dialog as D, DropdownMenu as DM, Tabs as T, Tooltip as TT } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Menu suspenso ────────────────────────────────────────────── */

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export const MenuGroup = DM.Group;

export function MenuContent({ className, align = "start", sideOffset = 6, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-56 overflow-hidden rounded-card border border-borda bg-superficie p-1 text-sm text-texto shadow-elevado animate-surgir",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

export function MenuItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        "flex min-h-9 cursor-default select-none items-center gap-2.5 rounded-marca px-2.5 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-divisoria data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-texto-3",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn("px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-texto-3", className)} {...props} />;
}

export function MenuSeparator({ className }: { className?: string }) {
  return <DM.Separator className={cn("-mx-1 my-1 h-px bg-divisoria", className)} />;
}

/* ── Diálogo (modal) e painel lateral ─────────────────────────── */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

type DialogContentProps = React.ComponentProps<typeof D.Content> & {
  titulo: string;
  descricao?: string;
  /** "centro" = modal; "lateral" = painel que desliza da direita (cadastros, detalhes). */
  posicao?: "centro" | "lateral" | "esquerda";
};

export function DialogContent({ titulo, descricao, posicao = "centro", className, children, ...props }: DialogContentProps) {
  const posicoes = {
    centro: "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-card",
    lateral: "inset-y-0 right-0 h-full w-full max-w-md border-l",
    esquerda: "inset-y-0 left-0 h-full w-[18rem] max-w-[85vw] border-r",
  };
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-marinho/40 backdrop-blur-[2px] animate-surgir" />
      <D.Content
        className={cn("fixed z-50 flex flex-col border-borda bg-superficie shadow-elevado outline-none animate-surgir", posicoes[posicao], className)}
        {...props}
      >
        <div className={cn("flex items-start justify-between gap-4", posicao === "esquerda" ? "sr-only" : "border-b border-divisoria px-5 py-4")}>
          <div>
            <D.Title className="text-base font-semibold text-texto">{titulo}</D.Title>
            {descricao ? <D.Description className="mt-0.5 text-[13px] text-texto-3">{descricao}</D.Description> : null}
          </div>
          <D.Close aria-label="Fechar" className="-mr-1 flex size-8 items-center justify-center rounded-marca text-texto-3 hover:bg-divisoria hover:text-texto">
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/* ── Abas ─────────────────────────────────────────────────────── */

export const Tabs = T.Root;
export const TabContent = T.Content;

export function TabList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex gap-1 overflow-x-auto border-b border-borda", className)} {...props} />;
}

export function Tab({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "-mb-px whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-texto-3 transition-colors hover:text-texto data-[state=active]:border-marinho data-[state=active]:text-texto",
        className,
      )}
      {...props}
    />
  );
}

/* ── Dica (tooltip) ───────────────────────────────────────────── */

export function Dica({ texto, children, lado = "top" }: { texto: string; children: React.ReactNode; lado?: "top" | "right" | "bottom" | "left" }) {
  return (
    <TT.Provider delayDuration={300}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content side={lado} sideOffset={6} className="z-50 rounded-marca bg-marinho px-2.5 py-1.5 text-xs font-medium text-osso shadow-elevado animate-surgir">
            {texto}
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}
