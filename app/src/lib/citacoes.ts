/**
 * Banco de citações de Homero usado na tela de login e nos estados vazios.
 * Temas: bravura, nobreza, sabedoria, confiança e perseverança.
 *
 * Traduções próprias (PT e EN), a partir do original grego. A referência é
 * canto (algarismo romano) e verso(s). Ao acrescentar uma citação, conferir
 * livro e verso numa edição de referência.
 */

export type Obra = "iliada" | "odisseia";

export type Citacao = {
  id: string;
  obra: Obra;
  canto: string;
  versos: string;
  grego: string;
  pt: string;
  en: string;
};

export const CITACOES: Citacao[] = [
  // ── Ilíada ──────────────────────────────────────────────
  {
    id: "il-9-312",
    obra: "iliada",
    canto: "IX",
    versos: "312–313",
    grego: "ἐχθρὸς γάρ μοι κεῖνος ὁμῶς Ἀΐδαο πύλῃσιν",
    pt: "Odioso me é, como as portas do Hades, quem esconde uma coisa no peito e diz outra.",
    en: "Hateful to me as the gates of Hades is the man who hides one thing in his heart and says another.",
  },
  {
    id: "il-6-208",
    obra: "iliada",
    canto: "VI",
    versos: "208",
    grego: "αἰὲν ἀριστεύειν καὶ ὑπείροχον ἔμμεναι ἄλλων",
    pt: "Ser sempre o melhor e estar acima dos demais.",
    en: "Always to be the best and to excel above others.",
  },
  {
    id: "il-9-443",
    obra: "iliada",
    canto: "IX",
    versos: "443",
    grego: "μύθων τε ῥητῆρ᾽ ἔμεναι πρηκτῆρά τε ἔργων",
    pt: "Ser orador de palavras e realizador de feitos.",
    en: "To be a speaker of words and a doer of deeds.",
  },
  {
    id: "il-12-243",
    obra: "iliada",
    canto: "XII",
    versos: "243",
    grego: "εἷς οἰωνὸς ἄριστος, ἀμύνεσθαι περὶ πάτρης",
    pt: "Um só presságio é o melhor: lutar pela sua terra.",
    en: "One omen is best: to fight for one's own land.",
  },
  {
    id: "il-24-49",
    obra: "iliada",
    canto: "XXIV",
    versos: "49",
    grego: "τλητὸν γὰρ Μοῖραι θυμὸν θέσαν ἀνθρώποισιν",
    pt: "As Moiras deram aos homens um coração capaz de suportar.",
    en: "The Fates have given mankind an enduring heart.",
  },
  {
    id: "il-1-249",
    obra: "iliada",
    canto: "I",
    versos: "249",
    grego: "τοῦ καὶ ἀπὸ γλώσσης μέλιτος γλυκίων ῥέεν αὐδή",
    pt: "De sua língua fluía uma voz mais doce que o mel.",
    en: "From his tongue flowed speech sweeter than honey.",
  },
  {
    id: "il-17-32",
    obra: "iliada",
    canto: "XVII",
    versos: "32",
    grego: "ῥεχθὲν δέ τε νήπιος ἔγνω",
    pt: "Depois de feito, até o insensato compreende.",
    en: "Once a thing is done, even a fool understands it.",
  },
  {
    id: "il-6-146",
    obra: "iliada",
    canto: "VI",
    versos: "146",
    grego: "οἵη περ φύλλων γενεὴ τοίη δὲ καὶ ἀνδρῶν",
    pt: "Como a geração das folhas, assim é a dos homens.",
    en: "As is the generation of leaves, so is that of men.",
  },

  // ── Odisseia ────────────────────────────────────────────
  {
    id: "od-20-18",
    obra: "odisseia",
    canto: "XX",
    versos: "18",
    grego: "τέτλαθι δή, κραδίη· καὶ κύντερον ἄλλο ποτ᾽ ἔτλης",
    pt: "Aguenta, coração: já suportaste coisa pior.",
    en: "Endure, my heart: you have endured worse before.",
  },
  {
    id: "od-8-329",
    obra: "odisseia",
    canto: "VIII",
    versos: "329",
    grego: "οὐκ ἀρετᾷ κακὰ ἔργα· κιχάνει τοι βραδὺς ὠκύν",
    pt: "As más ações não prosperam: o lento alcança o veloz.",
    en: "Ill deeds do not prosper: the slow overtakes the swift.",
  },
  {
    id: "od-12-208",
    obra: "odisseia",
    canto: "XII",
    versos: "208",
    grego: "ὦ φίλοι, οὐ γάρ πώ τι κακῶν ἀδαήμονές εἰμεν",
    pt: "Amigos, não somos inexperientes diante das dificuldades.",
    en: "Friends, we are no strangers to hardship.",
  },
  {
    id: "od-1-34",
    obra: "odisseia",
    canto: "I",
    versos: "34",
    grego: "σφῇσιν ἀτασθαλίῃσιν ὑπὲρ μόρον ἄλγε᾽ ἔχουσιν",
    pt: "Por sua própria imprudência, os homens sofrem além do que lhes foi destinado.",
    en: "Through their own recklessness, men suffer beyond their destined share.",
  },
  {
    id: "od-6-182",
    obra: "odisseia",
    canto: "VI",
    versos: "182–184",
    grego: "ὁμοφρονέοντε νοήμασιν οἶκον ἔχητον",
    pt: "Nada é mais nobre do que quando dois governam a casa com um só pensamento.",
    en: "Nothing is nobler than when two keep a house with one mind.",
  },
  {
    id: "od-1-1",
    obra: "odisseia",
    canto: "I",
    versos: "1",
    grego: "ἄνδρα μοι ἔννεπε, Μοῦσα, πολύτροπον",
    pt: "Canta-me, Musa, o homem de muitos recursos.",
    en: "Tell me, Muse, of the man of many ways.",
  },
];

/** Sorteia uma citação, evitando repetir a última exibida (quando informada). */
export function sortearCitacao(evitarId?: string): Citacao {
  const opcoes = evitarId ? CITACOES.filter((c) => c.id !== evitarId) : CITACOES;
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

/** Citação do dia: muda uma vez por dia e é a mesma para toda a equipe. */
export function citacaoDoDia(data: Date = new Date()): Citacao {
  const dia = Math.floor(data.getTime() / 86_400_000);
  return CITACOES[dia % CITACOES.length];
}
