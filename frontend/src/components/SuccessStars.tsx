interface Props {
  count: number;
  partyCount: number;
  roundId: number;
  celebrating?: boolean;
  slots?: number;
}

export function SuccessStars({ count, partyCount, roundId, celebrating = false, slots = 5 }: Props) {
  // Keep the completed board visible only during the celebration result.
  const partyComplete = celebrating && count > 0 && count % slots === 0;
  const starsInCurrentSet = partyComplete ? slots : count % slots;
  const progressLabel = `별 ${starsInCurrentSet}/${slots} · 성공 ${count} · 문제 ${roundId}`;
  const accessibilityLabel = partyCount > 0 ? `${progressLabel}. 완성한 파티 ${partyCount}번` : progressLabel;

  return (
    <div className={`stars ${celebrating ? 'stars--celebrating' : ''}`} aria-label={accessibilityLabel}>
      <span className="stars__row" aria-hidden="true">
        {Array.from({ length: slots }, (_, index) => <span key={index} className={index < starsInCurrentSet ? 'star filled' : 'star'}>★</span>)}
      </span>
      <span className="success-count">
        <span>별 {starsInCurrentSet}/{slots}</span>
        <span>성공 {count}</span>
        <span>문제 {roundId}</span>
      </span>
    </div>
  );
}
