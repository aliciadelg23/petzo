// RSC — cartão de métrica simples.
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function MetricCard({ label, value, hint, className }: Props) {
  return (
    <div className={cn('rounded-lg border border-neutral-200 bg-white p-4', className)}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
