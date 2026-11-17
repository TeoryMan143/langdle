# WALS language import

Adds the languages of the [World Atlas of Language Structures](https://wals.info)
to the catalogue, **inactive**: an administrator reviews them in the review
queue (`/data/review`, best described first) and activates them from there or
with `PUT /api/lang/:id/status?active=true`.

| File | Role |
| --- | --- |
| `build-languages.ts` | downloads the sources into `.cache/` (gitignored) and writes `languages.json` |
| `languages.json` | the generated dataset, one language per line; never edit it by hand |
| `seed-languages.ts` | writes the new languages into Redis, never overwriting one |
| `update-existing.ts` | fixes and completes the languages already in Redis, never overriding an editor |
| `upload-flags.ts` | renders each language's flag and uploads it to the R2 bucket (`flags/<code>.webp`) |
| `write-exonyms.ts` | writes each language's English, Spanish and Portuguese name into the `Exonyms` messages |

```bash
pnpm wals:build                      # regenerate languages.json (--offline: cached sources only)

pnpm wals:seed --dry-run             # what a seed would write, without writing
pnpm wals:seed                       # write the missing languages (all inactive)
pnpm wals:seed --min-known=30        # only the best described ones
pnpm wals:seed --only=arz,ary,afb    # a chosen few
pnpm wals:seed --remove              # undo: deletes the ones nobody changed since

pnpm wals:update --dry-run           # what it would change, and where WALS disagrees
pnpm wals:update --cleanup-only      # only drop unknown feature names and the FIXES
pnpm wals:update                     # cleanup + backfill (backs up to backups/ first)
pnpm wals:update --place-only        # only locations, family, genus (no new features)
pnpm wals:update --drop-legacy       # delete the old single `location` field
pnpm wals:update --restore=scripts/wals/backups/<file>.json

pnpm wals:flags --dry-run            # render the flags into .cache/flags-preview, upload nothing
pnpm wals:flags                      # upload the missing ones (--force replaces, --only=arz,eu)

pnpm wals:exonyms --dry-run          # how many names it would add to messages/
pnpm wals:exonyms                    # add the missing ones (then sync_shared.dart in mobile/)
```

**Order on a deploy that changes the catalogue:** deploy the code first (the
migration adds the new features to Postgres, the app learns their names), then
`wals:update`, then `wals:seed`. Before the deploy only `--cleanup-only` is
safe: the deployed app does not know the new feature names yet, and older app
versions list only the first 50 languages.

`tests/lang-data/wals-languages.test.ts` checks the dataset against
`langDataSchema`, the catalogue of `features.ts` and the catalogue rules, so a
file that would store invalid data, or that is stale, fails `pnpm test:unit`.

## What the file holds

```json
{ "header": { "catalogue": [...], "withoutSource": [...], ... },
  "languages": [
    { "id": "arz", "codes": ["arz"], "data": { …what lang:arz stores… },
      "meta": { "wals": ["aeg"], "glottocode": "egyp1253", "phoible": true,
                "known": 51, "unknown": ["tones", …],
                "exonyms": { "en": "Egyptian Arabic", "es": "árabe egipcio",
                             "pt": "árabe egípcio" }, "translated": ["es", "pt"] } } ],
  "existing": [
    { "id": "es", "codes": ["es", "spa"], "data": { features, partial,
      locations, family, genus }, "meta": { "wals": ["spa"], "unknown": […] } } ] }
```

- `languages` are the ones to add. `id` is the ISO 639-1 code when there is
  one, the ISO 639-3 code otherwise (the `LANG_CODE_PATTERN` convention).
  `codes` are every code of the language; the seed skips it when any of them is
  taken (`ca` is not added while `cat` exists).
- `existing` is what WALS says about the languages the catalogue already has
  (the translated exonyms and shipped flags). Only `update-existing.ts` reads
  it, never their names.
- `data` carries `locations`, `family` and `genus` for the game hints, and
  `coverage` (the share of the catalogue some source described) for the review
  queue.
- `meta.known` counts the features some source answered. A feature no source
  covers is stored **absent**, since the catalogue has no "unknown"; they are
  listed in `meta.unknown`, and `header.withoutSource` lists the ones no
  source covers at all (pitch accent, vowel harmony, gemination, V2, dual…).
  Check those before activating a language.

## What `update-existing.ts` changes

1. **Cleanup**: removes stored feature names that are not in
   `header.catalogue` (`fusional`, `syllableTimed`, `agglutinative`…), and
   applies the hand corrections in `FIXES`: each feature listed there gets that
   status whatever is stored (Hindustani: SOV not SVO, postpositions only, no
   clicks or classifiers, a split alignment…).
2. **Backfill**: on a language with an `existing` (or `languages`) entry, sets
   the `BACKFILLED` features (the ones added with the vocabulary group) from
   WALS, but only when the language mentions none of them yet, and sets
   `locations`, `family` and `genus` only when missing. Re-running it, or
   running it after an editor has filled them in, changes nothing.

It writes only the changed fields, after saving the whole documents in
`backups/` (gitignored). `--dry-run` also prints, per language, the features
where WALS disagrees with what an editor stored: a review list, never applied.

## Sources and how they map

WALS is the authority; the others only fill what it does not cover.

| Features | Source |
| --- | --- |
| Word order (clause, adjective, possessor, question words), alignment, case, gender, articles, gendered pronouns, tense, aspect, mood, evidentiality, pro-drop, negation, questions, classifiers, politeness, reduplication, adpositions, copula, base-20 numerals, the word for tea, hand = arm, fixed stress | WALS chapters (`RULES` in `build-languages.ts` names the chapter and value codes of each) |
| Tones, syllable structure, inventory sizes, clicks, ejectives, implosives, nasal vowels, uvular consonants, front rounded vowels | WALS, else PHOIBLE |
| Retroflex, aspirated, palatalized, labialized, pharyngealized consonants, creaky voice, lateral fricatives | PHOIBLE (WALS has no chapter) |
| Writing system | CLDR, else Wikidata (WALS does not cover it) |
| Location, family, genus | WALS |
| Endonym, English name, Spanish and Portuguese names (`searchParams`, `meta.exonyms`) | Wikidata, ISO 639-3 |

- WALS entries sharing an ISO 639-3 code are merged (the Swiss German dialects
  become `gsw`); varieties with their own code stay separate languages, which is
  how the Arabic varieties (`arz`, `ary`, `apc`, `afb`, `acm`, `aeb`…) are kept
  apart. Sign languages and entries without an ISO code are skipped.
- `STANDARD_VARIETY`, `COVERED_BY`, `ENGLISH_NAME`, `ENDONYM` and `SCRIPTS` at
  the top of the build script hold the few hand decisions (`cmn` is `zh`, `urd`
  is already part of `hi`, curated Arabic endonyms…).
- `locations` are WALS's points (one per WALS entry: Spanish has Spain and
  the Canaries, Levantine Arabic Beirut, Damascus and Palestine), plus the
  countries where CLDR's territory data makes the language a main one:
  official or de facto official there, and either the country's single most
  spoken language or spoken by 75% of it, with 200,000 speakers at least.
  That adds Latin America to Spanish, Brazil and Lusophone Africa to
  Portuguese, the US, Canada and Australia to English, Pakistan to Hindustani.
  A country within 500 km of a point the language has adds nothing, and 15
  countries at most are added, most speakers first; `meta.regions` lists
  them. A country is placed at its centre (Google's canonical country list).
  `EXTRA_REGIONS` adds what country data cannot see (Quebec for French), and
  any language can be completed by hand in the editor (`/data/<code>`).
- WALS codes are kept even where they surprise: Japanese has "uvular
  continuants" in 6A (its moraic nasal), Swahili a definite article in 37A.

## Names in every locale

`meta.exonyms` is what the `Exonyms` messages call the language, and
`write-exonyms.ts` copies it into `messages/{en,es,pt}.json` and declares the
keys in `src/i18n/messages-schema.json`. It never replaces a name already
there, so a name corrected by hand in the messages stays. Run it after a build
that adds languages, then `dart run tool/sync_shared.dart` from `mobile/`; a
test fails while a language has no name in some locale.

- English is the name the language is stored under (`exonym`, or `name` when
  that is already English).
- Spanish and Portuguese are Wikidata's labels, written like the other
  exonyms: without "idioma" or "língua", lowercase unless the name is a proper
  noun ("zapoteco del Istmo", "Montana Salish"), and in Portuguese with the
  masculine noun rather than the adjective agreeing with "língua" ("língua
  bielorrussa" → "bielorrusso", "língua albanesa" → "albanês"; the Spanish
  label tells such an adjective from a name ending in -a). A label for a
  group ("lenguas akánicas") is not used.
- Wikidata has no Spanish or Portuguese label for about half the languages
  (`meta.translated` lists the locales that have one): they get the English
  name, which is also what the app showed without a message.

The `Exonyms` keys used to be the list of languages the catalogue had before
WALS. The build now leaves out of that list the ids its previous output added,
so a rebuild does not take its own languages for existing ones.

## Flags

`meta.flag` says where each language's flag comes from, and `upload-flags.ts`
renders it like `core/lib/flags.ts` does (a 455×304 WebP) to the bucket key
the clients look for once `public/flags` has nothing:

1. A community or regional flag when the language is tied to one:
   `COMMUNITY_FLAGS` in the build script (Catalonia, the Ikurriña, Wales,
   Brittany, Kurdistan, the Romani, Māori, Navajo, Cherokee and Ainu flags,
   the republics of Russia…), then the Sámi flag for the Saami genus, the
   Amazigh flag for Berber and the Aboriginal flag for the languages of
   Australia.
2. Otherwise a country: the one WALS places the language in, or, when it
   lists several, the one where CLDR counts most of its speakers.

Country and regional flags come from the flag-icons set (MIT); community flags
from Wikimedia Commons, only when Commons lists them as public domain, CC0, CC
BY or "copyrighted free use" (the script checks, and prints each licence). A
flag Commons only has inside a badge is drawn by the script (`DRAWN`: the
Sorbian tricolour). A flag already in the bucket, such as one sent with a
language request, is never replaced without `--force`; a language with a file
in `public/flags` gets none. The 5 languages WALS places in no country
(`brf`, `bvv`, `csk`, `gso`, `ywq`) keep the unknown flag.

## Licences

WALS (Dryer & Haspelmath 2013) and PHOIBLE (Moran & McCloy 2019) are CC BY 4.0:
the public atlas credits them (`PublicDataPage.attribution`), keep that line
wherever this data is shown. CLDR is under the Unicode License, Wikidata is CC0.
The flags: flag-icons is MIT (Lipis and contributors); the Commons flags used
are public domain except Khakassia's (CC0) and the Aboriginal flag (free to use
since the Commonwealth of Australia acquired its copyright in 2022).
