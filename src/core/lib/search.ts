import { distance } from 'fastest-levenshtein';

/**
 * How languages are matched against what a user types (`GET /lang/page?q=`):
 * what a query finds and in which order.
 */

/** Lowercase, accents and extra spaces dropped: `Català` matches `catala`. */
export function normalizeSearchText(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** The normalized terms a language is found by: its id and every name. */
export function searchTerms(language: {
  id: string;
  name: string;
  exonym?: string;
  searchParams: string[];
}) {
  return [
    language.id,
    language.name,
    language.exonym ?? '',
    ...language.searchParams,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);
}

const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u;

/** Typos forgiven: one per four letters typed, none below four. */
function allowedTypos(query: string) {
  return Math.floor(query.length / 4);
}

/**
 * How well a language's normalized `terms` match a normalized query, best
 * first: `0` a whole term, `1` the start of a term, `2` the start of a word
 * inside one, `3` anywhere, `4` the start of a term or word with a few typos.
 * `null` when nothing matches.
 */
export function matchRank(terms: string[], query: string): number | null {
  let best: number | null = null;

  for (const term of terms) {
    const rank =
      term === query
        ? 0
        : term.startsWith(query)
          ? 1
          : term.split(WORD_SEPARATOR).some(word => word.startsWith(query))
            ? 2
            : term.includes(query)
              ? 3
              : null;

    if (rank !== null && (best === null || rank < best)) {
      best = rank;
    }

    if (best === 0) {
      return best;
    }
  }

  if (best !== null) {
    return best;
  }

  const typos = allowedTypos(query);

  if (typos === 0) {
    return null;
  }

  // Compared with the start of each name, about as long as what was typed (a
  // letter missed or doubled changes the length), so a typo is forgiven while
  // the rest of the name is still to come.
  const fuzzy = terms.some(term =>
    [term, ...term.split(WORD_SEPARATOR)].some(candidate => {
      for (let extra = -typos; extra <= typos; extra++) {
        const length = query.length + extra;

        if (
          length <= candidate.length &&
          distance(query, candidate.slice(0, length)) <= typos
        ) {
          return true;
        }
      }

      return false;
    }),
  );

  return fuzzy ? 4 : null;
}
