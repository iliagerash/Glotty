/**
 * A small Spanish conjugator for error injection (Workflow v2, step 4): the
 * preterite or imperfect indicative of a verb, by lemma, person and number.
 * It covers regular verbs, the common irregular preterites, -ir stem changes,
 * vowel stems (leer, construir) and 1sg spelling changes (-car, -gar, -zar).
 * Anything it is not sure of returns null, and the sentence is skipped: an
 * injected form must be a real form of the verb, only in the other aspect.
 */

export type Person = 1 | 2 | 3;
export type Num = "Sing" | "Plur";
const slot = (person: Person, num: Num) => (num === "Sing" ? person - 1 : person + 2);

const IMPERFECT_IRREGULAR: Record<string, string[]> = {
  ser: ["era", "eras", "era", "éramos", "erais", "eran"],
  ir: ["iba", "ibas", "iba", "íbamos", "ibais", "iban"],
  ver: ["veía", "veías", "veía", "veíamos", "veíais", "veían"],
};

const PRETERITE_IRREGULAR: Record<string, string[]> = {
  ser: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
  ir: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
  dar: ["di", "diste", "dio", "dimos", "disteis", "dieron"],
  ver: ["vi", "viste", "vio", "vimos", "visteis", "vieron"],
  hacer: ["hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"],
  reír: ["reí", "reíste", "rió", "reímos", "reísteis", "rieron"],
  sonreír: ["sonreí", "sonreíste", "sonrió", "sonreímos", "sonreísteis", "sonrieron"],
};

/** Strong (irregular-stem) preterites: stem + e, iste, o, imos, isteis, ieron (eron after j). */
const STRONG: Record<string, string> = {
  estar: "estuv", tener: "tuv", andar: "anduv", poder: "pud", poner: "pus", saber: "sup", caber: "cup",
  haber: "hub", querer: "quis", venir: "vin", decir: "dij", traer: "traj", conducir: "conduj", producir: "produj",
  traducir: "traduj", reducir: "reduj", introducir: "introduj", obtener: "obtuv", mantener: "mantuv", contener: "contuv",
  detener: "detuv", sostener: "sostuv", componer: "compus", proponer: "propus", suponer: "supus", disponer: "dispus",
  convenir: "convin", prevenir: "previn", deshacer: "deshic", rehacer: "rehic", satisfacer: "satisfic", predecir: "predij",
  contradecir: "contradij", atraer: "atraj", distraer: "distraj", retraer: "retraj",
};

/** -ir verbs whose stem vowel changes in the 3rd person preterite (pidió, durmió). */
const IR_STEM_CHANGE: Record<string, [string, string]> = {
  pedir: ["ped", "pid"], servir: ["serv", "sirv"], repetir: ["repet", "repit"], seguir: ["segu", "sigu"],
  conseguir: ["consegu", "consigu"], perseguir: ["persegu", "persigu"], sentir: ["sent", "sint"], mentir: ["ment", "mint"],
  preferir: ["prefer", "prefir"], divertir: ["divert", "divirt"], convertir: ["convert", "convirt"], vestir: ["vest", "vist"],
  medir: ["med", "mid"], competir: ["compet", "compit"], elegir: ["eleg", "elig"], corregir: ["correg", "corrig"],
  despedir: ["desped", "despid"], impedir: ["imped", "impid"], advertir: ["advert", "advirt"], sugerir: ["suger", "sugir"],
  herir: ["her", "hir"], hervir: ["herv", "hirv"], invertir: ["invert", "invirt"], arrepentir: ["arrepent", "arrepint"],
  dormir: ["dorm", "durm"], morir: ["mor", "mur"],
};

const stemOf = (lemma: string) => lemma.slice(0, -2);
const classOf = (lemma: string) => (lemma.endsWith("ar") ? "ar" : lemma.endsWith("er") || lemma.endsWith("ér") ? "er" : lemma.endsWith("ir") || lemma.endsWith("ír") ? "ir" : null);

