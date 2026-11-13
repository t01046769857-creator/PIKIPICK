import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameApiRecorder, outboxKey } from './apiRecorder';
import { initialState, type GameState } from './reducer';
import type { GameMode } from './types';

const serverId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function playing(mode: GameMode = 'WIN'): GameState {
  return { ...initialState, phase: 'PLAYING', mode, opponent: 'ROCK', roundId: 1 };
}
function result(mode: GameMode = 'WIN'): GameState {
  return { ...playing(mode), phase: 'RESULT', inputSequence: 1, successCount: 1,
    result: { mode, player: mode === 'WIN' ? 'PAPER' : mode === 'LOSE' ? 'SCISSORS' : 'ROCK', opponent: 'ROCK', success: true } };
}
const successTransport = () => vi.fn(async (url: string, init: RequestInit) => {
  const body = JSON.parse(init.body as string);
  return new Response(JSON.stringify(url.endsWith('/events') ? { id: eventId, client_event_id: body.client_event_id } : { id: serverId }), { status: 201 });
});

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => vi.restoreAllMocks());

describe('optional API recording', () => {
  it.each(['WIN', 'LOSE', 'DRAW'] as const)('records %s results once without changing game or local rewards', async mode => {
    const local = storage();
    local.setItem('pikipick.records.v1', '{"successCount":8,"partyCount":1}');
    const transport = successTransport();
    const recorder = new GameApiRecorder('http://localhost:8000', local, transport);
    const state = result(mode);
    const before = structuredClone(state);
    recorder.observe(playing(mode));
    recorder.observe(state);
    recorder.observe(state); // StrictMode 또는 반복 렌더링 상황
    await recorder.flush();
    expect(transport.mock.calls).toHaveLength(2);
    const session = JSON.parse(transport.mock.calls[0][1].body as string);
    const saved = JSON.parse(transport.mock.calls[1][1].body as string);
    expect(session.mode).toBe(mode);
    expect(session.activity_slug).toBe('rock-paper-scissors');
    expect(saved.details).toMatchObject({ mode, player: state.result!.player, opponent: state.result!.opponent });
    expect(saved.round_index).toBe(1);
    expect(saved.success).toBe(true);
    expect(transport.mock.calls[1][1].headers).toMatchObject({ Authorization: `Bearer ${session.session_token}` });
    expect(state).toEqual(before);
    expect(local.getItem('pikipick.records.v1')).toBe('{"successCount":8,"partyCount":1}');
    expect(recorder.status).toBe('synced');
  });

  it('retains offline events and resends the same identifiers after a lost acknowledgment', async () => {
    const local = storage();
    let loseResponse = true;
    const transport = vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (url.endsWith('/events') && loseResponse) { loseResponse = false; throw new TypeError('network unavailable'); }
      return new Response(JSON.stringify(url.endsWith('/events') ? { id: eventId, client_event_id: body.client_event_id } : { id: serverId }));
    });
    const recorder = new GameApiRecorder('http://localhost:8000', local, transport);
    recorder.observe(playing()); recorder.observe(result());
    await recorder.flush();
    expect(recorder.status).toBe('offline');
    const pending = JSON.parse(local.getItem(outboxKey)!);
    expect(pending[0].events).toHaveLength(1);
    const originalId = pending[0].events[0].client_event_id;
    await recorder.flush(true);
    expect(recorder.status).toBe('synced');
    const retries = transport.mock.calls.filter(([url]) => url.endsWith('/events'));
    expect(retries).toHaveLength(2);
    expect(retries.every(([, init]) => JSON.parse(init.body as string).client_event_id === originalId)).toBe(true);
  });

  it('recovers pending results on reload and does not duplicate restored result screens', async () => {
    const local = storage();
    const offline = new GameApiRecorder('http://localhost:8000', local, async () => { throw new TypeError(); });
    offline.observe(playing()); offline.observe(result()); await offline.flush();
    const queuedId = JSON.parse(local.getItem(outboxKey)!)[0].events[0].client_event_id;
    const transport = successTransport();
    const recovered = new GameApiRecorder('http://localhost:8000', local, transport);
    recovered.observe(initialState); await recovered.flush();
    const events = transport.mock.calls.filter(([url]) => url.endsWith('/events')).map(([, init]) => JSON.parse(init.body as string));
    expect(events[0].client_event_id).toBe(queuedId);
    expect(events[0].event_type).toBe('round_result');
    expect(events[1].event_type).toBe('session_ended');
    expect(JSON.parse(local.getItem(outboxKey)!)).toEqual([]);

    const active = new GameApiRecorder('http://localhost:8000', storage(), transport);
    active.observe(playing()); active.observe(result()); await active.flush();
    active.observe({ ...initialState, phase: 'MODE_SELECT', inputSequence: 1 }); await active.flush();
    const count = transport.mock.calls.length;
    active.observe(result()); await active.flush();
    expect(transport.mock.calls).toHaveLength(count);
  });

  it('never marks an invalid server response as synced and tolerates broken storage', async () => {
    const local = storage(); local.setItem(outboxKey, 'broken-json');
    const recorder = new GameApiRecorder('http://localhost:8000', local, async () => new Response('{"id":"invalid"}'));
    recorder.observe(playing()); recorder.observe(result()); await recorder.flush();
    expect(recorder.status).toBe('offline');
    expect(JSON.parse(local.getItem(outboxKey)!)[0].events).toHaveLength(1);
    const deniedStorage = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
    const inMemory = new GameApiRecorder('http://localhost:8000', deniedStorage, successTransport());
    inMemory.observe(playing()); inMemory.observe(result()); await inMemory.flush();
    expect(inMemory.status).toBe('synced');
  });
});
