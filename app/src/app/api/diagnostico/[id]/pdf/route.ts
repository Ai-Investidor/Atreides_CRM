import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { formatosPdf, nomeArquivoPdf, respostaPdf } from "@/lib/pdf/formatos";
import { textosModelo } from "@/lib/pdf/textos";

/** PDF do diagnóstico, gerado na hora a partir da versão atual (não fica guardado). Documentação/14. */
export async function GET(_req: Request, ctx: RouteContext<"/api/diagnostico/[id]/pdf">) {
  const { id } = await ctx.params;
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "sessao" }, { status: 401 });

  const supabase = await createClient();
  const { data: d } = await supabase
    .from("diagnoses")
    .select("content_md, monthly_expense, retirement_age, updated_at, lead:leads(full_name), cliente:clients(full_name), autor:profiles!diagnoses_updated_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!d) return NextResponse.json({ erro: "naoEncontrado" }, { status: 404 });

  const locale = "pt-BR";
  const t = await getTranslations({ locale, namespace: "diagnostico.pdf" });
  const nome = d.cliente?.full_name ?? d.lead?.full_name ?? "";
  const fmt = formatosPdf(locale);

  const { gerarPdfDiagnostico } = await import("@/lib/diagnostico/pdf");
  const pdf = await gerarPdfDiagnostico({
    markdown: d.content_md,
    nome,
    consultor: d.autor?.full_name ?? sessao.perfil.full_name,
    atualizadoEm: fmt.dataHora(d.updated_at),
    despesa: d.monthly_expense === null ? null : fmt.moeda(Number(d.monthly_expense), true),
    aposentadoria: d.retirement_age === null ? null : t("aposentadoriaValor", { idade: d.retirement_age }),
    t: (chave, valores) => t(chave, valores),
    textos: await textosModelo(locale),
  });

  return respostaPdf(pdf, nomeArquivoPdf("diagnostico", nome));
}
