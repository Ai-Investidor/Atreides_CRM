import path from "node:path";
import { Font, G, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

/**
 * Identidade da Atreides nos PDFs (identidade/design-guide.md): fontes, cores, símbolo,
 * meandro, cabeçalho e rodapé. Base do modelo único de PDF (modelo.tsx, Documentação/12 seção 7.1).
 */

/** Margem lateral do miolo (pt). */
export const MARGEM = 56;

export const DIR = path.join(process.cwd(), "assets", "pdf");
let fontesProntas = false;
export function registrarFontes() {
  if (fontesProntas) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(DIR, "inter-latin-500-normal.woff"), fontWeight: 500 },
      { src: path.join(DIR, "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Schibsted",
    fonts: [
      { src: path.join(DIR, "schibsted-grotesk-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(DIR, "schibsted-grotesk-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontesProntas = true;
}

export const COR = {
  marinho: "#0E1A2B",
  marinho2: "#16263B",
  latao: "#B8925A",
  lataoEscuro: "#8A6A3A",
  osso: "#F3EFE6",
  fundo: "#FBFAF7",
  borda: "#E6E1D6",
  divisoria: "#EFEBE3",
  texto: "#0E1A2B",
  texto2: "#4A5566",
  texto3: "#6B7584",
  ok: "#1F5A3E",
  erro: "#8A2E22",
  atencao: "#6B4E1E",
};

const sm = StyleSheet.create({
  cabecalho: { position: "absolute", top: 24, left: MARGEM, right: MARGEM, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.6, borderBottomColor: COR.borda, paddingBottom: 8 },
  // Não definir lineHeight na Page: o react-pdf deixa de desenhar este rodapé (dinâmico).
  rodape: { position: "absolute", bottom: 24, left: MARGEM, right: MARGEM, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COR.texto3 },
});

/** Símbolo "pedra angular" (identidade/simbolo.svg), viewBox 120. */
export function Simbolo({ tamanho, cor, pedra }: { tamanho: number; cor: string; pedra: string }) {
  const p = [
    "M36,12 L47,12 L53,37 A13,13 0 0,0 47,48 L47,59 L22.9,59 Z",
    "M84,12 L73,12 L67,37 A13,13 0 0,1 73,48 L73,59 L97.1,59 Z",
    "M19,61 H50 V66 H19 Z",
    "M70,61 H101 V66 H70 Z",
    "M20.4,68 L46,68 L40,98 L12,98 Z",
    "M99.6,68 L74,68 L80,98 L108,98 Z",
    "M8,100 H46 V106 H8 Z",
    "M74,100 H112 V106 H74 Z",
  ];
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
      <G fill={cor}>
        {p.map((d) => (
          <Path key={d} d={d} fill={cor} />
        ))}
      </G>
      <Path d="M50,12 L70,12 L64,34 L56,34 Z" fill={pedra} />
    </Svg>
  );
}

/** Faixa de meandro grego (identidade/meandro.svg), módulo 24×14. */
export function Meandro({ largura, cor }: { largura: number; cor: string }) {
  const n = Math.floor(largura / 24);
  return (
    <Svg width={n * 24} height={14} viewBox={`0 0 ${n * 24} 14`}>
      <Path d={`M0,13 H${n * 24} M0,1 H${n * 24}`} stroke={cor} strokeWidth={1.6} fill="none" />
      {Array.from({ length: n }, (_, i) => (
        <Path key={i} d={`M${i * 24 + 3},13 V4 H${i * 24 + 15} V10 H${i * 24 + 8} V7 H${i * 24 + 11}`} stroke={cor} strokeWidth={1.6} fill="none" />
      ))}
    </Svg>
  );
}

export function Cabecalho({ texto }: { texto: string }) {
  return (
    <View style={sm.cabecalho} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Simbolo tamanho={14} cor={COR.marinho} pedra={COR.latao} />
        <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 8.5, letterSpacing: 2 }}>ATREIDES</Text>
      </View>
      <Text style={{ fontSize: 7.5, color: COR.texto3 }}>{texto}</Text>
    </View>
  );
}

export function Rodape({ texto, pagina }: { texto: string; pagina: (atual: number, total: number) => string }) {
  return (
    <View style={sm.rodape} fixed>
      <Text>{texto}</Text>
      <Text render={({ pageNumber, totalPages }) => pagina(pageNumber - 1, totalPages - 1)} />
    </View>
  );
}

