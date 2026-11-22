"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck, CalendarPlus, MoreHorizontal, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/overlay";
import { desconectarGoogle, remarcarReuniao } from "@/lib/agenda/acoes";
import type { EventoAgenda, Reuniao, SituacaoGoogle } from "@/lib/agenda/regras";
import { dataDoInstante, horaDoInstante } from "@/lib/formatos";
import type { Selecao } from "./calendario";
import { ConectarGoogle } from "./conectar-google";
import { DetalhesEvento } from "./detalhes-evento";
import { FormReuniao, type Inicial, type LeadVinculo } from "./form-reuniao";

const Calendario = dynamic(() => import("./calendario"), {
  ssr: false,
  loading: () => <Skeleton className="h-[740px] w-full rounded-card" />,
});

type Aviso = { tom: "ok" | "erro"; texto: string } | null;

/** Chave nova a cada abertura do formulário (reinicia o estado dele). */
let contador = 0;
const novaChave = () => ++contador;

type Props = {
  situacaoInicial: SituacaoGoogle | null;
  leads: LeadVinculo[];
  clientes?: LeadVinculo[];
  emailUsuario: string;
  /** Abrir "Nova reunião" ao entrar (ex.: vindo da ficha do lead ou do painel). */
  novaInicial?: Inicial | null;
  /** Resultado da conexão com o Google (?google=conectado|erro). */
  retornoGoogle?: "conectado" | "erro" | null;
};

/** Tela da Agenda (Documentação/07): situação do Google, calendário, agendamento e detalhes. */
export function Agenda({ situacaoInicial, leads, clientes = [], emailUsuario, novaInicial, retornoGoogle }: Props) {
  const t = useTranslations("agenda");
  const router = useRouter();
  const [situacao, setSituacao] = useState(situacaoInicial);
  const [falhaGoogle, setFalhaGoogle] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(
    retornoGoogle === "conectado" ? { tom: "ok", texto: t("google.conectadoSucesso") } : retornoGoogle === "erro" ? { tom: "erro", texto: t("google.erroConexao") } : null,
  );
  const [form, setForm] = useState<{ chave: number; reuniao: Reuniao | null; inicial?: Inicial } | null>(
    novaInicial ? { chave: novaChave(), reuniao: null, inicial: novaInicial } : null,
  );
  const [detalhe, setDetalhe] = useState<EventoAgenda | null>(null);
  const [desconectando, iniciarDesconexao] = useTransition();
  const recarga = useRef<() => void>(() => {});

  const conectado = situacao?.estado === "conectado";
  const dono = situacao?.dono ?? "";
  const proprio = situacao?.proprio ?? true;

  const registrarRecarga = useCallback((fn: () => void) => {
    recarga.current = fn;
  }, []);

  const aoCarregar = useCallback(({ situacao: s, falhaGoogle: f }: { situacao: SituacaoGoogle | null; falhaGoogle: boolean }) => {
    // Só troca o estado se a situação mudou de fato (evita renderizações à toa).
    if (s) setSituacao((anterior) => (JSON.stringify(anterior) === JSON.stringify(s) ? anterior : s));
    setFalhaGoogle(f);
  }, []);

  function abrirNova(inicial?: Inicial) {
    setForm({ chave: novaChave(), reuniao: null, inicial });
  }

  function aoSelecionar(s: Selecao) {
    const duracao = s.diaInteiro ? undefined : Math.max(15, Math.min(720, Math.round((s.fim.getTime() - s.inicio.getTime()) / 60_000)));
    abrirNova({
      data: dataDoInstante(s.inicio.toISOString()),
      hora: s.diaInteiro ? "09:00" : horaDoInstante(s.inicio),
      duracao: duracao === 30 && !s.diaInteiro ? 60 : duracao,
    });
  }

  function aoRemarcar(id: string, inicio: Date, fim: Date, desfazer: () => void) {
    if (!id.startsWith("atreides:")) return desfazer();
    void remarcarReuniao(id.slice("atreides:".length), inicio.toISOString(), fim.toISOString()).then((r) => {
      if (!r.ok) {
        desfazer();
        setAviso({ tom: "erro", texto: t(`erros.${r.mensagem ?? "salvar"}`) });
      } else {
        setAviso({ tom: "ok", texto: t("sucesso.remarcada") });
        recarga.current();
      }
    });
  }

  function limparUrl() {
    if (novaInicial || retornoGoogle) router.replace("/agenda");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        sobretitulo={t("sobretitulo")}
        titulo={t("titulo")}
        descricao={t("descricao")}
        acoes={
          <>
            {conectado && situacao?.estado === "conectado" ? (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary">
                    <CalendarCheck className="!text-ok" />
                    <span className="max-w-48 truncate">{proprio ? situacao.email ?? "Google" : t("google.agendaDe", { nome: dono })}</span>
                    {proprio ? <MoreHorizontal className="!text-texto-3" /> : null}
                  </Button>
                </MenuTrigger>
                {proprio ? (
                  <MenuContent align="end" className="w-72">
                    <MenuLabel className="normal-case tracking-normal">{t("google.conectadoComo", { email: situacao.email ?? "" })}</MenuLabel>
                    <MenuItem
                      disabled={desconectando}
                      onSelect={() =>
                        iniciarDesconexao(async () => {
                          if (!window.confirm(`${t("google.desconectarTitulo")}\n\n${t("google.desconectarTexto")}`)) return;
                          const r = await desconectarGoogle();
                          if (r.ok) {
                            setSituacao((s) => (s ? { estado: "desconectado", dono: s.dono, proprio: s.proprio } : s));
                            recarga.current();
                          }
                        })
                      }
                    >
                      <Unplug />
                      {t("google.desconectar")}
                    </MenuItem>
                  </MenuContent>
                ) : null}
              </Menu>
            ) : null}
            <Button onClick={() => abrirNova()} disabled={!conectado}>
              <CalendarPlus />
              {t("novaReuniao")}
            </Button>
          </>
        }
      />

      {aviso ? (
        <Alert tom={aviso.tom}>
          <div className="flex items-start justify-between gap-4">
            <span>{aviso.texto}</span>
            <button type="button" className="text-xs font-medium underline-offset-4 hover:underline" onClick={() => setAviso(null)}>
              OK
            </button>
          </div>
        </Alert>
      ) : null}

      <AvisoConexao situacao={situacao} emailUsuario={emailUsuario} />
      {falhaGoogle && conectado ? <Alert tom="atencao">{t("google.falhaLeitura")}</Alert> : null}

      <Calendario
        podeAgendar={conectado}
        aoSelecionar={aoSelecionar}
        aoClicar={setDetalhe}
        aoRemarcar={aoRemarcar}
        aoCarregar={aoCarregar}
        registrarRecarga={registrarRecarga}
      />

      <Legenda />

      {form ? (
        <FormReuniao
          key={form.chave}
          aberto
          aoMudar={(v) => {
            if (!v) {
              setForm(null);
              limparUrl();
            }
          }}
          reuniao={form.reuniao}
          inicial={form.inicial}
          leads={leads}
          clientes={clientes}
          dono={dono}
          aoSalvar={(_, tipo) => {
            setAviso({ tom: "ok", texto: t(`sucesso.${tipo}`) });
            recarga.current();
            router.refresh();
          }}
        />
      ) : null}

      <DetalhesEvento
        evento={detalhe}
        podeEditar={conectado}
        aoFechar={() => setDetalhe(null)}
        aoEditar={(e) => {
          setDetalhe(null);
          if (e.extendedProps.origem === "atreides") setForm({ chave: novaChave(), reuniao: e.extendedProps.reuniao });
        }}
        aoCancelada={() => {
          setAviso({ tom: "ok", texto: t("sucesso.cancelada") });
          recarga.current();
          router.refresh();
        }}
      />
    </div>
  );
}

