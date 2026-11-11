import type { GameState } from './reducer';

const recordsStorageKey = 'pikipick.records.v1';

export interface SavedRecords {
  successCount: number;
  partyCount: number;
}

const isNonNegativeInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

export function readSavedRecords(): SavedRecords | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(recordsStorageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<SavedRecords>;
    return isNonNegativeInteger(value.successCount) && isNonNegativeInteger(value.partyCount)
      ? { successCount: value.successCount, partyCount: value.partyCount }
      : null;
  } catch {
    return null;
  }
}

export function saveRecords(state: Pick<GameState, 'successCount' | 'partyCount'>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(recordsStorageKey, JSON.stringify({
      successCount: state.successCount,
      partyCount: state.partyCount,
    } satisfies SavedRecords));
  } catch {
    // Private browsing or a full storage quota should not stop the game.
  }
}
