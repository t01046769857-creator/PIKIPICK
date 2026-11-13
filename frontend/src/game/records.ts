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
    // ★ 문제 진행 상태는 저장하지 않는다. 새로 열어도 누적 보상만 이어진다.
    window.localStorage.setItem(recordsStorageKey, JSON.stringify({
      successCount: state.successCount,
      partyCount: state.partyCount,
    } satisfies SavedRecords));
  } catch {
    // 시크릿 모드나 저장 공간 부족 때문에 게임이 멈추면 안 된다.
  }
}
