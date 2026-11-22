import {
  BriefcaseBusiness,
  CalendarDays,
  CandlestickChart,
  FileText,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = {
  /** Chave de tradução em messages/*.json → nav.<chave> */
  chave: string;
  href: string;
  Icone: LucideIcon;
  /** false = módulo ainda não construído (aparece como "Em breve"). */
  pronto: boolean;
};

export type SecaoNav = {
  chave: string;
  itens: ItemNav[];
  /** true = seção só aparece para o admin (a página e o banco também barram os demais). */
  soAdmin?: boolean;
};

/** Menu principal, agrupado por área (Documentação/12 › Navegação). */
export const NAVEGACAO: SecaoNav[] = [
  {
    chave: "geral",
    itens: [
      { chave: "painel", href: "/painel", Icone: LayoutDashboard, pronto: true },
      { chave: "agenda", href: "/agenda", Icone: CalendarDays, pronto: true },
      { chave: "tarefas", href: "/tarefas", Icone: ListChecks, pronto: true },
    ],
  },
  {
    chave: "relacionamento",
    itens: [
      { chave: "leads", href: "/leads", Icone: Target, pronto: true },
      { chave: "clientes", href: "/clientes", Icone: Users, pronto: true },
    ],
  },
  {
    chave: "investimentos",
    itens: [
      { chave: "carteiras", href: "/carteiras", Icone: BriefcaseBusiness, pronto: true },
      { chave: "ativos", href: "/ativos", Icone: CandlestickChart, pronto: true },
      { chave: "relatorios", href: "/relatorios", Icone: FileText, pronto: true },
    ],
  },
  {
    chave: "administracao",
    soAdmin: true,
    itens: [
      { chave: "equipe", href: "/configuracoes/equipe", Icone: ShieldCheck, pronto: true },
      { chave: "configClientes", href: "/configuracoes/clientes", Icone: SlidersHorizontal, pronto: true },
    ],
  },
];
