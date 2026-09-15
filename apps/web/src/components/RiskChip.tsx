import type { RiskLevel } from '../api/types';

const STYLES: Record<RiskLevel, string> = {
  RED: 'bg-risk-red-soft text-risk-red',
  ORANGE: 'bg-risk-orange-soft text-risk-orange',
  YELLOW: 'bg-risk-yellow-soft text-risk-yellow',
  GREEN: 'bg-risk-green-soft text-risk-green',
};

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium uppercase tracking-wide ${STYLES[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
