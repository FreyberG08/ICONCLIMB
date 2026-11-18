/**
 * Ilustración técnica del hueco de un ascensor (dibujo de ingeniería estilizado).
 * Se usa mientras no exista fotografía industrial oficial para el hero.
 * La cabina se desplaza lentamente; respeta prefers-reduced-motion.
 */
export function HeroVisual() {
  return (
    <svg viewBox="0 0 440 520" className="h-full w-full" role="img" aria-label="Dibujo técnico de un ascensor: guías, cabina, contrapeso y máquina de tracción">
      <defs>
        <pattern id="hv-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1f5fbf" strokeOpacity="0.07" strokeWidth="1" />
        </pattern>
        <linearGradient id="hv-cab" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef4fc" />
        </linearGradient>
      </defs>

      <rect width="440" height="520" fill="url(#hv-grid)" />

      {/* Hueco */}
      <rect x="90" y="40" width="260" height="440" fill="none" stroke="#0a2149" strokeOpacity="0.18" strokeWidth="1.5" />
      <rect x="90" y="40" width="260" height="440" fill="none" stroke="#0a2149" strokeOpacity="0.06" strokeWidth="10" strokeDasharray="2 10" />

      {/* Máquina y polea */}
      <rect x="168" y="52" width="104" height="34" rx="3" fill="#ffffff" stroke="#0a2149" strokeOpacity="0.55" strokeWidth="1.25" />
      <circle cx="220" cy="98" r="16" fill="#ffffff" stroke="#1f5fbf" strokeWidth="1.5" />
      <circle cx="220" cy="98" r="5" fill="#1f5fbf" />
      <text x="282" y="66" className="fill-steel-500 font-mono" fontSize="9" letterSpacing="1.2">MÁQUINA</text>
      <path d="M276 63h-4" stroke="#6b7684" strokeWidth="1" />

      {/* Guías */}
      {[124, 316].map((x) => (
        <g key={x}>
          <line x1={x} y1="100" x2={x} y2="470" stroke="#0a2149" strokeOpacity="0.4" strokeWidth="2" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={x - 7} x2={x + 7} y1={130 + i * 46} y2={130 + i * 46} stroke="#0a2149" strokeOpacity="0.25" strokeWidth="1" />
          ))}
        </g>
      ))}

      <clipPath id="hv-clip">
        <rect x="0" y="106" width="440" height="380" />
      </clipPath>

      <g clipPath="url(#hv-clip)">
        {/* Contrapeso (se mueve en sentido opuesto a la cabina) */}
        <g className="animate-counter">
          <line x1="300" y1="0" x2="300" y2="300" stroke="#1f5fbf" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="292" y="300" width="16" height="70" fill="#dbe7f8" stroke="#1f5fbf" strokeOpacity="0.7" strokeWidth="1" />
        </g>

        {/* Cabina */}
        <g className="animate-cabin">
          <line x1="204" y1="60" x2="204" y2="292" stroke="#1f5fbf" strokeWidth="1.25" />
          <rect x="140" y="292" width="140" height="150" rx="2" fill="url(#hv-cab)" stroke="#0a2149" strokeWidth="1.5" />
          <line x1="210" y1="302" x2="210" y2="432" stroke="#0a2149" strokeOpacity="0.35" strokeWidth="1" />
          <rect x="150" y="302" width="120" height="130" fill="none" stroke="#0a2149" strokeOpacity="0.2" strokeWidth="1" />
          <rect x="256" y="350" width="8" height="22" rx="1.5" fill="#1f5fbf" />
          <circle cx="260" cy="356" r="1.5" fill="#ffffff" />
          <circle cx="260" cy="365" r="1.5" fill="#ffffff" />
          <rect x="134" y="300" width="6" height="16" fill="#0a2149" fillOpacity="0.5" />
          <rect x="280" y="300" width="6" height="16" fill="#0a2149" fillOpacity="0.5" />
          <rect x="134" y="418" width="6" height="16" fill="#0a2149" fillOpacity="0.5" />
          <rect x="280" y="418" width="6" height="16" fill="#0a2149" fillOpacity="0.5" />
        </g>
      </g>

      {/* Foso y amortiguador */}
      <rect x="196" y="462" width="28" height="12" fill="none" stroke="#0a2149" strokeOpacity="0.4" />
      <path d="M200 462v-10M210 462v-10M220 462v-10" stroke="#0a2149" strokeOpacity="0.3" />

      {/* Cotas */}
      <g className="fill-steel-500 font-mono" fontSize="9" letterSpacing="1">
        <line x1="66" y1="40" x2="66" y2="480" stroke="#6b7684" strokeOpacity="0.5" />
        <path d="M62 40h8M62 480h8" stroke="#6b7684" strokeOpacity="0.5" />
        <text x="58" y="264" transform="rotate(-90 58 264)" textAnchor="middle">RECORRIDO</text>
        <line x1="90" y1="498" x2="350" y2="498" stroke="#6b7684" strokeOpacity="0.5" />
        <path d="M90 494v8M350 494v8" stroke="#6b7684" strokeOpacity="0.5" />
        <text x="220" y="512" textAnchor="middle">HUECO</text>
        <text x="362" y="96">POLEA</text>
        <path d="M358 93h-120" stroke="#6b7684" strokeOpacity="0.5" />
        <text x="362" y="140">GUÍA</text>
        <path d="M358 137h-40" stroke="#6b7684" strokeOpacity="0.5" />
      </g>

      {/* Marcadores de pieza */}
      {[
        [220, 98],
        [124, 222],
        [316, 406],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="11" fill="none" stroke="#1f5fbf" strokeOpacity="0.35">
            <animate attributeName="r" values="9;14;9" dur="3.2s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="3.2s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}