/** Explica por que não dá para agendar e oferece o próximo passo. */
function AvisoConexao({ situacao, emailUsuario }: { situacao: SituacaoGoogle | null; emailUsuario: string }) {
  const t = useTranslations("agenda.google");
  if (!situacao || situacao.estado === "conectado") return null;
  const { dono, proprio } = situacao;

  if (situacao.estado === "configuracao") {
    return <Alert tom="atencao" titulo={t("tituloConfiguracao")}>{t("textoConfiguracao")}</Alert>;
  }
  if (situacao.estado === "revogado") {
    return proprio ? (
      <Alert tom="erro" titulo={t("tituloRevogado")}>
        <p>{t("textoRevogado")}</p>
        <div className="mt-3">
          <ConectarGoogle email={emailUsuario} rotulo={t("reconectar")} />
        </div>
      </Alert>
    ) : (
      <Alert tom="atencao" titulo={t("tituloRevogado")}>{t("textoRevogadoColega", { nome: dono })}</Alert>
    );
  }
  return proprio ? (
    <Alert tom="info" titulo={t("tituloDesconectado")}>
      <p>{t("textoDesconectado")}</p>
      <div className="mt-3">
        <ConectarGoogle email={emailUsuario} />
      </div>
    </Alert>
  ) : (
    <Alert tom="atencao" titulo={t("tituloColega", { nome: dono })}>{t("textoColega", { nome: dono })}</Alert>
  );
}

function Legenda() {
  const t = useTranslations("agenda");
  const itens = [
    { rotulo: t("legendaAtreides"), cor: "bg-marinho border-latao" },
    { rotulo: t("legendaGoogle"), cor: "bg-info-fundo border-[#c4d6ec]" },
    { rotulo: t("legendaOcupado"), cor: "bg-divisoria border-borda" },
  ];
  return (
    <ul aria-label={t("legenda")} className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-texto-3">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-2">
          <span className={`size-3 rounded-[3px] border ${i.cor}`} aria-hidden="true" />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}
