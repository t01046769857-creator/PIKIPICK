import type { GameState } from './reducer';
import type { GameMode } from './types';

export const outboxKey = 'pikipick.api.outbox.v1';
const playerKey = 'pikipick.api.player.v1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxEvents = 500;
const maxSessions = 100;

interface SessionRequest {
  activity_slug: 'rock-paper-scissors'; activity_version: '1.0.0';
  client_session_id: string; player_id: string; session_token: string; mode: GameMode;
}
interface RecordedEvent {
  client_event_id: string; sequence: number; event_type: 'round_result' | 'session_ended';
  occurred_at: string; round_index?: number; success?: boolean; details: Record<string, unknown>;
}
interface PendingSession {
  request: SessionRequest; serverId?: string; nextSequence: number;
  closed: boolean; events: RecordedEvent[];
}
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Transport = (input: string, init: RequestInit) => Promise<Response>;

function browserStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

function restore(storage: Storage | undefined): PendingSession[] {
  try {
    const raw = storage?.getItem(outboxKey);
    if (!raw || raw.length > 2_000_000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > maxSessions) return [];
    return value.filter((item): item is PendingSession => !!item && typeof item === 'object'
      && item.request?.activity_slug === 'rock-paper-scissors' && item.request?.activity_version === '1.0.0'
      && uuidPattern.test(item.request?.client_session_id) && uuidPattern.test(item.request?.player_id)
      && typeof item.request?.session_token === 'string' && /^[a-f0-9]{64}$/.test(item.request.session_token)
      && ['WIN', 'LOSE', 'DRAW'].includes(item.request?.mode)
      && (item.serverId === undefined || uuidPattern.test(item.serverId))
      && typeof item.closed === 'boolean'
      && Number.isInteger(item.nextSequence) && item.nextSequence > 0
      && Array.isArray(item.events) && item.events.length <= maxEvents
      && item.events.every((event: RecordedEvent) => event && uuidPattern.test(event.client_event_id)
        && Number.isInteger(event.sequence) && event.sequence > 0
        && ['round_result', 'session_ended'].includes(event.event_type)
        && typeof event.occurred_at === 'string' && Number.isFinite(Date.parse(event.occurred_at))
        && event.details && typeof event.details === 'object'));
  } catch { return []; }
}

/** 확정된 결과만 기록하며, 게임 액션을 dispatch하거나 로컬 별을 바꾸지 않는다. */
export class GameApiRecorder {
  private queue: PendingSession[];
  private current: PendingSession | undefined;
  private lastInputSequence = 0;
  private inFlight: Promise<void> | undefined;
  private retryAt = 0;
  private warned = false;
  private playerId: string;
  status: 'idle' | 'pending' | 'synced' | 'offline' = 'idle';

