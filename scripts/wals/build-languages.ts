/**
 * Builds `scripts/wals/languages.json`: every language of the World Atlas of
 * Language Structures (WALS) mapped onto the Langdle feature catalogue, all of
 * them inactive so an administrator reviews each one before it is playable.
 *
 *   node scripts/wals/build-languages.ts           (downloads into .cache/)
 *   node scripts/wals/build-languages.ts --offline (only the cached sources)
 *
 * Sources, in order of authority:
 *
 * - WALS (CLDF export) — the typology: word order, morphosyntax and the
 *   phonology chapters. Several WALS entries sharing an ISO 639-3 code (the
 *   Swiss German dialects, the four North Levantine Arabic entries) are merged,
 *   the entry with the most datapoints winning every conflict. Varieties WALS
 *   keeps apart under their own ISO code (Egyptian, Moroccan, Gulf Arabic…)
 *   stay separate languages.
 * - PHOIBLE — phoneme inventories, only for the phonology WALS has no chapter
 *   on (retroflex, aspirated, palatalized… consonants) or no datapoint for.
 * - CLDR, then Wikidata — the writing system, which WALS does not cover.
 * - Wikidata and ISO 639-3 — the endonym, the English name and the Spanish and
 *   Portuguese names, which only go to `searchParams`.
 *
 * A feature none of them speaks about is stored absent (the catalogue has no
 * "unknown"), and listed in the entry's `meta.unknown` for the reviewer.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

type Status = 'present' | 'partial' | 'absent';
type Feature = string;

const ROOT = join(import.meta.dirname, '..', '..');
const CACHE = join(import.meta.dirname, '.cache');
const OUTPUT = join(import.meta.dirname, 'languages.json');
const OFFLINE = process.argv.includes('--offline');

const WALS_COMMIT = '81298aa26d01fdc11b769bcc7fa87ad9e43d7ccd';
const PHOIBLE_COMMIT = '5c477f1934f57b3c1a16168fadc08e83dbc03362';
const CLDR_TAG = '49.0.0';
const DSPL_COMMIT = 'db79dad685276dbf98ca44b875d1481bc240c5c1';

const WALS = `https://raw.githubusercontent.com/cldf-datasets/wals/${WALS_COMMIT}/cldf`;
const PHOIBLE = `https://raw.githubusercontent.com/cldf-datasets/phoible/${PHOIBLE_COMMIT}/cldf`;
const CLDR = `https://raw.githubusercontent.com/unicode-org/cldr-json/${CLDR_TAG}/cldr-json/cldr-core/supplemental`;
const SIL = 'https://iso639-3.sil.org/sites/iso639-3/files/downloads';

const SOURCES = {
  'wals-languages.csv': `${WALS}/languages.csv`,
  'wals-values.csv': `${WALS}/values.csv`,
  'phoible-languages.csv': `${PHOIBLE}/languages.csv`,
  'phoible-parameters.csv': `${PHOIBLE}/parameters.csv`,
  'phoible-values.csv': `${PHOIBLE}/values.csv`,
  'cldr-language-data.json': `${CLDR}/languageData.json`,
  'cldr-territory-info.json': `${CLDR}/territoryInfo.json`,
  // Google's canonical country list: the centre point of every country.
  'countries.csv': `https://raw.githubusercontent.com/google/dspl/${DSPL_COMMIT}/samples/google/canonical/countries.csv`,
  'iso-639-3.tab': `${SIL}/iso-639-3.tab`,
  'iso-639-3-macrolanguages.tab': `${SIL}/iso-639-3-macrolanguages.tab`,
  'iso-639-3-retirements.tab': `${SIL}/iso-639-3_Retirements.tab`,
} as const;

/** Names and writing systems of every language item with an ISO 639-3 code. */
const WIKIDATA_QUERY = `
SELECT ?iso ?enLabel ?esLabel ?ptLabel ?selfLabel
  (GROUP_CONCAT(DISTINCT CONCAT(STR(?native), "@", LANG(?native)); separator="||") AS ?natives)
  (GROUP_CONCAT(DISTINCT ?wsLabel; separator="||") AS ?ws)
WHERE {
  ?item wdt:P220 ?iso .
  OPTIONAL { ?item wdt:P218 ?iso1 . }
  OPTIONAL { ?item wdt:P1705 ?native . }
  OPTIONAL { ?item rdfs:label ?selfLabel FILTER(LANG(?selfLabel) = COALESCE(?iso1, ?iso)) }
  OPTIONAL { ?item rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en") }
  OPTIONAL { ?item rdfs:label ?esLabel FILTER(LANG(?esLabel) = "es") }
  OPTIONAL { ?item rdfs:label ?ptLabel FILTER(LANG(?ptLabel) = "pt") }
  OPTIONAL { ?item wdt:P282 ?wsItem . ?wsItem rdfs:label ?wsLabel FILTER(LANG(?wsLabel) = "en") }
}
GROUP BY ?iso ?enLabel ?esLabel ?ptLabel ?selfLabel`;

/* -------------------------------------------------------------------------- */
/*                                  Downloads                                 */
/* -------------------------------------------------------------------------- */

async function cached(name: string, url: string, init?: RequestInit) {
  const path = join(CACHE, name);

  if (existsSync(path)) {
    return readFileSync(path, 'utf8');
  }

  if (OFFLINE) {
    throw new Error(`${name} is not cached; run without --offline first`);
  }

  console.log(`downloading ${name}`);
  const res = await fetch(url, init);

  if (!res.ok) {
    throw new Error(`${url} answered ${res.status}`);
  }

  const text = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, text);

  return text;
}

function source(name: keyof typeof SOURCES) {
  return cached(name, SOURCES[name]);
}

function wikidata() {
  const url = new URL('https://query.wikidata.org/sparql');
  url.searchParams.set('query', WIKIDATA_QUERY);

  return cached('wikidata.csv', url.toString(), {
    headers: {
      Accept: 'text/csv',
      'User-Agent': 'wals-language-import/1.0 (offline data build)',
    },
  });
}

/** RFC 4180: quoted fields may hold commas, quotes ("") and newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return toRecords(rows);
}

function parseTsv(text: string) {
  return toRecords(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => line.split('\t')),
  );
}

function toRecords([header, ...rows]: string[][]) {
  return rows.map(cells =>
    Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ''])),
  );
}

/* -------------------------------------------------------------------------- */
/*                               ISO 639 codes                                */
/* -------------------------------------------------------------------------- */

/**
 * The individual language that a macrolanguage's ISO 639-1 code means in the
 * catalogue: `zh` is Mandarin, `ar` Modern Standard Arabic, `fa` Iranian
 * Persian, the way the existing languages were keyed. Every other variety keeps
 * its own ISO 639-3 code.
 */
const STANDARD_VARIETY: Record<string, string> = {
  arb: 'ar',
  azj: 'az',
  cmn: 'zh',
  ekk: 'et',
  khk: 'mn',
  lvs: 'lv',
  npi: 'ne',
  pes: 'fa',
  plt: 'mg',
  swh: 'sw',
  uzn: 'uz',
  zsm: 'ms',
};

/** English names the sources get wrong for the catalogue's purpose. */
const ENGLISH_NAME: Record<string, string> = {
  acy: 'Cypriot Maronite Arabic',
  apc: 'Levantine Arabic',
  shu: 'Chadian Arabic',
  swh: 'Swahili',
};

