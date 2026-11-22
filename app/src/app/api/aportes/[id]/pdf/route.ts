import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { carteiraDoCliente } from "@/lib/carteira/consultas";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";
import { hojeISO } from "@/lib/formatos";
import { formatosPdf, nomeArquivoPdf, respostaPdf } from "@/lib/pdf/formatos";
import { textosModelo } from "@/lib/pdf/textos";

/** PDF do plano de aportes do período, gerado na hora (não fica guardado). Documentação/06. */
export async function GET(_req: Request, ctx: RouteContext<"/api/aportes/[id]/pdf">) {
  const { id } = await ctx.params;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "sessao" }, { status: 401 });

  const supabase = await createClient();
  const { data: a } = await supabase
    .from("contributions")
    .select("*, itens:contribution_items(id, quantity, unit_price, amount, ativo:assets(ticker, name, asset_class)), cliente:clients(full_name)")
    .eq("id", id)
    .neq("status", "canceled")
    .maybeSingle();
  if (!a) return NextResponse.json({ erro: "naoEncontrado" }, { status: 404 });
  const [{ data: autor }, carteira] = await Promise.all([supabase.from("profiles").select("full_name").eq("id", a.created_by).maybeSingle(), carteiraDoCliente(a.client_id)]);

  const locale = "pt-BR";
  const [t, tc] = await Promise.all([getTranslations({ locale, namespace: "carteira.aportes.pdf" }), getTranslations({ locale, namespace: "carteira.classes" })]);
  const fmt = formatosPdf(locale);
  const nome = a.cliente?.full_name ?? "";
  const executado = a.status === "executed";
  const mensal = a.period_kind === "monthly";
  const periodo = mensal ? t("periodoMes", { mes: fmt.mesAnoLongo(a.period_start) }) : t("periodoSemana", { data: fmt.data(a.period_start) });

  const itens = (a.itens ?? []).map((i) => ({ ...i, valor: Number(i.amount), classe: (i.ativo?.asset_class ?? "alternatives") as ClasseAtivo }));
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const pctDe = (v: number, base: number) => (base > 0 ? (v / base) * 100 : 0);
  const pct1 = (v: number) => fmt.pct(v, v === 0 || v === 100 ? 0 : 1);

  // Distribuição por classe: o que entra neste aporte, a carteira hoje, depois do aporte (só no planejado) e o alvo.
  const porClasseAporte = new Map<ClasseAtivo, number>();
  for (const i of itens) porClasseAporte.set(i.classe, (porClasseAporte.get(i.classe) ?? 0) + i.valor);
  const hoje = new Map((carteira?.resumo.porClasse ?? []).map((c) => [c.classe, c.valor]));
  const totalHoje = carteira?.resumo.total ?? 0;
  const alvos = carteira?.alvos ?? {};
  const temAlvo = Object.keys(alvos).length > 0;
  const classes = CLASSES.filter((c) => (porClasseAporte.get(c) ?? 0) > 0 || (hoje.get(c) ?? 0) > 0 || (alvos[c] ?? 0) > 0).map((c) => {
    const ap = porClasseAporte.get(c) ?? 0;
    const h = hoje.get(c) ?? 0;
    return {
      classe: tc(c),
      aporte: ap > 0 ? `${fmt.moeda(ap)} · ${pct1(pctDe(ap, total))}` : "—",
      hoje: totalHoje > 0 ? pct1(pctDe(h, totalHoje)) : "—",
      depois: executado ? null : pct1(pctDe(h + ap, totalHoje + total)),
      alvo: alvos[c] !== undefined ? pct1(alvos[c]!) : "—",
    };
  });

  const { gerarPdfAporte } = await import("@/lib/carteira/pdf-aporte");
  const pdf = await gerarPdfAporte({
    nome,
    consultor: autor?.full_name ?? sessao.perfil.full_name,
    emitidoEm: fmt.data(hojeISO()),
    periodo,
    executado,
    numeros: [
      { rotulo: t("valorAporte"), valor: fmt.moeda(total, true) },
      { rotulo: t("ativos"), valor: String(itens.length) },
      { rotulo: t("periodo"), valor: mensal ? fmt.mesAno(a.period_start) : t("semanaDe", { data: fmt.data(a.period_start) }) },
      { rotulo: t("situacao"), valor: executado ? t("executado") : t("planejado"), detalhe: executado && a.executed_on ? t("executadoEm", { data: fmt.data(a.executed_on) }) : null },
    ],
    compras: itens
      .sort((x, y) => y.valor - x.valor)
      .map((i) => ({
        ticker: i.ativo?.ticker ?? i.ativo?.name ?? "—",
        nome: i.ativo?.ticker ? (i.ativo.name ?? null) : null,
        classe: tc(i.classe),
        quantidade: fmt.numero(Number(i.quantity), 4),
        preco: fmt.moeda(Number(i.unit_price), true),
        valor: fmt.moeda(i.valor, true),
        pct: pct1(pctDe(i.valor, total)),
      })),
    total: fmt.moeda(total, true),
    classes,
    temAlvo,
    notas: a.notes,
    t: (k, v) => t(k, v),
    textos: await textosModelo(locale),
  });
  return respostaPdf(pdf, nomeArquivoPdf("aporte", `${nome}-${a.period_start}`));
}
