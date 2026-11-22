"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { importarClientes, verificarCpfs, type LinhaImportacao, type ResultadoImportacao } from "@/lib/clientes/acoes";
import { cpfValido, formatarCPF, UFS } from "@/lib/clientes/regras";
import { formatarTelefone } from "@/lib/formatos";

type Linha = LinhaImportacao & { erros: string[] };

const MODELO = "nome;cpf;celular;email;cidade;uf;nascimento;inicio_contrato;aceite_lgpd\nMaria Silva;529.982.247-25;(11) 99999-0000;maria@email.com;São Paulo;SP;1985-04-12;2024-02-01;sim\n";

// Nomes de coluna aceitos (sem acento, minúsculos).
const COLUNAS: Record<string, keyof LinhaImportacao> = {
  nome: "full_name", name: "full_name", cliente: "full_name",
  cpf: "cpf",
  celular: "phone", telefone: "phone", whatsapp: "phone", phone: "phone",
  email: "email", "e-mail": "email",
  cidade: "city", city: "city",
  uf: "state", estado: "state", state: "state",
  nascimento: "birth_date", data_nascimento: "birth_date", birth_date: "birth_date",
  inicio_contrato: "contract_start_on", inicio: "contract_start_on", contract_start_on: "contract_start_on",
  aceite_lgpd: "aceite_lgpd", lgpd: "aceite_lgpd",
};

const semAcento = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** "12/04/1985" ou "1985-04-12" → "1985-04-12". */
function data(v: string): string {
  const s = v.trim();
  if (!s) return "";
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "invalida";
}

/** Lê CSV com ; ou , e aspas. */
function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, "");
  const primeira = limpo.split(/\r?\n/)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

/** Importação dos clientes migrados por planilha CSV, com prévia e erros linha a linha. */
export function Importar() {
  const t = useTranslations("clientes.importar");
  const arquivo = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [lendo, setLendo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const validas = (linhas ?? []).filter((l) => !l.erros.length);

  async function ler(f: File) {
    setErroArquivo(null);
    setResultado(null);
    setLendo(true);
    const tabela = lerCsv(await f.text());
    if (tabela.length < 2) {
      setLendo(false);
      setLinhas(null);
      return setErroArquivo("vazio");
    }
    const cab = tabela[0].map((c) => COLUNAS[semAcento(c)]);
    if (!cab.includes("full_name") || !cab.includes("cpf")) {
      setLendo(false);
      setLinhas(null);
      return setErroArquivo("colunas");
    }
    if (tabela.length - 1 > 500) {
      setLendo(false);
      setLinhas(null);
      return setErroArquivo("grande");
    }
    const vistas = new Set<string>();
    const lidas: Linha[] = tabela.slice(1).map((cols, i) => {
      const o: Record<string, string> = {};
      cab.forEach((k, j) => k && (o[k] = (cols[j] ?? "").trim()));
      const cpf = (o.cpf ?? "").replace(/\D/g, "");
      const phone = (o.phone ?? "").replace(/\D/g, "");
      const l: Linha = {
        linha: i + 2,
        full_name: o.full_name ?? "",
        cpf,
        phone,
        email: (o.email ?? "").toLowerCase(),
        city: o.city ?? "",
        state: (o.state ?? "").toUpperCase(),
        birth_date: data(o.birth_date ?? ""),
        contract_start_on: data(o.contract_start_on ?? ""),
        aceite_lgpd: ["sim", "s", "yes", "true", "1", "x"].includes(semAcento(o.aceite_lgpd ?? "")),
        erros: [],
      };
      if (l.full_name.length < 2) l.erros.push("nome");
      if (!cpfValido(cpf)) l.erros.push("cpf");
      else if (vistas.has(cpf)) l.erros.push("cpfRepetido");
      vistas.add(cpf);
      if (!/^\d{10,11}$/.test(phone)) l.erros.push("telefone");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email)) l.erros.push("email");
      if (l.state && !UFS.includes(l.state as (typeof UFS)[number])) l.erros.push("uf");
      if (l.birth_date === "invalida" || l.contract_start_on === "invalida") l.erros.push("data");
      return l;
    });
    const existentes = new Set(await verificarCpfs(lidas.filter((l) => cpfValido(l.cpf)).map((l) => l.cpf)));
    for (const l of lidas) if (existentes.has(l.cpf)) l.erros.push("jaCadastrado");
    setLinhas(lidas);
    setLendo(false);
  }

  function importar() {
    iniciar(async () => {
      const r = await importarClientes(
        validas.map(({ erros: _e, ...l }) => {
          void _e;
          return { ...l, birth_date: l.birth_date === "invalida" ? "" : l.birth_date, contract_start_on: l.contract_start_on === "invalida" ? "" : l.contract_start_on };
        }),
      );
      setResultado(r);
      if (r.ok) setLinhas(null);
    });
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([`﻿${MODELO}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("passo1")}</CardTitle>
            <CardDescription>{t("passo1Descricao")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={baixarModelo}>
            <Download />
            {t("baixarModelo")}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-texto-2">{t("colunas")}</p>
          <input
            ref={arquivo}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
              e.target.value = "";
            }}
          />
          <Button className="self-start" carregando={lendo} onClick={() => arquivo.current?.click()}>
            <FileUp />
            {t("escolher")}
          </Button>
          {erroArquivo ? <Alert tom="erro">{t(`errosArquivo.${erroArquivo}`)}</Alert> : null}
        </CardContent>
      </Card>

      {resultado ? (
        <Alert tom={resultado.falhas.length ? "atencao" : "ok"} titulo={t("concluido", { criados: resultado.criados })}>
          {resultado.falhas.length ? (
            <ul className="mt-1 list-disc pl-4">
              {resultado.falhas.map((f) => (
                <li key={f.linha}>{t("falhaLinha", { linha: f.linha, erro: t(`erros.${f.erro}`) })}</li>
              ))}
            </ul>
          ) : (
            <p>
              {t("concluidoTexto")}{" "}
              <Link href="/clientes" className="font-medium underline">
                {t("verClientes")}
              </Link>
            </p>
          )}
        </Alert>
      ) : null}

      {linhas ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>{t("passo2")}</CardTitle>
              <CardDescription>{t("resumo", { validas: validas.length, total: linhas.length })}</CardDescription>
            </div>
            <Button carregando={pendente} disabled={!validas.length} onClick={importar}>
              {t("importarValidas", { total: validas.length })}
            </Button>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH className="w-16">{t("linha")}</TH>
                <TH>{t("cliente")}</TH>
                <TH className="hidden md:table-cell">{t("contato")}</TH>
                <TH>{t("situacao")}</TH>
              </tr>
            </THead>
            <TBody>
              {linhas.map((l) => (
                <TR key={l.linha}>
                  <TD className="numero text-texto-3">{l.linha}</TD>
                  <TD>
                    <p className="font-medium">{l.full_name || "—"}</p>
                    <p className="numero text-xs text-texto-3">{l.cpf ? formatarCPF(l.cpf) : "—"}</p>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <p className="numero text-sm">{l.phone ? formatarTelefone(l.phone) : "—"}</p>
                    <p className="text-xs text-texto-3">{l.email}</p>
                  </TD>
                  <TD>
                    {l.erros.length ? (
                      <div className="flex flex-wrap gap-1">
                        {l.erros.map((e) => (
                          <Badge key={e} tom="erro">
                            <TriangleAlert className="size-3" aria-hidden="true" />
                            {t(`erros.${e}`)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge tom="ok">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        {t("pronta")}
                      </Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
