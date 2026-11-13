import { useEffect, useRef } from 'react';
import type { GameState } from './reducer';
import { GameApiRecorder } from './apiRecorder';

export function useGameRecording(state: GameState) {
  const recorder = useRef<GameApiRecorder | null>(null);
  const disabled = useRef(false);
  useEffect(() => {
    // 초기화는 effect 안에서 수행해 렌더링 중에 저장소·네트워크 쓰기가 일어나지 않게 한다.
    if (disabled.current) return;
    try {
      recorder.current ??= new GameApiRecorder();
      recorder.current.observe(state);
    } catch {
      disabled.current = true;
      recorder.current = null;
      console.warn('서버 기록을 시작할 수 없습니다. 게임과 로컬 기록은 계속 사용할 수 있습니다.');
    }
  }, [state]);
  useEffect(() => {
    const retry = () => { void recorder.current?.flush(true); };
    const timer = window.setInterval(() => { void recorder.current?.flush(); }, 15000);
    window.addEventListener('online', retry);
    return () => { window.clearInterval(timer); window.removeEventListener('online', retry); };
  }, []);
}
