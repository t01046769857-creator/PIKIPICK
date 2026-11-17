/**
 * Per-content recording contract. A future activity supplies its own contract
 * and serializer rather than changing the shared session transport.
 */
export interface ContentRuntime {
  activitySlug: string;
  activityVersion: string;
  resultEventType: string;
  sessionEndedEventType: string;
}

export const rockPaperScissorsRuntime: ContentRuntime = {
  activitySlug: 'rock-paper-scissors',
  activityVersion: '1.0.0',
  resultEventType: 'round_result',
  sessionEndedEventType: 'session_ended',
};
