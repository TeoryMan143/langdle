import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const groupedLangFeatures = {
  phonology: [
    'nasalization',
    'clickConsonants',
    'tones',
    'pitchAccent',
    'vowelHarmony',
    'ejectiveConsonants',
    'implosiveConsonants',
    'retroflexConsonants',
    'consonantClusters',
    'openSyllablesOnly',
    'highVowelInventory',
    'lowVowelInventory',
    'highConsonantInventory',
    'lowConsonantInventory',
    'gemination',
    'palatalization',
    'lateralFricatives',
    'creakyVoice',
    'pharyngealization',
    'aspiratedConsonants',
    'labialization',
  ],
  wordOrder: [
    'svo',
    'sov',
    'vso',
    'vos',
    'ovs',
    'osv',
    'v2',
    'freeWordOrder',
    'fixedWordOrder',
  ],
  writingSystem: [
    'latinAlphabet',
    'cyrillicAlphabet',
    'alphabet',
    'abjad',
    'abugida',
    'logographic',
    'syllabary',
  ],
  morphosyntax: [
    'ergativeAlignment',
    'nominativeAccusativeAlignment',
    'tripartiteAlignment',
    'nounClasses',
    'dualNumber',
    'trialNumber',
    'inclusiveExclusiveWe',
    'evidentiality',
    'switchReference',
    'prepositions',
    'postpositions',
    'noCopula',
    'proDrop',
    'focusMarker',
    'topicMarker',
    'caseMarking',
    'reflexivePronouns',
    'diminutives',
    'augmentatives',
    'ideophones',
    'classifierSystem',
    'tense',
    'aspect',
    'mood',
    'personAgreement',
    'politenessDistinctions',
    'reduplication',
    'auxiliaryVerbs',
    'doubleNegation',
    'interrogativeParticles',
  ],
} as const;

export const langFeatures = [
  ...groupedLangFeatures.phonology,
  ...groupedLangFeatures.wordOrder,
  ...groupedLangFeatures.writingSystem,
  ...groupedLangFeatures.morphosyntax,
] as const;

export function getUTCDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
