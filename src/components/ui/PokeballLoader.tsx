import { SVGProps, memo } from 'react';

export const PokeballLoader = memo(function PokeballLoader(
  props: SVGProps<SVGSVGElement>
) {
  return (
    <svg
      {...props}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="pokeball-loader-title pokeball-loader-desc"
      className={`pokeball-loader ${props.className ?? ''}`}
    >
      <title id="pokeball-loader-title">Chargement</title>
      <desc id="pokeball-loader-desc">
        Animation de chargement représentant une Poké Ball en rotation
      </desc>

      <style>{`
        .pokeball-spin {
          transform-origin: 60px 60px;
          animation: pokeball-rotate 1.2s linear infinite;
          will-change: transform;
        }
        @keyframes pokeball-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <defs>
        <clipPath id="pokeball-top">
          <rect x="0" y="0" width="120" height="55" />
        </clipPath>
        <clipPath id="pokeball-bottom">
          <rect x="0" y="65" width="120" height="55" />
        </clipPath>
        <filter id="pokeball-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
        </filter>
      </defs>

      <g className="pokeball-spin" filter="url(#pokeball-shadow)">
        {/* Top half — red */}
        <g clipPath="url(#pokeball-top)">
          <circle cx="60" cy="60" r="50" fill="#DC2626" />
          <ellipse cx="45" cy="30" rx="22" ry="12" fill="white" opacity="0.12" />
        </g>

        {/* Bottom half — white */}
        <g clipPath="url(#pokeball-bottom)">
          <circle cx="60" cy="60" r="50" fill="#F5F5F5" />
        </g>

        {/* Black horizontal band */}
        <rect x="10" y="55" width="100" height="10" rx="1" fill="#1A1A1A" />

        {/* Outer ring */}
        <circle cx="60" cy="60" r="50" stroke="#1A1A1A" strokeWidth="4" fill="none" />

        {/* Center button — outer ring */}
        <circle cx="60" cy="60" r="16" fill="#F5F5F5" stroke="#1A1A1A" strokeWidth="4" />

        {/* Center button — highlight */}
        <circle cx="60" cy="58" r="6" fill="white" opacity="0.5" />
      </g>
    </svg>
  );
});
