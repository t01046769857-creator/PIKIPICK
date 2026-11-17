export type InstitutionPlayHandoff = { token: string; playerId: string; expiresAt: string };

const handoffKey = 'pikipick.institution-play.v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function saveInstitutionPlay(value: InstitutionPlayHandoff) {
  sessionStorage.setItem(handoffKey, JSON.stringify(value));
}

export function readInstitutionPlay(): InstitutionPlayHandoff | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(handoffKey) ?? 'null') as Partial<InstitutionPlayHandoff> | null;
    if (!value || !uuid.test(value.playerId ?? '') || typeof value.token !== 'string' || value.token.length < 32
      || !Number.isFinite(Date.parse(value.expiresAt ?? '')) || Date.parse(value.expiresAt ?? '') <= Date.now()) {
      sessionStorage.removeItem(handoffKey); return null;
    }
    return value as InstitutionPlayHandoff;
  } catch { return null; }
}

export function clearInstitutionPlay() { sessionStorage.removeItem(handoffKey); }
