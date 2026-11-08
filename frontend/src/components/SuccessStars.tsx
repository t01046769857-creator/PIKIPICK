interface Props { count: number; slots?: number }
export function SuccessStars({ count, slots = 5 }: Props) {
  return <div className="stars" aria-label={`성공 ${count}회, ${slots}칸 표시`}>
    {Array.from({ length: slots }, (_, index) => <span key={index} className={index < count ? 'star filled' : 'star'}>{index < count ? '★' : '☆'}</span>)}
    <span className="success-count">성공 {count}회</span>
  </div>;
}
