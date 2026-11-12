import logo from '../assets/brand/pikipick-logo.png';

interface BrandLogoProps {
  variant?: 'intro' | 'compact';
  className?: string;
}

/** ★ 모든 화면이 같은 승인 로고 PNG를 사용하도록 하는 공통 브랜드 컴포넌트. */
export function BrandLogo({ variant = 'compact', className = '' }: BrandLogoProps) {
  return <img className={`brand-logo brand-logo--${variant} ${className}`} src={logo} alt="PIKIPICK — 놀면서 배우고 경험하며 성장하는" draggable="false" />;
}
