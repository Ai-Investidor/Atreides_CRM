import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { obterPlanejamento } from "@/lib/planejamento/consultas";
import { CLASSES } from "@/lib/carteira/regras";
import { hojeISO } from "@/lib/formatos";
import { nomeArquivoPdf, respostaPdf } from "@/lib/pdf/formatos";
import { textosModelo } from "@/lib/pdf/textos";
import { aporteNecessario, dataDaIdade, GRUPO_DA_CLASSE, GRUPOS, mesesAte, patrimonioFuturo, taxaDaCarteira, totaisPorGrupo } from "@/lib/planejamento/regras";

/** PDF do planejamento, gerado na hora a partir da versão atual (não fica guardado). Documentação/05. */
export async function GET(_req: Request, ctx: RouteContext<"/api/planejamento/[id]/pdf">) {
  const { id } = await ctx.params;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "sessao" }, { status: 401 });
  const supabase = await createClient();
  const { data: ref } = await supabase.from("plans").select("client_id").eq("id", id).maybeSingle();
  if (!ref) return NextResponse.json({ erro: "naoEncontrado" }, { status: 404 });
  const d = await obterPlanejamento(ref.client_id);
  const p = d.plano!;

  const locale = "pt-BR";
  const [t, tp, tc] = await Promise.all([
    getTranslations({ locale, namespace: "planejamento.pdf" }),
    getTranslations({ locale, namespace: "planejamento" }),
    getTranslations({ locale, namespace: "carteira.classes" }),
  ]);
  const hoje = hojeISO();
  const moeda = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const pct = (v: number, casas = 0) => `${new Intl.NumberFormat(locale, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)}%`;
  const data = (iso: string, curta = false) =>
    new Intl.DateTimeFormat(locale, curta ? { timeZone: "UTC", month: "short", year: "numeric" } : { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

  const taxa = taxaDaCarteira(d.alocacao, p.cdi_ref === null ? null : Number(p.cdi_ref), p.ipca_ref === null ? null : Number(p.ipca_ref));
  const textoTaxa = taxa.ok ? tp("taxaCarteira", { real: pct(taxa.real * 100, 2), cdi: taxa.pctCdi === null ? "—" : pct(taxa.pctCdi) }) : tp(`taxaIndisponivel.${taxa.motivo}`);
  const g = totaisPorGrupo(d.alocacao);
  const aporte = p.monthly_contribution === null ? null : Number(p.monthly_contribution);

  // Aposentadoria (mesma regra da tela).
  const idade = d.diagnostico?.retirement_age ?? null;
  const nascimento = d.cliente?.birth_date ?? null;
  let aposentadoria: { valor: string | null; texto: string; nota: string | null } = { valor: null, texto: tp("aposentadoria.semIdade"), nota: null };
  if (idade && !nascimento) aposentadoria = { valor: null, texto: tp("aposentadoria.semNascimento"), nota: null };
  else if (idade && nascimento && !taxa.ok) aposentadoria = { valor: null, texto: tp("aposentadoria.semTaxa"), nota: null };
  else if (idade && nascimento && taxa.ok) {
    const alvo = dataDaIdade(nascimento, idade);
    const meses = mesesAte(hoje, alvo);
    const inicial = d.patrimonioAtual?.valor ?? 0;
    aposentadoria =
      meses === 0
        ? { valor: null, texto: tp("aposentadoria.idadePassou", { idade }), nota: null }
        : {
            valor: moeda.format(patrimonioFuturo(inicial, aporte ?? 0, taxa.real, meses)),
            texto: tp("aposentadoria.resultado", { idade, data: data(alvo, true), aporte: moeda.format(aporte ?? 0), inicial: moeda.format(inicial) }),
            nota: d.patrimonioAtual ? tp("aposentadoria.fonteInicial", { data: data(d.patrimonioAtual.data) }) : tp("aposentadoria.semFotografia"),
          };
  }

  const { gerarPdfPlanejamento } = await import("@/lib/planejamento/pdf");
  const nome = d.cliente?.full_name ?? "";
  const pdf = await gerarPdfPlanejamento({
    nome,
    consultor: p.autor?.full_name ?? sessao.perfil.full_name,
    atualizadoEm: data(p.updated_at),
    markdown: p.content_md,
    resumo: [
      { rotulo: tp("aporteMensal"), valor: aporte === null ? "—" : moeda.format(aporte) },
      { rotulo: tp("rentabilidade"), valor: textoTaxa },
      { rotulo: tp("proporcao"), valor: d.alocacao.length ? `${tp("grupos.rfCurto")} ${pct(g.rf)} · ${tp("grupos.rvCurto")} ${pct(g.rv)}${g.outros ? ` · ${tp("grupos.outrosCurto")} ${pct(g.outros)}` : ""}` : "—" },
    ],
    objetivos: d.objetivos.map((o) => {
      const a = taxa.ok ? aporteNecessario(o, taxa.real, hoje) : null;
      return {
        nome: o.name,
        valor: moeda.format(o.target_value),
        prazo: data(o.target_date, true),
        guardado: moeda.format(o.saved_value),
        aporte: !a ? "—" : a.tipo === "aporte" ? `${moeda.format(a.valor)}${tp("objetivos.porMes")}` : tp(a.tipo === "coberto" ? "objetivos.coberto" : "objetivos.prazoVencido"),
      };
    }),
    grupos: GRUPOS.filter((gr) => g[gr] > 0).map((gr) => ({
      nome: tp(`grupos.${gr}`),
      total: pct(g[gr]),
      pct: g[gr],
      classes: d.alocacao
        .filter((l) => GRUPO_DA_CLASSE[l.asset_class] === gr)
        .sort((a, b) => CLASSES.indexOf(a.asset_class) - CLASSES.indexOf(b.asset_class))
        .map((l) => ({
          nome: tc(l.asset_class),
          pct: pct(l.target_pct, l.target_pct % 1 ? 1 : 0),
          premissa: l.premise_kind ? tp(`premissas.texto.${l.premise_kind}`, { valor: pct(l.premise_value!, l.premise_value! % 1 ? 2 : 0) }) : null,
        })),
    })),
    aposentadoria,
    t: (chave, valores) => t(chave, valores),
    textos: await textosModelo(locale),
  });

  return respostaPdf(pdf, nomeArquivoPdf("planejamento", nome));
}
