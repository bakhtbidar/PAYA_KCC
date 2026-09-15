import type { NonConformitySeverity } from '../api/types';

const STYLES: Record<NonConformitySeverity, string> = {
  CRITICAL: 'bg-risk-red-soft text-risk-red',
  HIGH: 'bg-risk-orange-soft text-risk-orange',
  MEDIUM: 'bg-risk-yellow-soft text-risk-yellow',
  LOW: 'bg-risk-green-soft text-risk-green',
};

export function SeverityChip({ severity }: { severity: NonConformitySeverity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium uppercase tracking-wide ${STYLES[severity]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}
