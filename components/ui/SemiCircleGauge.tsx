interface SemiCircleGaugeProps {
  percent: number;
  caption: string;
}

/**
 * Small semi-circle progress gauge. Deliberately a single indicator, not a
 * full stats dashboard, per the "keep it minimal" gamification scope.
 */
export function SemiCircleGauge({ percent, caption }: SemiCircleGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cy = size / 2;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const arcPath = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: cy + stroke / 2 }}>
        <svg width={size} height={cy + stroke / 2} viewBox={`0 0 ${size} ${cy + stroke / 2}`}>
          <path d={arcPath} fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-surface-border" />
          <path
            d={arcPath}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-brand-deep transition-[stroke-dashoffset] duration-500"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="text-2xl font-bold text-brand-deep">{Math.round(clamped)}%</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">{caption}</p>
    </div>
  );
}