/**
 * Endonyms for the varieties whose Wikidata native label is a description
 * ("the Emirati dialect" for all of Gulf Arabic) rather than the name their
 * speakers use.
 */
const ENDONYM: Record<string, string> = {
  acm: 'عراقي',
  acy: 'Sanna',
  aeb: 'تونسي',
  afb: 'خليجي',
  apc: 'شامي',
  ary: 'الدارجة',
  arz: 'مصري',
  ayl: 'ليبي',
  ayn: 'صنعاني',
};

/** Writing systems the macrolanguage fallback gets wrong. */
const SCRIPTS: Record<string, string[]> = {
  // Cypriot Maronite Arabic is written in Latin (and Greek) letters.
  acy: ['Latn'],
};

/**
 * Languages the catalogue already has under another, broader entry: `hi` is
 * Hindustani (Hindi and Urdu), `sh` is Serbo-Croatian.
 */
const COVERED_BY: Record<string, string> = {
  bos: 'sh',
  cnr: 'sh',
  hbs: 'sh',
  hrv: 'sh',
  srp: 'sh',
  urd: 'hi',
};

type IsoTables = {
  part1: Map<string, string>;
  part3: Map<string, string>;
  refName: Map<string, string>;
  type: Map<string, string>;
  macro: Map<string, string>;
  retired: Map<string, string>;
};

function buildIsoTables(codes: string, macros: string, retirements: string) {
  const tables: IsoTables = {
    part1: new Map(),
    part3: new Map(),
    refName: new Map(),
    type: new Map(),
    macro: new Map(),
    retired: new Map(),
  };

  for (const row of parseTsv(codes)) {
    tables.refName.set(row.Id, row.Ref_Name);
    tables.type.set(row.Id, row.Language_Type);

    if (row.Part1) {
      tables.part1.set(row.Id, row.Part1);
      tables.part3.set(row.Part1, row.Id);
    }
  }

  for (const row of parseTsv(macros)) {
    if (row.I_Status === 'A') tables.macro.set(row.I_Id, row.M_Id);
  }

  for (const row of parseTsv(retirements)) {
    if (row.Change_To) tables.retired.set(row.Id, row.Change_To);
  }

  return tables;
}

/** The current ISO 639-3 code, following retirements (`fri` → `fry`). */
function currentIso(iso: string, tables: IsoTables) {
  let code = iso;

  for (let hops = 0; tables.retired.has(code) && hops < 5; hops++) {
    code = tables.retired.get(code) as string;
  }

  return tables.refName.has(code) ? code : undefined;
}

/** The catalogue key: ISO 639-1 when the language has one, ISO 639-3 if not. */
function catalogueId(iso: string, tables: IsoTables) {
  return STANDARD_VARIETY[iso] ?? tables.part1.get(iso) ?? iso;
}

/* -------------------------------------------------------------------------- */
/*                                    WALS                                    */
/* -------------------------------------------------------------------------- */

type WalsLanguage = {
  id: string;
  name: string;
  iso: string;
  glottocode: string;
  location?: { lat: number; lng: number };
  family?: string;
  genus?: string;
  values: Map<string, number>;
};

/** One catalogue language: the WALS entries behind it, best covered first. */
type Group = { iso: string; entries: WalsLanguage[] };