export function imperfect(lemma: string, person: Person, num: Num): string | null {
  const l = lemma.toLowerCase();
  if (IMPERFECT_IRREGULAR[l]) return IMPERFECT_IRREGULAR[l][slot(person, num)];
  const cls = classOf(l);
  if (!cls || l.length < 3) return null;
  const stem = stemOf(l);
  const endings = cls === "ar" ? ["aba", "abas", "aba", "ábamos", "abais", "aban"] : ["ía", "ías", "ía", "íamos", "íais", "ían"];
  return stem + endings[slot(person, num)];
}

export function preterite(lemma: string, person: Person, num: Num): string | null {
  const l = lemma.toLowerCase();
  const i = slot(person, num);
  if (PRETERITE_IRREGULAR[l]) return PRETERITE_IRREGULAR[l][i];
  if (STRONG[l]) {
    const s = STRONG[l];
    const endings = ["e", "iste", "o", "imos", "isteis", s.endsWith("j") ? "eron" : "ieron"];
    return s + endings[i];
  }
  const cls = classOf(l);
  if (!cls || l.length < 3) return null;
  const stem = stemOf(l);
  if (cls === "ar") {
    // 1sg spelling changes keep the sound: busqué, llegué, empecé.
    const first = stem.endsWith("c") ? `${stem.slice(0, -1)}qu` : stem.endsWith("g") ? `${stem}u` : stem.endsWith("z") ? `${stem.slice(0, -1)}c` : stem;
    return [`${first}é`, `${stem}aste`, `${stem}ó`, `${stem}amos`, `${stem}asteis`, `${stem}aron`][i];
  }
  // -er/-ir. Vowel stems: leer -> leyó, leíste; construir -> construyó, construiste.
  const vowelStem = /[aeo]$/.test(stem);
  const uirStem = cls === "ir" && stem.endsWith("u") && !stem.endsWith("gu") && !stem.endsWith("qu");
  if (vowelStem) return [`${stem}í`, `${stem}íste`, `${stem}yó`, `${stem}ímos`, `${stem}ísteis`, `${stem}yeron`][i];
  if (uirStem) return [`${stem}í`, `${stem}iste`, `${stem}yó`, `${stem}imos`, `${stem}isteis`, `${stem}yeron`][i];
  const third = IR_STEM_CHANGE[l] ? IR_STEM_CHANGE[l][1] : stem;
  if (cls === "ir" && !IR_STEM_CHANGE[l] && /[eo][^aeiou]*$/.test(stem) && !SAFE_IR.has(l)) {
    // An -ir verb with e/o in its last stem syllable may stem-change (sentir -> sintió); unknown ones are skipped.
    return i === 2 || i === 5 ? null : [`${stem}í`, `${stem}iste`, null, `${stem}imos`, `${stem}isteis`, null][i];
  }
  return [`${stem}í`, `${stem}iste`, `${third}ió`, `${stem}imos`, `${stem}isteis`, `${third}ieron`][i];
}

/** Common -ir verbs with e/o in the stem that do not stem-change in the preterite. */
const SAFE_IR = new Set([
  "vivir", "escribir", "describir", "recibir", "decidir", "permitir", "existir", "insistir", "resistir", "asistir", "consistir",
  "abrir", "cubrir", "descubrir", "subir", "sufrir", "cumplir", "ocurrir", "recorrer", "compartir", "partir", "repartir",
  "dividir", "discutir", "admitir", "emitir", "omitir", "prohibir", "unir", "reunir", "imprimir", "deprimir", "oprimir",
  "salir", "aburrir", "confundir", "fundir", "interrumpir", "cumplir", "transmitir", "convivir", "sobrevivir", "coincidir",
]);

/** The same verb in the other aspect: preterite <-> imperfect. */
export function otherAspect(lemma: string, tense: "Past" | "Imp", person: Person, num: Num): string | null {
  return tense === "Past" ? imperfect(lemma, person, num) : preterite(lemma, person, num);
}
