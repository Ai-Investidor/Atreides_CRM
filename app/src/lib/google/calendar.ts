import { FUSO } from "@/lib/formatos";

/**
 * Cliente mínimo do Google Calendar (API REST v3), sem SDK.
 * Usado só no servidor. Documentação/07.
 */

export const ESCOPO_AGENDA = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** Erros que a tela sabe explicar: sem configuração, conexão revogada, sem permissão ou falha genérica. */
export class ErroGoogle extends Error {
  constructor(
    public codigo: "configuracao" | "revogado" | "permissao" | "falha",
    detalhe?: string,
  ) {
    super(detalhe ?? codigo);
  }
}

export function googleConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_TOKEN_KEY);
}

// Token de acesso (1 h) em memória, por token de atualização.
const cache = new Map<string, { token: string; expira: number }>();

export async function tokenDeAcesso(refreshToken: string): Promise<string> {
  if (!googleConfigurado()) throw new ErroGoogle("configuracao");
  const guardado = cache.get(refreshToken);
  if (guardado && guardado.expira > Date.now() + 60_000) return guardado.token;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const corpo = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !corpo.access_token) {
    if (corpo.error === "invalid_grant") throw new ErroGoogle("revogado");
    if (corpo.error === "invalid_client" || corpo.error === "unauthorized_client") throw new ErroGoogle("configuracao", corpo.error);
    throw new ErroGoogle("falha", corpo.error);
  }
  cache.set(refreshToken, { token: corpo.access_token, expira: Date.now() + (corpo.expires_in ?? 3600) * 1000 });
  return corpo.access_token;
}

async function chamar<T>(token: string, url: string, init: RequestInit = {}): Promise<T | null> {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (r.status === 404 || r.status === 410) return null;
  if (r.status === 401) throw new ErroGoogle("revogado");
  if (r.status === 403) throw new ErroGoogle("permissao");
  if (!r.ok) throw new ErroGoogle("falha", `${r.status} ${await r.text().catch(() => "")}`.slice(0, 300));
  if (r.status === 204) return {} as T;
  return (await r.json()) as T;
}

export type EventoGoogle = {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  visibility?: "default" | "public" | "private" | "confidential";
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string; responseStatus?: string; organizer?: boolean; self?: boolean }[];
  extendedProperties?: { private?: Record<string, string> };
};

/** Eventos do período (recorrentes já expandidos), incluindo os cancelados para sincronizar. */
export async function listarEventos(token: string, inicio: string, fim: string): Promise<EventoGoogle[]> {
  const eventos: EventoGoogle[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({
      timeMin: inicio,
      timeMax: fim,
      singleEvents: "true",
      showDeleted: "true",
      orderBy: "startTime",
      maxResults: "2500",
      timeZone: FUSO,
      ...(pagina ? { pageToken: pagina } : {}),
    });
    const r = await chamar<{ items?: EventoGoogle[]; nextPageToken?: string }>(token, `${API}?${q}`);
    eventos.push(...(r?.items ?? []));
    pagina = r?.nextPageToken;
  } while (pagina);
  return eventos;
}

export function obterEvento(token: string, id: string) {
  return chamar<EventoGoogle>(token, `${API}/${encodeURIComponent(id)}`);
}

export type DadosEvento = {
  idAtreides: string;
  titulo: string;
  descricao?: string | null;
  inicio: string;
  fim: string;
  participantes: string[];
  meet: boolean;
  local?: string | null;
};

function corpoEvento(d: DadosEvento) {
  return {
    summary: d.titulo,
    description: [d.descricao?.trim(), "Agendado pelo Atreides."].filter(Boolean).join("\n\n"),
    location: d.meet ? undefined : d.local || undefined,
    start: { dateTime: d.inicio, timeZone: FUSO },
    end: { dateTime: d.fim, timeZone: FUSO },
    attendees: d.participantes.map((email) => ({ email })),
    extendedProperties: { private: { atreidesId: d.idAtreides } },
  };
}

/** Cria o evento com a sala do Meet e envia o convite por e-mail aos participantes (pelo Google). */
export function criarEvento(token: string, d: DadosEvento) {
  const corpo = {
    ...corpoEvento(d),
    ...(d.meet ? { conferenceData: { createRequest: { requestId: d.idAtreides, conferenceSolutionKey: { type: "hangoutsMeet" } } } } : {}),
  };
  return chamar<EventoGoogle>(token, `${API}?conferenceDataVersion=1&sendUpdates=all`, { method: "POST", body: JSON.stringify(corpo) });
}

/** Atualiza o evento e avisa os participantes. Se passou a ser Meet e ainda não tem sala, cria. */
export function atualizarEvento(token: string, idGoogle: string, d: DadosEvento, criarSala: boolean) {
  const corpo = {
    ...corpoEvento(d),
    ...(criarSala ? { conferenceData: { createRequest: { requestId: `${d.idAtreides}-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } } } : {}),
    ...(!d.meet ? { conferenceData: null } : {}),
  };
  return chamar<EventoGoogle>(token, `${API}/${encodeURIComponent(idGoogle)}?conferenceDataVersion=1&sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify(corpo),
  });
}

/** Só muda o horário (arrastar na agenda). */
export function remarcarEvento(token: string, idGoogle: string, inicio: string, fim: string) {
  return chamar<EventoGoogle>(token, `${API}/${encodeURIComponent(idGoogle)}?sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({ start: { dateTime: inicio, timeZone: FUSO }, end: { dateTime: fim, timeZone: FUSO } }),
  });
}

/** Cancela o evento. `avisar = false` só para desfazer uma criação que falhou no Atreides. */
export function cancelarEvento(token: string, idGoogle: string, avisar = true) {
  return chamar<object>(token, `${API}/${encodeURIComponent(idGoogle)}?sendUpdates=${avisar ? "all" : "none"}`, { method: "DELETE" });
}