  constructor(
    private baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, ''),
    private storage: Storage | undefined = browserStorage(),
    private transport: Transport = (url, init) => fetch(url, init),
  ) {
    this.queue = restore(storage);
    let savedPlayer: string | null = null;
    try { savedPlayer = storage?.getItem(playerKey) ?? null; } catch { /* 메모리 저장 방식으로 대체 */ }
    this.playerId = savedPlayer && uuidPattern.test(savedPlayer) ? savedPlayer : crypto.randomUUID();
    try { storage?.setItem(playerKey, this.playerId); } catch { /* 게임은 계속 진행해야 한다. */ }
    // 이전 페이지 방문은 끝났으므로, 대기 중인 결과는 보존하고 종료 이벤트를 한 번만 추가한다.
    for (const job of this.queue) if (!job.closed) this.end(job);
  }

  private persist() {
    try { this.storage?.setItem(outboxKey, JSON.stringify(this.queue)); }
    catch { /* 기존 로컬 보상 저장소는 별개이며 건드리지 않는다. */ }
  }

  private end(job: PendingSession) {
    job.closed = true;
    if (this.queue.reduce((sum, item) => sum + item.events.length, 0) < maxEvents) {
      job.events.push({ client_event_id: crypto.randomUUID(), sequence: job.nextSequence++,
        event_type: 'session_ended', occurred_at: new Date().toISOString(), details: {} });
    }
  }

  observe(state: Pick<GameState, 'phase' | 'mode' | 'inputSequence' | 'result' | 'roundId' | 'successCount' | 'partyCount'>) {
    const playing = state.phase === 'PLAYING' || state.phase === 'RESULT';
    if (state.phase === 'START') this.lastInputSequence = state.inputSequence;
    if (!playing || !state.mode) {
      if (this.current) this.end(this.current);
      this.current = undefined;
      this.persist();
      void this.flush();
      return;
    }
    // 이전 RESULT 화면을 복원해도 같은 라운드를 두 번 전송하면 안 된다.
    if (state.phase === 'RESULT' && state.inputSequence <= this.lastInputSequence) return;
    if (!this.current || this.current.request.mode !== state.mode) {
      if (this.current) this.end(this.current);
      if (this.queue.length >= maxSessions) { this.warnOffline(); return; }
      this.current = { request: { activity_slug: 'rock-paper-scissors', activity_version: '1.0.0',
        client_session_id: crypto.randomUUID(), player_id: this.playerId,
        session_token: (crypto.randomUUID() + crypto.randomUUID()).replaceAll('-', ''), mode: state.mode },
        nextSequence: 1, closed: false, events: [] };
      this.queue.push(this.current);
    }
    if (state.phase === 'RESULT' && state.result) {
      this.lastInputSequence = state.inputSequence;
      if (this.queue.reduce((sum, job) => sum + job.events.length, 0) >= maxEvents) {
        this.warnOffline(); return;
      }
      this.current.events.push({ client_event_id: crypto.randomUUID(), sequence: this.current.nextSequence++,
        event_type: 'round_result', occurred_at: new Date().toISOString(), round_index: state.roundId,
        success: state.result.success, details: { mode: state.result.mode, player: state.result.player,
          opponent: state.result.opponent, success_count: state.successCount, party_count: state.partyCount } });
    }
    this.persist();
    void this.flush();
  }

  private warnOffline() {
    this.status = 'offline';
    if (!this.warned) {
      console.warn('놀이 기록 서버에 연결하지 못했습니다. 게임과 로컬 별 기록은 계속 유지됩니다.');
      this.warned = true;
    }
  }

  private async post(path: string, body: unknown, token?: string) {
    const response = await this.transport(this.baseUrl + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('Recording request was not accepted');
    return response.json() as Promise<{ id: string; client_event_id?: string }>;
  }

  flush(force = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.queue.length || !force && Date.now() < this.retryAt) return Promise.resolve();
    this.status = 'pending';
    this.inFlight = this.sendPending().catch(() => {
      this.retryAt = Date.now() + 10000;
      this.warnOffline();
    }).finally(() => { this.inFlight = undefined; this.persist(); });
    return this.inFlight;
  }

  private async sendPending() {
    // 세션·이벤트 요청을 순서대로 처리한다. 고정 UUID로 응답 유실 뒤 재시도해도 안전하다.
    for (const job of [...this.queue]) {
      if (!job.serverId) {
        const session = await this.post('/api/sessions', job.request);
        if (!uuidPattern.test(session.id)) throw new Error('Invalid session response');
        job.serverId = session.id;
        this.persist();
      }
      while (job.events.length) {
        const event = job.events[0];
        const stored = await this.post(`/api/sessions/${job.serverId}/events`, event, job.request.session_token);
        if (!uuidPattern.test(stored.id) || stored.client_event_id !== event.client_event_id) throw new Error('Invalid event acknowledgment');
        job.events.shift();
        this.persist();
      }
      if (job.closed) this.queue = this.queue.filter(item => item !== job);
    }
    this.warned = false;
    this.retryAt = 0;
    this.status = this.queue.some(job => !job.serverId || job.events.length) ? 'pending' : 'synced';
  }
}
