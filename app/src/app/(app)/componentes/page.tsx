import type { Metadata } from "next";
import { Galeria } from "./galeria";

export const metadata: Metadata = { title: "Componentes" };

/** Referência viva do design system (Documentação/12). Não é tela de negócio. */
export default function ComponentesPage() {
  return <Galeria />;
}
