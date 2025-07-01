import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const langFeatures = [
  'nasalization',
  'clickConsonants',
  'tones',
  'pitchAccent',
  'latinAlphabet',
  'cyrillicAlphabet',
  'alphabet',
  'abjad',
  'abugida',
  'logographic',
  'syllabary',
  'agglutinative',
  'fusional',
  'isolating',
  'polysynthetic',
  'ergativeAlignment',
  'nominativeAccusativeAlignment',
  'tripartiteAlignment',
  'svo',
  'sov',
  'vso',
  'vos',
  'ovs',
  'osv',
  'v2',
  'stressTimed',
  'syllableTimed',
  'moraTimed',
  'ejectiveConsonants',
  'implosiveConsonants',
  'retroflexConsonants',
  'vowelHarmony',
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
  'consonantClusters',
  'openSyllablesOnly',
  'highVowelInventory',
  'lowVowelInventory',
  'gemination',
  'palatalization',
  'lateralFricatives',
  'creakyVoice',
  'reduplication',
  'auxiliaryVerbs',
  'doubleNegation',
  'freeWordOrder',
  'fixedWordOrder',
  'interrogativeParticles',
  'pharyngealization',
  'aspiratedConsonants',
] as const;

export function getUTCDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
