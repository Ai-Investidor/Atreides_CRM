import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { obterConexao } from "@/lib/agenda/conexao";
import { listarReunioes, type ReuniaoComLead } from "@/lib/agenda/consultas";
import type { EventoAgenda, SituacaoGoogle } from "@/lib/agenda/regras";
import { listarEventos, obterEvento, type EventoGoogle } from "@/lib/google/calendar";

/**
 * Eventos da agenda para o FullCalendar (Documentação/07):
 * reuniões do Atreides + eventos do Google Calendar do dono do workspace.
 * Ao ler, sincroniza do Google para o Atreides (horário, cancelamento, link do Meet).
 */
export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "sessao" }, { status: 401 });

  const url = new URL(request.url);
  const inicio = url.searchParams.get("start");
  const fim = url.searchParams.get("end");
  if (!inicio || !fim || Number.isNaN(Date.parse(inicio)) || Number.isNaN(Date.parse(fim))) {
    return NextResponse.json({ erro: "periodo" }, { status: 400 });
  }
  const iniISO = new Date(inicio).toISOString();
  const fimISO = new Date(fim).toISOString();

  const [reunioes, conexao] = await Promise.all([
    listarReunioes(sessao.atual.id, iniISO, fimISO),
    obterConexao(sessao.atual.id, sessao.perfil.id),
  ]);
  const situacao: SituacaoGoogle | null = conexao?.situacao ?? null;
  const proprio = situacao?.proprio ?? false;

  let doGoogle: EventoGoogle[] = [];
  let falhaGoogle = false;
  if (conexao?.token) {
    try {
      doGoogle = await listarEventos(conexao.token, iniISO, fimISO);
    } catch {
      falhaGoogle = true;
    }
  }

  const supabase = await createClient();
  const porId = new Map(reunioes.map((r) => [r.id, r]));
  const googlePorId = new Map(doGoogle.map((g) => [g.id, g]));

  // Reuniões do Atreides que foram movidas para este período direto no Google.
  const trazidas = doGoogle
    .map((g) => g.extendedProperties?.private?.atreidesId)
    .filter((id): id is string => !!id && !porId.has(id));
  if (trazidas.length) {
    const { data } = await supabase
      .from("meetings")
      .select("*, lead:leads(id, full_name), cliente:clients(id, full_name)")
      .eq("workspace_id", sessao.atual.id)
      .neq("status", "canceled")
      .in("id", trazidas);
    for (const r of (data as ReuniaoComLead[] | null) ?? []) porId.set(r.id, r);
  }

  const eventos: EventoAgenda[] = [];

  // 1. Reuniões do Atreides (sincronizadas com o Google quando possível).
  for (const r of porId.values()) {
    let g: EventoGoogle | null | undefined = r.google_event_id ? googlePorId.get(r.google_event_id) : undefined;
    if (conexao?.token && !falhaGoogle && r.google_event_id && !g) {
      g = await obterEvento(conexao.token, r.google_event_id).catch(() => undefined);
    }

    if (conexao?.token && !falhaGoogle && r.google_event_id && g !== undefined) {
      if (g === null || g.status === "cancelled") {
        await supabase.from("meetings").update({ status: "canceled" }).eq("id", r.id);
        continue;
      }
      const ini = g.start?.dateTime ? new Date(g.start.dateTime).toISOString() : null;
      const fimG = g.end?.dateTime ? new Date(g.end.dateTime).toISOString() : null;
      const mudou: { starts_at?: string; ends_at?: string; meet_url?: string } = {};
      if (ini && fimG && (Date.parse(ini) !== Date.parse(r.starts_at) || Date.parse(fimG) !== Date.parse(r.ends_at))) {
        mudou.starts_at = ini;
        mudou.ends_at = fimG;
      }
      if (r.format === "meet" && !r.meet_url && g.hangoutLink) mudou.meet_url = g.hangoutLink;
      if (Object.keys(mudou).length) {
        await supabase.from("meetings").update(mudou).eq("id", r.id);
        Object.assign(r, mudou);
      }
    }

    const { lead, cliente, ...reuniao } = r;
    eventos.push({
      id: `atreides:${r.id}`,
      title: r.title,
      start: r.starts_at,
      end: r.ends_at,
      allDay: false,
      editable: r.status === "scheduled" && Date.parse(r.ends_at) > Date.now(),
      classNames: ["ev-atreides", r.status === "done" ? "ev-realizada" : ""].filter(Boolean),
      extendedProps: { origem: "atreides", reuniao, leadNome: lead?.full_name ?? null, clienteNome: cliente?.full_name ?? null, htmlLink: g?.htmlLink ?? null },
    });
  }

  // 2. Demais eventos do Google (só leitura). Fora do próprio workspace, só "Ocupado".
  for (const g of doGoogle) {
    if (g.status === "cancelled" || g.extendedProperties?.private?.atreidesId) continue;
    const allDay = !g.start?.dateTime;
    const start = g.start?.dateTime ?? g.start?.date;
    const end = g.end?.dateTime ?? g.end?.date;
    if (!start || !end) continue;
    eventos.push(
      proprio
        ? {
            id: `google:${g.id}`,
            title: g.summary || "",
            start,
            end,
            allDay,
            editable: false,
            classNames: ["ev-google"],
            extendedProps: { origem: "google", htmlLink: g.htmlLink ?? null, local: g.location ?? null, meetUrl: g.hangoutLink ?? null },
          }
        : {
            id: `ocupado:${g.id}`,
            title: "",
            start,
            end,
            allDay,
            editable: false,
            classNames: ["ev-ocupado"],
            extendedProps: { origem: "ocupado" },
          },
    );
  }

  return NextResponse.json({ eventos, situacao, falhaGoogle }, { headers: { "Cache-Control": "no-store" } });
}
