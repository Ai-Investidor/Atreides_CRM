"use client";

import { useId } from "react";
import { Select as S } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const campoBase =
  "w-full rounded-marca border border-borda bg-superficie px-3 text-sm text-texto shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-texto-3 hover:border-borda-forte focus-visible:border-marinho focus-visible:ring-3 focus-visible:ring-marinho/10 disabled:cursor-not-allowed disabled:bg-superficie-2 disabled:opacity-60 aria-invalid:border-erro aria-invalid:focus-visible:ring-erro/10";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(campoBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(campoBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

type SelectProps = React.ComponentProps<typeof S.Root> & {
  /** Texto exibido quando nada foi escolhido. */
  placeholder?: string;
  tamanho?: "sm" | "md";
  className?: string;
  /** Recebidos do <Field> para ligar rótulo, dica e erro ao campo. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

/**
 * Seleção para listas curtas e fixas (origem, etapa, perfil, status).
 * A lista abre logo abaixo do campo, com a aparência do sistema, e funciona com
 * teclado e leitor de tela. Opções com <SelectItem>, grupos com <SelectGroup>.
 *
 * <Select placeholder="Selecione" name="origem"><SelectItem value="instagram">Instagram</SelectItem></Select>
 */
export function Select({
  placeholder,
  tamanho = "md",
  className,
  id,
  children,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  "aria-label": ariaLabel,
  ...props
}: SelectProps) {
  return (
    <S.Root {...props}>
      <S.Trigger
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        className={cn(
          campoBase,
          "group flex items-center justify-between gap-2 text-left data-[placeholder]:text-texto-3 data-[state=open]:border-marinho data-[state=open]:ring-3 data-[state=open]:ring-marinho/10",
          tamanho === "sm" ? "h-8 text-[13px]" : "h-10",
          className,
        )}
      >
        <span className="truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-texto-3 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-borda bg-superficie text-sm text-texto shadow-elevado animate-surgir"
        >
          <S.Viewport className="p-1">{children}</S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof S.Item>) {
  return (
    <S.Item
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center rounded-marca py-2 pl-2.5 pr-8 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-divisoria data-[state=checked]:font-medium data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check className="size-4 text-marinho" aria-hidden="true" />
      </S.ItemIndicator>
    </S.Item>
  );
}

export function SelectGroup({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <S.Group>
      <S.Label className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-texto-3">{rotulo}</S.Label>
      {children}
    </S.Group>
  );
}

export function SelectSeparator() {
  return <S.Separator className="-mx-1 my-1 h-px bg-divisoria" />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-texto", className)} {...props} />;
}

type FieldProps = {
  rotulo: string;
  /** Texto de ajuda abaixo do campo. */
  dica?: string;
  erro?: string;
  obrigatorio?: boolean;
  className?: string;
  /** Recebe o id gerado e os atributos de acessibilidade para ligar ao controle. */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
};

/**
 * Campo de formulário completo: rótulo + controle + dica ou erro, já ligados
 * por id para leitores de tela.
 *
 * <Field rotulo="Nome" obrigatorio>{(p) => <Input {...p} />}</Field>
 */
export function Field({ rotulo, dica, erro, obrigatorio, className, children }: FieldProps) {
  const id = useId();
  const descId = dica || erro ? `${id}-desc` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio ? <span className="ml-0.5 text-erro" aria-hidden="true">*</span> : null}
      </Label>
      {children({ id, "aria-describedby": descId, "aria-invalid": erro ? true : undefined })}
      {erro ? (
        <p id={descId} className="text-xs font-medium text-erro">{erro}</p>
      ) : dica ? (
        <p id={descId} className="text-xs text-texto-3">{dica}</p>
      ) : null}
    </div>
  );
}
