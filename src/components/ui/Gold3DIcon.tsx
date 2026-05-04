import { cn } from '@/utils/utils';

interface Gold3DIconProps {
  name: 'wallet' | 'roi' | 'bonus' | 'withdrawal' | 'security' | 'growth' | 'network' | 'analytics';
  className?: string;
  size?: number;
}

export function Gold3DIcon({ name, className, size = 48 }: Gold3DIconProps) {
  const gradientId = `gold-gradient-${name}`;
  const filterId = `gold-filter-${name}`;
  const bevelId = `gold-bevel-${name}`;

  const renderPath = () => {
    switch (name) {
      case 'wallet':
        return (
          <path d="M20 35 C20 32.79 21.79 31 24 31 H76 C78.21 31 80 32.79 80 35 V75 C80 77.21 78.21 79 76 79 H24 C21.79 79 20 77.21 20 75 Z M20 45 H80 M65 55 A5 5 0 1 1 65 65 A5 5 0 1 1 65 55" />
        );
      case 'roi':
        return (
          <path d="M20 70 L40 50 L55 60 L80 30 M80 30 L65 30 M80 30 L80 45" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'bonus':
        return (
          <path d="M50 20 L20 40 L20 60 L50 80 L80 60 L80 40 Z M50 35 V65 M35 50 H65" />
        );
      case 'withdrawal':
        return (
          <path d="M50 20 V65 M30 45 L50 65 L70 45 M20 80 H80" />
        );
      case 'security':
        return (
          <path d="M50 20 C50 20 20 30 20 50 C20 75 50 85 50 85 C50 85 80 75 80 50 C80 30 50 20 50 20 Z M45 40 L55 40 L55 60 L45 60 Z" />
        );
      case 'growth':
        return (
          <path d="M50 20 L20 80 H80 Z M45 45 H55 V65 H45 Z" />
        );
      case 'network':
        return (
          <path d="M50 20 A10 10 0 1 0 50 40 A10 10 0 1 0 50 20 Z M30 50 A10 10 0 1 0 30 70 A10 10 0 1 0 30 50 Z M70 50 A10 10 0 1 0 70 70 A10 10 0 1 0 70 50 Z M50 40 L30 55 M50 40 L70 55" />
        );
      case 'analytics':
        return (
          <path d="M20 80 V40 H35 V80 Z M42 80 V20 H57 V80 Z M65 80 V50 H80 V80 Z" />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("drop-shadow-2xl", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BF953F" />
          <stop offset="25%" stopColor="#FCF6BA" />
          <stop offset="50%" stopColor="#B38728" />
          <stop offset="75%" stopColor="#FBF5B7" />
          <stop offset="100%" stopColor="#AA771C" />
        </linearGradient>

        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="5"
            specularConstant="1.2"
            specularExponent="20"
            lightingColor="#ffffff"
            result="specOut"
          >
            <fePointLight x="-5000" y="-10000" z="20000" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOutIn" />
          <feComposite in="SourceGraphic" in2="specOutIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
        </filter>
        
        <filter id={bevelId}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feOffset dx="-1" dy="-1" result="offset" />
          <feComposite in="SourceGraphic" in2="offset" operator="over" />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        <g fill={`url(#${gradientId})`}>
          {renderPath()}
        </g>
      </g>
    </svg>
  );
}
