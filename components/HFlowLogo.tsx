interface HFlowLogoProps {
  className?: string
  showText?: boolean
}

export default function HFlowLogo({ className = 'h-8 w-8', showText = false }: HFlowLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        viewBox="0 0 120 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="H-Flow Logo"
      >
        <defs>
          <linearGradient id="hflow-orange" x1="10" y1="70" x2="110" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF3D00" />
            <stop offset="50%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFA000" />
          </linearGradient>
        </defs>

        {/* Disco exterior izquierdo */}
        <rect x="8" y="28" width="9" height="24" rx="4.5" fill="url(#hflow-orange)" />
        {/* Disco medio izquierdo */}
        <rect x="23" y="18" width="11" height="44" rx="5.5" fill="url(#hflow-orange)" />

        {/* H central (dos columnas + travesaño) */}
        <rect x="40" y="8" width="15" height="64" rx="6" fill="url(#hflow-orange)" />
        <rect x="65" y="8" width="15" height="64" rx="6" fill="url(#hflow-orange)" />
        <rect x="46" y="33" width="28" height="14" rx="3" fill="url(#hflow-orange)" />

        {/* Disco medio derecho */}
        <rect x="86" y="18" width="11" height="44" rx="5.5" fill="url(#hflow-orange)" />
        {/* Disco exterior derecho */}
        <rect x="103" y="28" width="9" height="24" rx="4.5" fill="url(#hflow-orange)" />
      </svg>

      {showText && (
        <span className="font-mono text-sm font-black tracking-tight text-neutral-950 dark:text-white">
          H-FLOW
        </span>
      )}
    </div>
  )
}