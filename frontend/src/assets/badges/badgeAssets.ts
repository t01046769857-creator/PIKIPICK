import type { SecretBadge } from '../../components/SecretLandDashboard';

const files = import.meta.glob('./collection/badge-art-*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const fileFor = (number: number) => {
  const name = `./collection/badge-art-${String(number).padStart(2, '0')}.png`;
  return files[name];
};

const legacyCleanFiles = import.meta.glob('./badge_concept_*-clean.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const legacyCleanFileFor = (number: number) => legacyCleanFiles[`./badge_concept_${String(number).padStart(2, '0')}-clean.png`];

/** All 40 source concepts, kept independent from earned badge data. */
export const badgeConceptAssets = Array.from({ length: 40 }, (_, index) => fileFor(index + 1));

/**
 * The badge book has 36 visual concepts while the runtime currently exposes
 * only six achievement IDs. Keep the existing exact runtime matches and use
 * the saved individual PNG catalog for the remaining book illustrations.
 * The concept names and unlock state remain independent from this visual map.
 */
export const badgeAssetByConceptId: Partial<Record<string, string>> = {
  'crystal-palace': fileFor(1),
  // The replacement ZIP contains adjacent-pixel contamination in 02/03; retain the verified clean files.
  'dragon-egg': legacyCleanFileFor(2),
  'rainbow-butterfly': legacyCleanFileFor(3),
  'treasure-chest': fileFor(4),
  'moon-fox': fileFor(5),
  'starlight-key': fileFor(7),
  'future-1': fileFor(17),
  'future-2': fileFor(38),
  'future-3': fileFor(10),
  'future-4': fileFor(9),
  'future-5': fileFor(40),
  'future-6': fileFor(23),
  'future-7': fileFor(8),
  'future-8': fileFor(5),
  'future-9': fileFor(37),
  'future-10': fileFor(39),
  'future-11': fileFor(22),
  'future-12': fileFor(35),
  'future-13': fileFor(18),
  'future-14': fileFor(19),
  'future-15': fileFor(10),
  'future-16': fileFor(12),
  'future-17': fileFor(15),
  'future-18': fileFor(16),
  'future-19': fileFor(24),
  'future-20': fileFor(31),
  'future-21': fileFor(13),
  'future-22': fileFor(27),
  'future-23': fileFor(21),
  'future-24': legacyCleanFileFor(3),
  'future-25': fileFor(14),
  'future-26': fileFor(11),
  'future-27': fileFor(8),
  'future-28': fileFor(36),
  'future-29': fileFor(18),
  'future-30': fileFor(17),
};

/**
 * The active UI concepts are keyed by the existing badge IDs. Only visual
 * matches are mapped; absent entries are rendered without a fabricated badge.
 */
export const badgeAssetById: Partial<Record<SecretBadge['id'], string>> = {
  FIVE_SUCCESSES: badgeAssetByConceptId['crystal-palace'],
  FIRST_SUCCESS: badgeAssetByConceptId['dragon-egg'],
  TRY_AGAIN: badgeAssetByConceptId['rainbow-butterfly'],
  BRAVE_SUCCESS: badgeAssetByConceptId['treasure-chest'],
};