function walsValue(group: Group, parameter: string) {
  for (const entry of group.entries) {
    const value = entry.values.get(parameter);
    if (value !== undefined) return value;
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/*                                   PHOIBLE                                  */
/* -------------------------------------------------------------------------- */

type Phonology = {
  inventories: number;
  consonants: number;
  vowels: number;
  has: Record<SegmentTrait, boolean>;
};

const SEGMENT_TRAITS = {
  clicks: /[ʘǀǁǃǂ]/,
  ejectives: /ʼ/,
  implosives: /[ɓɗʄɠʛᶑ]/,
  retroflex: /[ʈɖɳɽʂʐɻɭᶑꞎ]/,
  aspirated: /ʰ/,
  palatalized: /ʲ/,
  labialized: /ʷ/,
  pharyngealized: /ˤ/,
  creaky: /\u0330/,
  lateralFricatives: /[ɬɮꞎ]/,
  // No uvular nasal: WALS 6A counts stops and continuants, and PHOIBLE writes
  // Japanese moraic /N/ as [ɴ].
  uvulars: /[qɢχʁʀ]/,
  frontRounded: /[yøœʏɶ]/,
  nasalVowels: /\u0303/,
} as const;

type SegmentTrait = keyof typeof SEGMENT_TRAITS;

/** Only consonants count for these, a creaky or nasal vowel is a vowel. */
const CONSONANT_TRAITS = new Set<SegmentTrait>([
  'clicks',
  'ejectives',
  'implosives',
  'retroflex',
  'aspirated',
  'palatalized',
  'labialized',
  'pharyngealized',
  'lateralFricatives',
  'uvulars',
]);

/** Only vowels count for these. */
const VOWEL_TRAITS = new Set<SegmentTrait>(['nasalVowels', 'frontRounded']);

/**
 * Length, nasality, phonation and tone do not make a new vowel quality, which
 * is what WALS 2A (and so the vowel inventory features) counts.
 */
const NON_QUALITY_MARKS = new RegExp(
  [
    '\u02D0|\u02D1', // length
    '\u0303', // nasal
    '\u0330|\u0324|\u0325', // creaky, breathy, voiceless
    '\u032F|\u0306', // non-syllabic, extra short
    '[\u0300-\u0302\u0304\u030B\u030C\u030F\u02E5-\u02E9]', // tone
    '\u02E4|\u02B0|\u02B2|\u02B7', // pharyngealized, aspirated, palatalized, labialized
  ].join('|'),
  'g',
);

function vowelQuality(segment: string) {
  const quality = segment.normalize('NFD').replace(NON_QUALITY_MARKS, '');
  const letters = quality.replace(/[\p{Mn}\p{Lm}]/gu, '');

  // Diphthongs (two vowel letters) are not qualities of their own.
  return [...letters].length === 1 ? quality : undefined;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function buildPhonology(
  languages: Record<string, string>[],
  parameters: Record<string, string>[],
  values: Record<string, string>[],
) {
  const isoOf = new Map(languages.map(l => [l.ID, l.ISO639P3code]));
  const classOf = new Map(parameters.map(p => [p.ID, p.SegmentClass]));
  const inventories = new Map<string, { iso: string; segments: string[][] }>();

  for (const value of values) {
    if (value.Marginal === 'true') continue;

    const iso = isoOf.get(value.Language_ID);
    if (!iso) continue;

    const inventory = inventories.get(value.Inventory_ID) ?? {
      iso,
      segments: [],
    };
    inventory.segments.push([
      value.Value.normalize('NFD'),
      classOf.get(value.Parameter_ID) ?? '',
    ]);
    inventories.set(value.Inventory_ID, inventory);
  }

  const byIso = new Map<string, Array<{ segments: string[][] }>>();

  for (const inventory of inventories.values()) {
    byIso.set(inventory.iso, [...(byIso.get(inventory.iso) ?? []), inventory]);
  }

  const phonology = new Map<string, Phonology>();

  for (const [iso, list] of byIso) {
    const traitVotes = Object.fromEntries(
      Object.keys(SEGMENT_TRAITS).map(trait => [trait, 0]),
    ) as Record<SegmentTrait, number>;
    const consonantCounts: number[] = [];
    const vowelCounts: number[] = [];

    for (const { segments } of list) {
      const consonants = segments.filter(([, kind]) => kind === 'consonant');
      const vowels = segments.filter(([, kind]) => kind === 'vowel');

      consonantCounts.push(consonants.length);
      vowelCounts.push(
        new Set(
          vowels.map(([segment]) => vowelQuality(segment)).filter(Boolean),
        ).size,
      );

      for (const trait of Object.keys(SEGMENT_TRAITS) as SegmentTrait[]) {
        const pool = CONSONANT_TRAITS.has(trait)
          ? consonants
          : VOWEL_TRAITS.has(trait)
            ? vowels
            : segments;

        if (pool.some(([segment]) => SEGMENT_TRAITS[trait].test(segment))) {
          traitVotes[trait]++;
        }
      }
    }

    // A trait counts when at least half of the inventories describe it.
    phonology.set(iso, {
      inventories: list.length,
      consonants: median(consonantCounts),
      vowels: median(vowelCounts),
      has: Object.fromEntries(
        Object.entries(traitVotes).map(([trait, votes]) => [
          trait,
          votes * 2 >= list.length,
        ]),
      ) as Record<SegmentTrait, boolean>,
    });
  }

  return phonology;
}

/* -------------------------------------------------------------------------- */
/*                               Writing systems                              */
/* -------------------------------------------------------------------------- */

/** ISO 15924 codes, by the writing system feature they stand for. */
const SCRIPT_KIND: Record<string, Feature[]> = {
  Latn: ['alphabet', 'latinAlphabet'],
  Cyrl: ['alphabet', 'cyrillicAlphabet'],
  ...Object.fromEntries(
    [
      'Adlm',
      'Armn',
      'Bass',
      'Copt',
      'Geor',
      'Goth',
      'Grek',
      'Hang',
      'Kore',
      'Lisu',
      'Mong',
      'Nkoo',
      'Olck',
      'Osge',
      'Rohg',
      'Tfng',
      'Wcho',
      'Yezi',
    ].map(code => [code, ['alphabet']]),
  ),
  ...Object.fromEntries(
    ['Arab', 'Hebr', 'Mand', 'Samr', 'Syrc'].map(code => [code, ['abjad']]),
  ),
  ...Object.fromEntries(
    [
      'Bali',
      'Batk',
      'Beng',
      'Bugi',
      'Buhd',
      'Cakm',
      'Cans',
      'Cham',
      'Deva',
      'Ethi',
      'Gong',
      'Gonm',
      'Gujr',
      'Guru',
      'Hano',
      'Java',
      'Kali',
      'Khmr',
      'Knda',
      'Lana',
      'Laoo',
      'Lepc',
      'Limb',
      'Mlym',
      'Mtei',
      'Mymr',
      'Newa',
      'Orya',
      'Plrd',
      'Rjng',
      'Saur',
      'Sinh',
      'Sund',
      'Sylo',
      'Tagb',
      'Tale',
      'Talu',
      'Taml',
      'Tavt',
      'Telu',
      'Tglg',
      'Thaa',
      'Thai',
      'Tibt',
      'Tirh',
    ].map(code => [code, ['abugida']]),
  ),
  Hani: ['logographic'],
  Hans: ['logographic'],
  Hant: ['logographic'],
  Jpan: ['logographic', 'syllabary'],
  Hira: ['syllabary'],
  Kana: ['syllabary'],
  Hrkt: ['syllabary'],
  Bamu: ['syllabary'],
  Cher: ['syllabary'],
  Hmng: ['syllabary'],
  Hmnp: ['syllabary'],
  Vaii: ['syllabary'],
  Yiii: ['syllabary'],
};

/**
 * Wikidata names writing systems in prose ("Latin script", "Gurmukhi"); the
 * first pattern that matches gives the script.
 */
const WIKIDATA_SCRIPTS: Array<[RegExp, string]> = [
  [/braille|sign ?writing|alphabet for sign/i, 'skip'],
  [/latin|pinyin|romaniz|romanis|\bIPA\b/i, 'Latn'],
  [/cyrillic/i, 'Cyrl'],
  [/arabic|jawi|ajami|shahmukhi|persian alphabet|urdu|pegon|sorabe/i, 'Arab'],
  [/hebrew/i, 'Hebr'],
  [/syriac/i, 'Syrc'],
  [/mandaic/i, 'Mand'],
  [/samaritan/i, 'Samr'],
  [/devanagari|nagari/i, 'Deva'],
  [/bengali|assamese/i, 'Beng'],
  [/gurmukhi/i, 'Guru'],
  [/gujarati/i, 'Gujr'],
  [/odia|oriya/i, 'Orya'],
  [/tamil/i, 'Taml'],
  [/telugu/i, 'Telu'],
  [/kannada/i, 'Knda'],
  [/malayalam/i, 'Mlym'],
  [/sinhala/i, 'Sinh'],
  [/thai/i, 'Thai'],
  [/\blao\b/i, 'Laoo'],
  [/khmer/i, 'Khmr'],
  [/burmese|myanmar|mon script|shan script/i, 'Mymr'],
  [/tibetan/i, 'Tibt'],
  [/ge.?ez|ethiopic|amharic/i, 'Ethi'],
  [/balinese/i, 'Bali'],
  [/javanese/i, 'Java'],
  [/sundanese/i, 'Sund'],
  [/lontara|bugis/i, 'Bugi'],
  [/batak/i, 'Batk'],
  [/baybayin|tagalog script/i, 'Tglg'],
  [/meitei|meetei/i, 'Mtei'],
  [/ol chiki/i, 'Olck'],
  [/thaana/i, 'Thaa'],
  [/syllabics/i, 'Cans'],
  [/chakma/i, 'Cakm'],
  [/lepcha/i, 'Lepc'],
  [/limbu/i, 'Limb'],
  [/tai tham|lanna/i, 'Lana'],
  [/tai viet/i, 'Tavt'],
  [/tai le\b/i, 'Tale'],
  [/new tai lue/i, 'Talu'],
  [/\bcham\b/i, 'Cham'],
  [/kayah li/i, 'Kali'],
  [/pollard|miao/i, 'Plrd'],
  [/hangul|korean/i, 'Hang'],
  [/kana|hiragana|katakana/i, 'Kana'],
  [
    /chinese character|han character|hanzi|kanji|sawndip|ch[ữu] n[ôo]m/i,
    'Hani',
  ],
  [/greek/i, 'Grek'],
  [/armenian/i, 'Armn'],
  [/georgian|mkhedruli/i, 'Geor'],
  [/mongolian script|mongolian alphabet|clear script/i, 'Mong'],
  [/tifinagh/i, 'Tfng'],
  [/n.?ko\b/i, 'Nkoo'],
  [/adlam/i, 'Adlm'],
  [/osage/i, 'Osge'],
  [/coptic/i, 'Copt'],
  [/cherokee/i, 'Cher'],
  [/vai syllabary|vai script/i, 'Vaii'],
  [/\byi script|nuosu/i, 'Yiii'],
  [/bamum/i, 'Bamu'],
  [/pahawh/i, 'Hmng'],
  [/fraser|lisu/i, 'Lisu'],
];

/** ISO 15924 codes by the Unicode script their letters belong to. */
const UNICODE_SCRIPT: Record<string, string[]> = {
  Arabic: ['Arab'],
  Armenian: ['Armn'],
  Bengali: ['Beng'],
  Canadian_Aboriginal: ['Cans'],
  Cherokee: ['Cher'],
  Cyrillic: ['Cyrl'],
  Devanagari: ['Deva'],
  Ethiopic: ['Ethi'],
  Georgian: ['Geor'],
  Greek: ['Grek'],
  Gujarati: ['Gujr'],
  Gurmukhi: ['Guru'],
  Han: ['Hani', 'Hans', 'Hant', 'Jpan', 'Kore'],
  Hangul: ['Hang', 'Kore'],
  Hebrew: ['Hebr'],
  Hiragana: ['Jpan', 'Hira', 'Hrkt'],
  Kannada: ['Knda'],
  Katakana: ['Jpan', 'Kana', 'Hrkt'],
  Khmer: ['Khmr'],
  Lao: ['Laoo'],
  Latin: ['Latn'],
  Malayalam: ['Mlym'],
  Mongolian: ['Mong'],
  Myanmar: ['Mymr'],
  Nko: ['Nkoo'],
  Oriya: ['Orya'],
  Sinhala: ['Sinh'],
  Syriac: ['Syrc'],
  Tamil: ['Taml'],
  Telugu: ['Telu'],
  Thaana: ['Thaa'],
  Thai: ['Thai'],
  Tibetan: ['Tibt'],
  Tifinagh: ['Tfng'],
};

/** The ISO 15924 codes a text may be written in, from its first letter. */
function scriptsOfText(text: string) {
  const letter = text.match(/\p{L}/u)?.[0] ?? '';

  for (const [name, codes] of Object.entries(UNICODE_SCRIPT)) {
    if (new RegExp(`\\p{Script=${name}}`, 'u').test(letter)) return codes;
  }

  return [];
}

function wikidataScript(label: string) {
  const match = WIKIDATA_SCRIPTS.find(([pattern]) => pattern.test(label));
  return match && match[1] !== 'skip' ? match[1] : undefined;
}

/* -------------------------------------------------------------------------- */
/*                           The mapping onto features                        */
/* -------------------------------------------------------------------------- */

type Facts = {
  wals: (parameter: string) => number | undefined;
  phonology?: Phonology;
  scripts?: Set<string>;
};

type Rule = (facts: Facts) => Status | undefined;

const STRENGTH: Record<Status, number> = { absent: 0, partial: 1, present: 2 };

/** A WALS chapter: its value codes that mean present, and partial. */
function wals(
  parameter: string,
  present: number[],
  partial: number[] = [],
): Rule {
  return ({ wals }) => {
    const value = wals(parameter);

    if (value === undefined) return undefined;
    if (present.includes(value)) return 'present';

    return partial.includes(value) ? 'partial' : 'absent';
  };
}

/** The first rule with data decides. */
function firstKnown(...rules: Rule[]): Rule {
  return facts => {
    for (const rule of rules) {
      const status = rule(facts);
      if (status) return status;
    }

    return undefined;
  };
}

/** The strongest answer of the rules with data. */
function strongest(...rules: Rule[]): Rule {
  return facts =>
    rules
      .map(rule => rule(facts))
      .filter((status): status is Status => Boolean(status))
      .sort((a, b) => STRENGTH[b] - STRENGTH[a])[0];
}

function phoible(decide: (phonology: Phonology) => Status): Rule {
  return ({ phonology }) => (phonology ? decide(phonology) : undefined);
}

function phoibleHas(trait: SegmentTrait): Rule {
  return phoible(({ has }) => (has[trait] ? 'present' : 'absent'));
}

function script(...features: Feature[]): Rule {
  return ({ scripts }) => {
    if (!scripts) return undefined;

    const kinds = [...scripts].flatMap(code => SCRIPT_KIND[code] ?? []);
    return kinds.some(kind => features.includes(kind)) ? 'present' : 'absent';
  };
}

/** WALS 81A dominant order, 81B for the languages with two of them. */
const WORD_ORDER_CODE = { sov: 1, svo: 2, vso: 3, vos: 4, ovs: 5, osv: 6 };
const TWO_ORDERS: Record<number, string[]> = {
  1: ['sov', 'svo'],
  2: ['vso', 'vos'],
  3: ['svo', 'vso'],
  4: ['svo', 'vos'],
  5: ['sov', 'ovs'],
};

function wordOrder(order: keyof typeof WORD_ORDER_CODE): Rule {
  return ({ wals }) => {
    const dominant = wals('81A');

    if (dominant === undefined) return undefined;
    if (dominant === WORD_ORDER_CODE[order]) return 'present';

    const two = wals('81B');
    return two !== undefined && TWO_ORDERS[two]?.includes(order)
      ? 'partial'
      : 'absent';
  };
}

/**
 * Alignment: WALS 98A (case on full noun phrases), else 99A (case on
 * pronouns), else 100A (verbal person marking) gives the main system, present;
 * a different system in one of the other two (split ergativity) is partial.
 */
type Alignment = 'accusative' | 'ergative' | 'tripartite' | 'active' | 'split';

const ALIGNMENT_CODES: Record<string, Record<number, Alignment>> = {
  '98A': {
    2: 'accusative',
    3: 'accusative',
    4: 'ergative',
    5: 'tripartite',
    6: 'active',
  },
  '99A': {
    2: 'accusative',
    3: 'accusative',
    4: 'ergative',
    5: 'tripartite',
    6: 'active',
  },
  '100A': { 2: 'accusative', 3: 'ergative', 4: 'active', 6: 'split' },
};

function alignment(kind: 'accusative' | 'ergative' | 'tripartite'): Rule {
  return ({ wals }) => {
    const known = Object.keys(ALIGNMENT_CODES).filter(
      parameter => wals(parameter) !== undefined,
    );

    if (known.length === 0) return undefined;

    const systems = known
      .map(parameter => ALIGNMENT_CODES[parameter][wals(parameter) as number])
      .filter((system): system is Alignment => Boolean(system));

    const [main, ...others] = systems;

    if (main === kind) return 'present';
    if (main === 'split' && kind !== 'tripartite') return 'partial';
    if (main === 'active' && kind === 'ergative') return 'partial';

    return others.some(
      system =>
        system === kind ||
        (system === 'split' && kind !== 'tripartite') ||
        (system === 'active' && kind === 'ergative'),
    )
      ? 'partial'
      : 'absent';
  };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Every feature WALS (or the sources completing it) can answer. Features of the
 * catalogue missing here (pitch accent, vowel harmony, gemination, V2, dual,
 * switch reference, topic and focus markers, diminutives…) have no source and
 * always end up in `meta.unknown`.
 */
const RULES: Record<Feature, Rule> = {
  /* Phonology */
  nasalization: firstKnown(wals('10A', [1]), phoibleHas('nasalVowels')),
  clickConsonants: firstKnown(wals('19A', [2, 6]), phoibleHas('clicks')),
  tones: wals('13A', [2, 3]),
  ejectiveConsonants: firstKnown(
    wals('7A', [2, 5, 6, 8]),
    phoibleHas('ejectives'),
  ),
  implosiveConsonants: firstKnown(
    wals('7A', [3, 5, 7, 8]),
    phoibleHas('implosives'),
  ),
  retroflexConsonants: phoibleHas('retroflex'),
  consonantClusters: wals('12A', [3], [2]),
  openSyllablesOnly: wals('12A', [1]),
  highVowelInventory: firstKnown(
    wals('2A', [3]),
    phoible(({ vowels }) => (vowels >= 7 ? 'present' : 'absent')),
  ),
  lowVowelInventory: firstKnown(
    wals('2A', [1]),
    phoible(({ vowels }) => (vowels <= 4 ? 'present' : 'absent')),
  ),
  // WALS 1A bands: small 6-14, moderately small 15-18, average 19-25,
  // moderately large 26-33, large 34+.
  highConsonantInventory: firstKnown(
    wals('1A', [5], [4]),
    phoible(({ consonants }) =>
      consonants >= 34 ? 'present' : consonants >= 26 ? 'partial' : 'absent',
    ),
  ),
  lowConsonantInventory: firstKnown(
    wals('1A', [1], [2]),
    phoible(({ consonants }) =>
      consonants <= 14 ? 'present' : consonants <= 18 ? 'partial' : 'absent',
    ),
  ),
  palatalization: phoibleHas('palatalized'),
  // WALS 8A lumps lateral affricates in, PHOIBLE tells fricatives apart.
  lateralFricatives: firstKnown(
    phoibleHas('lateralFricatives'),
    wals('8A', [4, 5]),
  ),
  creakyVoice: phoibleHas('creaky'),
  pharyngealization: phoibleHas('pharyngealized'),
  aspiratedConsonants: phoibleHas('aspirated'),
  labialization: phoibleHas('labialized'),

  /* Word order */
  sov: wordOrder('sov'),
  svo: wordOrder('svo'),
  vso: wordOrder('vso'),
  vos: wordOrder('vos'),
  ovs: wordOrder('ovs'),
  osv: wordOrder('osv'),
  // Only "no dominant order" says something; a dominant order may still be
  // flexible (Russian is SVO in WALS).
  freeWordOrder: ({ wals }) => {
    if (wals('81A') !== 7) return undefined;
    return wals('81B') === undefined ? 'present' : 'partial';
  },

  /* Writing system */
  latinAlphabet: script('latinAlphabet'),
  cyrillicAlphabet: script('cyrillicAlphabet'),
  alphabet: script('alphabet'),
  abjad: script('abjad'),
  abugida: script('abugida'),
  logographic: script('logographic'),
  syllabary: script('syllabary'),

  /* Morphosyntax */
  nominativeAccusativeAlignment: alignment('accusative'),
  ergativeAlignment: alignment('ergative'),
  tripartiteAlignment: alignment('tripartite'),
  nounClasses: firstKnown(wals('30A', [2, 3, 4, 5]), wals('32A', [2, 3])),
  inclusiveExclusiveWe: firstKnown(
    wals('39A', [5], [4]),
    wals('40A', [5], [4]),
  ),
  evidentiality: wals('77A', [2, 3]),
  prepositions: wals('85A', [2], [4]),
  postpositions: wals('85A', [1], [4]),
  noCopula: wals('120A', [2]),
  proDrop: wals('101A', [2, 3, 5], [6]),
  caseMarking: firstKnown(
    wals('49A', range(2, 8), [9]),
    wals('51A', range(1, 5), [6, 7, 8]),
  ),
  classifierSystem: wals('55A', [3], [2]),
  tense: ({ wals }) => {
    const past = wals('66A');
    const future = wals('67A');

    if (past === undefined && future === undefined) return undefined;
    if (past !== undefined && past !== 4) return 'present';
    if (future === 1) return past === 4 ? 'partial' : 'present';

    return 'absent';
  },
  aspect: ({ wals }) => {
    const perfective = wals('65A');
    const perfect = wals('68A');

    if (perfective === undefined && perfect === undefined) return undefined;
    if (perfective === 1) return 'present';

    return perfect !== undefined && perfect !== 4 ? 'partial' : 'absent';
  },
  mood: strongest(
    wals('70A', [1, 2, 3, 4]),
    wals('73A', [1]),
    wals('74A', [1]),
    wals('75A', [2]),
  ),
  personAgreement: firstKnown(
    wals('102A', [2, 3, 4, 5]),
    wals('100A', [2, 3, 4, 5, 6]),
    ({ wals }) => (wals('101A') === 2 ? 'present' : undefined),
  ),
  politenessDistinctions: wals('45A', [2, 3, 4]),
  reduplication: wals('27A', [1, 2]),
  // Both bipartite negation (French ne… pas) and negative concord (Spanish
  // "no vino nadie") count, the way the existing languages are described.
  doubleNegation: strongest(
    wals('112A', [6]),
    wals('115A', [1], [3]),
    wals('143A', [14], [15, 16, 17]),
    wals('144A', [18], [19]),
  ),
  interrogativeParticles: firstKnown(
    wals('92A', [1, 2, 3, 4, 5]),
    wals('116A', [1, 3]),
  ),
  // 37A and 38A each also say whether the other article exists ("no
  // definite, but indefinite article").
  definiteArticles: firstKnown(wals('37A', [1, 2, 3]), ({ wals }) =>
    articleFromOther(wals('38A')),
  ),
  indefiniteArticles: firstKnown(wals('38A', [1, 2, 3]), ({ wals }) =>
    articleFromOther(wals('37A')),
  ),
  genderedPronouns: wals('44A', range(1, 5)),

  /* Phonology added with the vocabulary group */
  uvularConsonants: firstKnown(wals('6A', [2, 3, 4]), phoibleHas('uvulars')),
  frontRoundedVowels: firstKnown(
    wals('11A', [2, 3, 4]),
    phoibleHas('frontRounded'),
  ),
  fixedStress: wals('14A', range(2, 7)),

  /* Word order of the noun phrase, and of questions */
  adjectiveNoun: wals('87A', [1], [3]),
  nounAdjective: wals('87A', [2], [3]),
  genitiveNoun: wals('86A', [1], [3]),
  nounGenitive: wals('86A', [2], [3]),
  whInSitu: wals('93A', [2], [3]),

  /* Vocabulary */
  // French counts in twenties only from 60 on: hybrid, partial.
  vigesimalNumerals: wals('131A', [3], [2]),
  teaFromCha: wals('138A', [1]),
  teaFromTe: wals('138A', [2]),
  handArmSameWord: wals('129A', [1]),
};

/** 37A/38A value 4 is "no X, but the other article"; 5 is "neither". */
function articleFromOther(value: number | undefined): Status | undefined {
  if (value === 4) return 'present';
  return value === 5 ? 'absent' : undefined;
}

/** The order of `src/core/lib/features.ts`, so `meta.unknown` reads the same. */
function catalogueFeatures() {
  const file = readFileSync(join(ROOT, 'src/core/lib/features.ts'), 'utf8');
  const body = file.slice(0, file.indexOf('export const langFeatures'));

  return [...body.matchAll(/'(\w+)'/g)].map(match => match[1]);
}

/* -------------------------------------------------------------------------- */
/*                                    Names                                   */
/* -------------------------------------------------------------------------- */

type Names = {
  en?: string;
  es?: string;
  pt?: string;
  /** The item's label in the language itself ("català", "idioma español"). */
  self?: string;
  natives: Array<{ text: string; lang: string }>;
  scripts: string[];
};

function buildNames(rows: Record<string, string>[]) {
  const names = new Map<string, Names>();

  for (const row of rows) {
    const current = names.get(row.iso);
    const natives = row.natives
      ? row.natives.split('||').map(native => {
          const at = native.lastIndexOf('@');
          return { text: native.slice(0, at), lang: native.slice(at + 1) };
        })
      : [];
    const scripts = row.ws ? row.ws.split('||') : [];

    // Some codes belong to several items (a language and its dialect
    // cluster): keep the first labels, pool natives and scripts.
    names.set(row.iso, {
      en: current?.en ?? (row.enLabel || undefined),
      es: current?.es ?? (row.esLabel || undefined),
      pt: current?.pt ?? (row.ptLabel || undefined),
      self: current?.self ?? (row.selfLabel || undefined),
      natives: [...(current?.natives ?? []), ...natives],
      scripts: [...new Set([...(current?.scripts ?? []), ...scripts])],
    });
  }

  return names;
}

const withoutLanguageWord = (name: string) =>
  name
    .replace(/\s*\(individual language\)$/i, '')
    .replace(/\s+(language|languages|dialect)$/i, '')
    .replace(/^(língua|idioma|lengua|dialecto|dialeto)\s+/i, '')
    .trim();

/** "Arabic (Egyptian)" → "Egyptian Arabic", the way WALS names varieties. */
function readableWalsName(name: string) {
  const match = name.match(/^(.+?) \(([^)]+)\)$/);
  return match ? `${match[2]} ${match[1]}` : name;
}

/* -------------------------------------------------------------------------- */
/*                                   Regions                                  */
/* -------------------------------------------------------------------------- */

type Point = { lat: number; lng: number };

/** A country where a language is a main language, by CLDR. */
type Region = Point & { country: string; speakers: number };

const OFFICIAL = new Set(['official', 'de_facto_official']);
/** Below this share, the language must be the country's main one. */
const WIDELY_SPOKEN_PERCENT = 75;
const MIN_SPEAKERS = 200_000;
/** A country this close to a point the language already has adds nothing. */
const NEAR_KM = 500;
const MAX_REGIONS = 15;

/**
 * Regions country-level data cannot see: a language that is the main one of
 * a province but not of its country.
 */
const EXTRA_REGIONS: Record<string, Region[]> = {
  fr: [{ country: 'CA-QC', lat: 46.8, lng: -71.2, speakers: 7_000_000 }],
};

function kmBetween(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;

  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The countries where each language (CLDR code) is a main language: official
 * (or de facto) there, and either the most spoken language of the country or
 * spoken by 75% of it. CLDR's shares count second-language speakers (English
 * is "64%" of Germany), hence official status and not the share alone.
 */
function buildRegions(
  territoryInfo: {
    supplemental: {
      territoryInfo: Record<
        string,
        {
          _population?: string;
          languagePopulation?: Record<
            string,
            { _populationPercent: string; _officialStatus?: string }
          >;
        }
      >;
    };
  },
  countries: Record<string, string>[],
) {
  const centres = new Map(
    countries.map(row => [
      row.country,
      { lat: Number(row.latitude), lng: Number(row.longitude) },
    ]),
  );
  const byLanguage = new Map<string, Region[]>();

  for (const [country, info] of Object.entries(
    territoryInfo.supplemental.territoryInfo,
  )) {
    // The Canary Islands have a CLDR code of their own, no row in the list.
    const centre =
      centres.get(country) ??
      (country === 'IC' ? { lat: 28.3, lng: -15.6 } : undefined);
    const languages = Object.entries(info.languagePopulation ?? {});

    if (!centre || !languages.length) continue;

    const shares = languages.map(([, l]) => Number(l._populationPercent));
    const top = Math.max(...shares);
    // A tie (English and Arabic in Sudan, English and Chichewa in Malawi)
    // means English is not the main language there.
    const soleTop = shares.filter(share => share === top).length === 1;

    for (const [tag, language] of languages) {
      const percent = Number(language._populationPercent);
      const speakers = (Number(info._population ?? 0) * percent) / 100;
      const main =
        (percent === top && soleTop) || percent >= WIDELY_SPOKEN_PERCENT;

      if (
        !OFFICIAL.has(language._officialStatus ?? '') ||
        !main ||
        speakers < MIN_SPEAKERS
      ) {
        continue;
      }

      // `zh_Hant`, `sr_Latn`: the script does not make another language.
      const code = tag.split('_')[0];
      byLanguage.set(code, [
        ...(byLanguage.get(code) ?? []),
        { ...centre, country, speakers },
      ]);
    }
  }

  return byLanguage;
}

/**
 * The countries a language adds to its WALS points, most speakers first,
 * leaving out the ones next to a point it already has (Spain for Spanish).
 */
function regionsOf(codes: string[], points: Point[]) {
  const candidates = [
    ...new Map(
      codes
        .flatMap(code => [
          ...(regions.get(code) ?? []),
          ...(EXTRA_REGIONS[code] ?? []),
        ])
        .sort((a, b) => b.speakers - a.speakers)
        .map(region => [region.country, region]),
    ).values(),
  ];
  const kept: Region[] = [];

  for (const region of candidates) {
    if (kept.length === MAX_REGIONS) break;
    if (
      [...points, ...kept].some(point => kmBetween(point, region) < NEAR_KM)
    ) {
      continue;
    }
    kept.push(region);
  }

  return kept;
}

/* -------------------------------------------------------------------------- */
/*                                    Build                                   */
/* -------------------------------------------------------------------------- */

const [
  walsLanguages,
  walsValues,
  phoibleLanguages,
  phoibleParameters,
  phoibleValues,
  cldrLanguageData,
  cldrTerritoryInfo,
  countryRows,
  isoCodes,
  isoMacros,
  isoRetirements,
  wikidataCsv,
] = await Promise.all([
  source('wals-languages.csv').then(parseCsv),
  source('wals-values.csv').then(parseCsv),
  source('phoible-languages.csv').then(parseCsv),
  source('phoible-parameters.csv').then(parseCsv),
  source('phoible-values.csv').then(parseCsv),
  source('cldr-language-data.json').then(JSON.parse),
  source('cldr-territory-info.json').then(JSON.parse),
  source('countries.csv').then(parseCsv),
  source('iso-639-3.tab'),
  source('iso-639-3-macrolanguages.tab'),
  source('iso-639-3-retirements.tab'),
  wikidata(),
]);

const iso = buildIsoTables(isoCodes, isoMacros, isoRetirements);
const phonology = buildPhonology(
  phoibleLanguages,
  phoibleParameters,
  phoibleValues,
);
const names = buildNames(parseCsv(wikidataCsv));
const regions = buildRegions(cldrTerritoryInfo, countryRows);
const cldrScripts = cldrLanguageData.supplemental.languageData as Record<
  string,
  { _scripts?: string[] }
>;
const features = catalogueFeatures();

/**
 * Codes the catalogue already has: the translated exonyms and the shipped
 * flags. The seed script also refuses any code already stored in Redis.
 */
const existing = new Set([
  ...Object.keys(
    JSON.parse(readFileSync(join(ROOT, 'messages/en.json'), 'utf8')).Exonyms,
  ),
  ...readdirSync(join(ROOT, 'public/flags'))
    .filter(file => file.endsWith('.webp') && file !== 'unknown.webp')
    .map(file => file.replace('.webp', '')),
]);

const valuesByLanguage = new Map<string, Map<string, number>>();

for (const value of walsValues) {
  const values = valuesByLanguage.get(value.Language_ID) ?? new Map();
  values.set(value.Parameter_ID, Number(value.Value));
  valuesByLanguage.set(value.Language_ID, values);
}

const skipped: Record<string, string[]> = {
  noIsoCode: [],
  signLanguage: [],
  alreadyInCatalogue: [],
  noData: [],
};
const groups = new Map<string, Group>();

for (const language of walsLanguages) {
  if (language.ID.startsWith('family-') || language.ID.startsWith('genus-')) {
    continue;
  }

  const entry: WalsLanguage = {
    id: language.ID,
    name: language.Name,
    iso: '',
    glottocode: language.Glottocode,
    ...(language.Latitude && language.Longitude
      ? {
          location: {
            lat: Math.round(Number(language.Latitude) * 1000) / 1000,
            lng: Math.round(Number(language.Longitude) * 1000) / 1000,
          },
        }
      : {}),
    // WALS files creoles and pidgins under "other": no family to share.
    ...(language.Family && language.Family !== 'other'
      ? { family: language.Family, genus: language.Genus || undefined }
      : {}),
    values: valuesByLanguage.get(language.ID) ?? new Map(),
  };

  // Sign languages have no use for phonology or writing system features.
  if (language.Genus === 'Sign Languages') {
    skipped.signLanguage.push(`${language.ID} ${language.Name}`);
    continue;
  }

  const code = currentIso(
    language.ISO639P3code || language.ISO_codes.split(/\s+/)[0] || '',
    iso,
  );

  if (!code) {
    skipped.noIsoCode.push(`${language.ID} ${language.Name}`);
    continue;
  }

  entry.iso = code;
  const group = groups.get(code) ?? { iso: code, entries: [] };
  group.entries.push(entry);
  groups.set(code, group);
}

/** Script codes of a language: CLDR first, its macrolanguage, Wikidata. */
function scriptsOf(code: string, id: string) {
  if (SCRIPTS[code]) return new Set(SCRIPTS[code]);

  const macro = iso.macro.get(code);
  const candidates = [id, code, macro, macro && iso.part1.get(macro)];

  for (const candidate of candidates) {
    const scripts = candidate && cldrScripts[candidate]?._scripts;
    if (scripts?.length) return new Set(scripts);
  }

  const fromWikidata = (namesOf(code)?.scripts ?? [])
    .map(wikidataScript)
    .filter((script): script is string => Boolean(script));

  return fromWikidata.length ? new Set(fromWikidata) : undefined;
}

/**
 * The endonyms, best first: native labels in the language itself, written in
 * its main script (Swahili before its Ajami spelling), the one the language's
 * own label agrees with first (Catalan has "valencià" and "català", its label
 * is "català"). A label in a script the language is not known to use is no
 * display name, `display` is then false.
 */
function endonymOf(code: string, id: string, scripts?: Set<string>) {
  const { natives = [], self = '' } = namesOf(code) ?? {};
  const own = natives.filter(({ lang }) =>
    [code, id, iso.macro.get(code)].includes(lang.split('-')[0]),
  );
  const label = self.toLocaleLowerCase();
  const agrees = (text: string) =>
    Boolean(label) && label.includes(text.toLocaleLowerCase());

  const main = scripts ? [...scripts][0] : undefined;
  const inMain = (text: string) =>
    main !== undefined && scriptsOfText(text).includes(main);
  const rank = (text: string) =>
    Number(inMain(text)) * 2 + Number(agrees(text));

  const sorted = (own.length ? own : natives)
    .map(({ text }) => text.trim())
    .sort((a, b) => rank(b) - rank(a));
  const display =
    !scripts ||
    sorted.length === 0 ||
    scriptsOfText(sorted[0]).some(script => scripts.has(script));

  return {
    endonyms: ENDONYM[code] ? [ENDONYM[code], ...sorted] : sorted,
    display: Boolean(ENDONYM[code]) || display,
  };
}

/**
 * The names of a language. A standard variety keyed by its macrolanguage's
 * ISO 639-1 code (Estonian, Nepali) is named after the macrolanguage.
 */
function namesOf(code: string): Names | undefined {
  const own = names.get(code);
  const macro = STANDARD_VARIETY[code] && names.get(iso.macro.get(code) ?? '');

  if (!macro) return own;

  return {
    en: macro.en ?? own?.en,
    es: macro.es ?? own?.es,
    pt: macro.pt ?? own?.pt,
    self: macro.self ?? own?.self,
    natives: [...macro.natives, ...(own?.natives ?? [])],
    scripts: [...new Set([...macro.scripts, ...(own?.scripts ?? [])])],
  };
}

type Entry = {
  id: string;
  codes: string[];
  data: {
    name: string;
    exonym?: string;
    features: Feature[];
    partial: Feature[];
    active: false;
    searchParams: string[];
    locations?: Array<{ lat: number; lng: number }>;
    family?: string;
    genus?: string;
    coverage: number;
  };
  meta: {
    wals: string[];
    /** Countries (ISO 3166) added to the WALS points, from CLDR. */
    regions: string[];
    glottocode: string;
    phoible: boolean;
    /** Features some source answered (present, partial or absent). */
    known: number;
    /** Features a source could answer but did not, for this language. */
    unknown: Feature[];
  };
};

/**
 * What WALS says about a language the catalogue already has: the features,
 * place and family `update-existing.ts` may fill in, never its names.
 */
type ExistingEntry = {
  id: string;
  codes: string[];
  data: Pick<
    Entry['data'],
    'features' | 'partial' | 'locations' | 'family' | 'genus'
  >;
  meta: Pick<Entry['meta'], 'wals' | 'unknown' | 'regions'>;
};

const entries: Entry[] = [];
const existingEntries = new Map<string, ExistingEntry>();
/** How good the group behind each existing entry is: see `existingRank`. */
const existingRanks = new Map<string, number>();

/**
 * `sh` is fed by hbs (whose code means it), not by bos or hrv; `hi` by hin,
 * not urd. Among equals, the group with the most datapoints.
 */
function existingRank(group: Group, target: string) {
  const datapoints = group.entries.reduce((sum, e) => sum + e.values.size, 0);
  return (catalogueId(group.iso, iso) === target ? 1_000_000 : 0) + datapoints;
}
const ids = new Map<string, string>();

/**
 * The CLDR codes a catalogue language goes by: its own, and the ones of the
 * languages it covers (`hi` is Urdu too, `sh` Serbian, Croatian, Bosnian).
 */
function cldrCodes(code: string, id: string) {
  const covered = Object.keys(COVERED_BY).filter(c => COVERED_BY[c] === id);

  return [id, code, iso.part1.get(code), ...covered]
    .concat(covered.map(c => iso.part1.get(c)))
    .filter((value): value is string => Boolean(value));
}

/** The facts of a group and what every rule makes of them. */
function describe(group: Group, id: string) {
  const code = group.iso;
  const facts: Facts = {
    wals: parameter => walsValue(group, parameter),
    phonology: phonology.get(code),
    scripts: scriptsOf(code, id),
  };
  const statuses = Object.fromEntries(
    Object.entries(RULES).map(([feature, rule]) => [feature, rule(facts)]),
  ) as Record<Feature, Status | undefined>;
  const [primary] = group.entries;
  // Every merged WALS entry is a point of its own (Spain and the Canaries,
  // Beirut and Damascus), each once.
  const locations = [
    ...new Map(
      group.entries
        .map(entry => entry.location)
        .filter((point): point is { lat: number; lng: number } => !!point)
        .map(point => [`${point.lat},${point.lng}`, point]),
    ).values(),
  ];
  const added = regionsOf(cldrCodes(code, id), locations);
  const points = [
    ...locations,
    ...added.map(({ lat, lng }) => ({
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
    })),
  ];

  return {
    facts,
    statuses,
    regions: added.map(region => region.country),
    place: {
      ...(points.length ? { locations: points } : {}),
      ...(primary.family ? { family: primary.family } : {}),
      ...(primary.genus ? { genus: primary.genus } : {}),
    },
  };
}

for (const group of [...groups.values()].sort((a, b) =>
  a.iso.localeCompare(b.iso),
)) {
  group.entries.sort((a, b) => b.values.size - a.values.size);

  const code = group.iso;
  const id = catalogueId(code, iso);
  const label = `${code} ${group.entries.map(e => e.name).join(' / ')}`;

  if (
    COVERED_BY[code] ||
    existing.has(id) ||
    existing.has(code) ||
    ids.has(id)
  ) {
    const target = COVERED_BY[code] ?? (ids.has(id) ? undefined : id);
    skipped.alreadyInCatalogue.push(`${label} → ${target ?? ids.get(id)}`);

    if (target) {
      const { statuses, place, regions: added } = describe(group, target);
      const rank = existingRank(group, target);

      if (rank > (existingRanks.get(target) ?? -1)) {
        existingRanks.set(target, rank);
        existingEntries.set(target, {
          id: target,
          codes: [
            ...new Set([target, code, iso.part1.get(code)].filter(Boolean)),
          ] as string[],
          data: {
            features: features.filter(f => statuses[f] === 'present'),
            partial: features.filter(f => statuses[f] === 'partial'),
            ...place,
          },
          meta: {
            wals: group.entries.map(e => e.id),
            regions: added,
            unknown: features.filter(f => RULES[f] && !statuses[f]),
          },
        });
      }
    }

    continue;
  }

  const { facts, statuses, place, regions: added } = describe(group, id);
  // A writing system alone does not make a playable language: keep the ones
  // WALS (or PHOIBLE, for a WALS language) says something about.
  const typology = Object.values(RULES).some(
    rule =>
      rule({ wals: facts.wals, phonology: facts.phonology }) !== undefined,
  );

  if (!typology) {
    skipped.noData.push(label);
    continue;
  }

  const name = namesOf(code);
  const english = withoutLanguageWord(
    ENGLISH_NAME[code] ??
      name?.en ??
      iso.refName.get(code) ??
      readableWalsName(group.entries[0].name),
  );
  const { endonyms, display } = endonymOf(code, id, facts.scripts);
  const endonym = display ? endonyms[0] : undefined;
  const otherEndonyms = display ? endonyms.slice(1) : endonyms;
  const displayName = endonym ?? english;

  const searchParams = [
    displayName,
    ...otherEndonyms,
    english,
    ...group.entries.flatMap(e => [e.name, readableWalsName(e.name)]),
    withoutLanguageWord(iso.refName.get(code) ?? ''),
    name?.es && withoutLanguageWord(name.es),
    name?.pt && withoutLanguageWord(name.pt),
    id,
  ]
    .filter((value): value is string => Boolean(value))
    .map(value => value.toLocaleLowerCase().trim());

  const known = features.filter(feature => statuses[feature] !== undefined);

  ids.set(id, label);
  entries.push({
    id,
    codes: [...new Set([id, code, iso.part1.get(code)])].filter(
      (value): value is string => Boolean(value),
    ),
    data: {
      name: displayName,
      ...(endonym && endonym.toLocaleLowerCase() !== english.toLocaleLowerCase()
        ? { exonym: english }
        : {}),
      features: features.filter(f => statuses[f] === 'present'),
      partial: features.filter(f => statuses[f] === 'partial'),
      active: false,
      searchParams: [...new Set(searchParams)],
      ...place,
      coverage: Math.round((known.length / features.length) * 100) / 100,
    },
    meta: {
      wals: group.entries.map(e => e.id),
      regions: added,
      glottocode: group.entries[0].glottocode,
      phoible: phonology.has(code),
      known: known.length,
      unknown: features.filter(
        feature => RULES[feature] && statuses[feature] === undefined,
      ),
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Output                                   */
/* -------------------------------------------------------------------------- */

const header = {
  description:
    'Languages of WALS mapped onto the Langdle features by scripts/wals/build-languages.ts. Generated, do not edit by hand.',
  sources: {
    wals: `https://github.com/cldf-datasets/wals/tree/${WALS_COMMIT}`,
    phoible: `https://github.com/cldf-datasets/phoible/tree/${PHOIBLE_COMMIT}`,
    cldr: `https://github.com/unicode-org/cldr-json/tree/${CLDR_TAG}`,
    iso6393: 'https://iso639-3.sil.org/code_tables/download_tables',
    wikidata: 'https://query.wikidata.org',
    countries: `https://github.com/google/dspl/blob/${DSPL_COMMIT}/samples/google/canonical/countries.csv`,
  },
  // The catalogue this file was built against, in order. update-existing.ts
  // drops any stored feature not in it; a test keeps it equal to features.ts.
  catalogue: features,
  // No source covers these: stored absent everywhere, left out of every
  // entry's `meta.unknown`.
  withoutSource: features.filter(feature => !RULES[feature]),
  license:
    'WALS and PHOIBLE: CC BY 4.0 (Dryer & Haspelmath 2013; Moran & McCloy 2019). CLDR: Unicode License. Wikidata: CC0.',
  skipped: Object.fromEntries(
    Object.entries(skipped).map(([reason, list]) => [reason, list.length]),
  ),
};

// One language per line: small diffs when the mapping changes.
writeFileSync(
  OUTPUT,
  `{\n"header": ${JSON.stringify(header)},\n"languages": [\n${entries
    .map(entry => JSON.stringify(entry))
    .join(',\n')}\n],\n"existing": [\n${[...existingEntries.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(entry => JSON.stringify(entry))
    .join(',\n')}\n]\n}\n`,
);

const coverage = entries.map(e => e.meta.known);
console.log(`${entries.length} languages written to ${OUTPUT}`);
console.log('skipped:', header.skipped);
for (const [reason, list] of Object.entries(skipped)) {
  if (reason !== 'noIsoCode' && list.length && list.length < 60) {
    console.log(`  ${reason}: ${list.join(', ')}`);
  }
}
for (const min of [5, 10, 20, 30, 40]) {
  console.log(
    `  >= ${min} known features: ${coverage.filter(c => c >= min).length}`,
  );
}
