import { severityColor } from '@/lib/utils';

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${severityColor(severity)}`}>
      {severity || '—'}
    </span>
  );
}
